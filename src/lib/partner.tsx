// Accountability partner. Signing in is only needed here: each person has an email account and a public
// username; two people form one partnership; each phone publishes a small weekly summary that only the
// partner can read (see firestore.rules). Invites go out from the person's own phone (email app or share sheet).
import {
  EmailAuthProvider, createUserWithEmailAndPassword, deleteUser, onAuthStateChanged, reauthenticateWithCredential,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut as fbSignOut, type User,
} from '@firebase/auth';
import {
  collection, deleteDoc, doc, getDoc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { fb, firebaseReady } from './firebase';
import { activeTasks, useStore, type State } from './store';
import { DAY, info, ymd } from './time';

export type Profile = { username: string; name: string };
export type Pair = {
  id: string; members: string[]; from: string; to: string; status: 'pending' | 'active';
  fromName: string; fromUsername: string; toName: string; toUsername: string;
};
export type Progress = {
  name: string; username: string; week: string; sessions: number; missed: number; done: number;
  red: number; amber: number; green: number; over: number;
  tasks: { title: string; st: 'red' | 'amber' | 'green'; days: number }[];
  updatedAt?: { toMillis(): number } | null;
};

export const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);
export const cleanUsername = (s: string) => s.trim().replace(/^@/, '').toLowerCase();
export const validUsername = (s: string) => /^[a-z0-9_]{3,20}$/.test(s);
export const otherSide = (p: Pair, me: string) =>
  p.from === me ? { uid: p.to, name: p.toName, username: p.toUsername } : { uid: p.from, name: p.fromName, username: p.fromUsername };

const AUTH_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/invalid-credential': 'Email or password is not right.',
  'auth/wrong-password': 'Email or password is not right.',
  'auth/user-not-found': 'No account with that email.',
  'auth/invalid-email': 'Check the email address.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/missing-password': 'Enter a password.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/requires-recent-login': 'Sign in again first, then retry.',
};
export const friendlyError = (e: unknown) => {
  const code = (e as { code?: string })?.code ?? '';
  return AUTH_ERRORS[code] ?? (e instanceof Error && !code ? e.message : 'Something went wrong. Try again.');
};

export function mondayOf(now = new Date()) {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d;
}

/** The weekly summary a partner sees. Titles are only included when the person chooses to share them. */
export function weekSummary(state: State, profile: Profile): Omit<Progress, 'updatedAt'> {
  const mon = +mondayOf(), now = Date.now();
  const inWeek = (ms?: number | null) => ms != null && ms >= mon && ms <= now;
  let sessions = 0, missed = 0, done = 0;
  for (const t of state.tasks) {
    const yes = (t.sessions ?? []).filter(inWeek);
    sessions += yes.length;
    missed += (t.checks ?? []).filter(c => inWeek(c) && !yes.includes(c)).length;
    if (t.done && !t.letGo && inWeek(t.doneAt)) done++;
  }
  const act = activeTasks(state).map(t => ({ t, i: info(t) }));
  const count = (st: string) => act.filter(x => x.i.left >= 0 && x.i.st === st).length;
  return {
    name: profile.name, username: profile.username, week: ymd(mondayOf()), sessions, missed, done,
    red: count('red'), amber: count('amber'), green: count('green'), over: act.filter(x => x.i.left < 0).length,
    tasks: state.shareTitles === false ? [] : act.slice(0, 8).map(({ t, i }) => ({
      title: t.title.slice(0, 80), st: i.st as 'red' | 'amber' | 'green', days: Math.ceil(i.left / DAY),
    })),
  };
}

type Ctx = {
  ready: boolean; configured: boolean; user: User | null; profile: Profile | null;
  pairs: Pair[]; active: Pair | null; incoming: Pair[]; outgoing: Pair | null; progress: Progress | null;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  resetPassword(email: string): Promise<void>;
  signOut(): Promise<void>;
  claimUsername(username: string, name: string): Promise<void>;
  request(username: string): Promise<void>;
  accept(p: Pair): Promise<void>;
  remove(p: Pair): Promise<void>;
  deleteAccount(password: string): Promise<void>;
};
const PartnerContext = createContext<Ctx | null>(null);

export function PartnerProvider({ children }: { children: ReactNode }) {
  const { state, update } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseReady);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const s = fb();

  useEffect(() => {
    if (!s) return;
    return onAuthStateChanged(s.auth, u => { setUser(u); setAuthReady(true); });
  }, [s]);

  // Own profile and partnerships, live.
  useEffect(() => {
    if (!s || !user) { setProfile(null); setPairs([]); return; }
    const offProfile = onSnapshot(doc(s.db, 'users', user.uid), d => setProfile(d.exists() ? (d.data() as Profile) : null), () => {});
    const offPairs = onSnapshot(query(collection(s.db, 'partnerships'), where('members', 'array-contains', user.uid)),
      q => setPairs(q.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Pair, 'id'>) }))), () => {});
    return () => { offProfile(); offPairs(); };
  }, [s, user]);

  const me = user?.uid ?? '';
  const active = pairs.find(p => p.status === 'active') ?? null;
  const incoming = pairs.filter(p => p.status === 'pending' && p.to === me);
  const outgoing = pairs.find(p => p.status === 'pending' && p.from === me) ?? null;
  const partner = active ? otherSide(active, me) : null;

  // The partner's weekly summary, live.
  useEffect(() => {
    if (!s || !partner) { setProgress(null); return; }
    return onSnapshot(doc(s.db, 'progress', partner.uid), d => setProgress(d.exists() ? (d.data() as Progress) : null), () => setProgress(null));
  }, [s, partner?.uid]);

  // Keep the partner's name on the phone so the Sunday reminder can use it (notifications read State).
  const partnerName = partner ? partner.name || `@${partner.username}` : '';
  useEffect(() => {
    if (!authReady || (state.partner ?? '') === partnerName) return;
    update(x => ({ ...x, partner: partnerName }));
  }, [authReady, partnerName, state.partner, update]);

  // Publish our own summary a few seconds after anything changes, only while partnered.
  const lastSent = useRef('');
  useEffect(() => {
    if (!s || !user || !profile || !active) return;
    const summary = weekSummary(state, profile), key = JSON.stringify(summary);
    if (key === lastSent.current) return;
    const t = setTimeout(() => {
      setDoc(doc(s.db, 'progress', user.uid), { ...summary, updatedAt: serverTimestamp() })
        .then(() => { lastSent.current = key; }).catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [s, user, profile, active, state]);

  const need = () => { if (!s) throw new Error('Partner features are not set up in this build yet.'); return s; };
  const needUser = () => { const x = need(); if (!x.auth.currentUser) throw new Error('Sign in first.'); return { ...x, u: x.auth.currentUser }; };

  const value: Ctx = {
    ready: authReady, configured: firebaseReady, user, profile, pairs, active, incoming, outgoing, progress,
    async signUp(email, password) {
      const { user: u } = await createUserWithEmailAndPassword(need().auth, email.trim(), password);
      sendEmailVerification(u).catch(() => {});
    },
    async signIn(email, password) { await signInWithEmailAndPassword(need().auth, email.trim(), password); },
    async resetPassword(email) { await sendPasswordResetEmail(need().auth, email.trim()); },
    async signOut() { await fbSignOut(need().auth); },
    async claimUsername(raw, name) {
      const { db, u } = needUser(), username = cleanUsername(raw);
      if (!validUsername(username)) throw new Error('Use 3–20 letters, numbers or _.');
      await runTransaction(db, async tx => {
        const ref = doc(db, 'usernames', username), taken = await tx.get(ref);
        if (taken.exists() && taken.data().uid !== u.uid) throw new Error(`@${username} is taken. Try another.`);
        if (!taken.exists()) tx.set(ref, { uid: u.uid });
        tx.set(doc(db, 'users', u.uid), { username, name: name.trim().slice(0, 30) });
      });
    },
    async request(raw) {
      const { db, u } = needUser(), username = cleanUsername(raw);
      if (!profile) throw new Error('Pick your username first.');
      if (active) throw new Error('You already have a partner.');
      if (username === profile.username) throw new Error('That is you. Add someone else.');
      const handle = await getDoc(doc(db, 'usernames', username));
      if (!handle.exists()) throw new Error(`No one is called @${username} yet. Invite them instead.`);
      const to = handle.data().uid as string, them = await getDoc(doc(db, 'users', to));
      const existing = pairs.find(p => p.id === pairId(u.uid, to));
      if (existing?.status === 'pending' && existing.to === u.uid) return value.accept(existing);
      if (existing) throw new Error(`You already asked @${username}.`);
      if (outgoing) await deleteDoc(doc(db, 'partnerships', outgoing.id));
      await setDoc(doc(db, 'partnerships', pairId(u.uid, to)), {
        members: [u.uid, to], from: u.uid, to, status: 'pending', createdAt: serverTimestamp(),
        fromName: profile.name, fromUsername: profile.username,
        toName: (them.data()?.name as string) ?? '', toUsername: username,
      });
    },
    async accept(p) {
      const { db } = needUser();
      if (active) throw new Error('You already have a partner.');
      await updateDoc(doc(db, 'partnerships', p.id), { status: 'active', acceptedAt: serverTimestamp() });
    },
    async remove(p) { await deleteDoc(doc(needUser().db, 'partnerships', p.id)); },
    async deleteAccount(password) {
      const { db, u } = needUser();
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email ?? '', password));
      for (const p of pairs) await deleteDoc(doc(db, 'partnerships', p.id)).catch(() => {});
      await deleteDoc(doc(db, 'progress', u.uid)).catch(() => {});
      if (profile) await deleteDoc(doc(db, 'usernames', profile.username)).catch(() => {});
      await deleteDoc(doc(db, 'users', u.uid)).catch(() => {});
      await deleteUser(u);
    },
  };

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner() {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error('usePartner must be used inside PartnerProvider');
  return ctx;
}
