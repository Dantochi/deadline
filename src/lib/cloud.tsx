// Backup and sync, the connected part: keeps the encrypted copy in Firestore up to date and brings in changes from
// the person's other phones. Off until switched on in Settings → Backup & sync. The rules for what changed and how
// changes merge are in lib/sync; the encryption is in lib/e2ee. Nothing readable ever leaves the phone.
//
// Firestore layout, under accounts/{uid} (only that signed-in person can read or write it, see firestore.rules):
//   accounts/{uid}                 { v, check, recovery, created }  the data key, encrypted with the recovery phrase
//   accounts/{uid}/records/{id}    { t, del? , n?, c? }             one encrypted task, or the synced settings
//   accounts/{uid}/pairing/{id}    { pub, created, reply? }         a new phone asking an old one for the key
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomValues } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { deleteDoc, doc, getDoc, getDocs, onSnapshot, runTransaction, setDoc, writeBatch } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  fromB64, keyCheck, newDataKey, newDeviceKeys, newRecovery, openJSON, pairingCode, receiveKey, recoveryKey, sealJSON,
  sendKeyToDevice, toB64, unwrapKey, wrapKey, type Sealed,
} from './e2ee';
import { fb } from './firebase';
import { SECURE, aad, keyName, pairings, records, vaultRef, deleteCloudCopy } from './vault';
import { usePartner } from './partner';
import { applyRemote, diff, emptyMeta, firstMerge, recordsOf, sent, type Meta, type RecordData, type Remote } from './sync';
import { useStore } from './store';
import { pad } from './time';

const random = (n: number) => getRandomValues(new Uint8Array(n));
const LOCAL = 'deadline.sync.v1';
const DEBOUNCE = 1500, SEND_TIMEOUT = 15_000, PAIR_TTL = 10 * 60_000;

type Vault = { v: 1; check: string; recovery: Sealed; created: number };
type RecordDoc = { t: number; del?: boolean; n?: string; c?: string };
type PairDoc = { pub: string; code: string; created: number; reply?: { from: string; key: Sealed } };
type Saved = { uid: string; on: boolean; meta: Meta; last?: number };
export type Status = 'off' | 'syncing' | 'synced' | 'offline' | 'error';
export type PairRequest = { id: string; code: string; created: number };
export const CANCELLED = 'cancelled';

/** One line on how sync is doing, for this screen and the Settings row. */
export function statusLine(st: Status, last: number | null, error: string) {
  if (st === 'off') return 'Off. Your data is only on this phone.';
  if (st === 'syncing') return 'Syncing…';
  if (st === 'offline') return 'Offline. Changes will sync when you’re back online.';
  if (st === 'error') return `Couldn’t sync. ${error || 'Try again.'}`;
  if (!last) return 'On';
  const d = new Date(last);
  return `Synced at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}



type Ctx = {
  ready: boolean; on: boolean; status: Status; last: number | null; error: string;
  signedIn: boolean;
  /** Whether this account already has a backup (so this phone joins it rather than starting one). */
  hasBackup(): Promise<boolean>;
  /** First phone: makes the key, stores it encrypted with a new recovery phrase, uploads everything. */
  start(): Promise<string>;
  /** Joins with the recovery phrase. */
  joinWithPhrase(phrase: string): Promise<void>;
  /** Asks a phone that already syncs to send the key; resolves when it does. Returns the code to compare. */
  askOtherPhone(): Promise<{ code: string; done: Promise<void>; cancel(): void }>;
  /** A new recovery phrase (the old one stops working). */
  newPhrase(): Promise<string>;
  syncNow(): void;
  /** Stops syncing on this phone; the cloud copy stays. */
  turnOff(): Promise<void>;
  /** Deletes the cloud copy and stops syncing. */
  deleteCloud(): Promise<void>;
  /** A new phone asking this one for the key. */
  request: PairRequest | null;
  approve(r: PairRequest): Promise<void>;
  deny(r: PairRequest): Promise<void>;
};
const SyncContext = createContext<Ctx | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady, update } = useStore();
  const { user } = usePartner();
  const s = fb();
  const uid = user?.uid ?? '';
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loaded, setLoaded] = useState(false);
  // The key belongs to one account: kept with its uid, so signing in as someone else never uses the wrong one.
  const [held, setHeld] = useState<{ uid: string; key: Uint8Array } | null>(null);
  const key = held && held.uid === uid ? held.key : null;
  const setKey = (k: Uint8Array | null) => setHeld(k ? { uid, key: k } : null);
  const [status, setStatus] = useState<Status>('off');
  const [error, setError] = useState('');
  const [request, setRequest] = useState<PairRequest | null>(null);
  const meta = useRef<Meta>(emptyMeta());
  const latest = useRef(state);
  useEffect(() => { latest.current = state; }, [state]);

  const on = !!saved?.on && saved.uid === uid && !!key && !!s;
  const persist = useCallback((patch: Partial<Saved>) => {
    setSaved(prev => {
      const next: Saved = { uid, on: false, ...prev, ...patch, meta: meta.current };
      AsyncStorage.setItem(LOCAL, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [uid]);

  // Load this phone's sync state, and the key for the signed-in account.
  useEffect(() => {
    AsyncStorage.getItem(LOCAL).then(raw => {
      const v = raw ? (JSON.parse(raw) as Saved) : null;
      if (v) { meta.current = v.meta ?? emptyMeta(); setSaved(v); }
    }).catch(() => {}).finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!uid) return;
    let live = true;
    SecureStore.getItemAsync(keyName(uid), SECURE)
      .then(k => { if (live) setHeld(k ? { uid, key: fromB64(k) } : null); })
      .catch(() => { if (live) setHeld(null); });
    return () => { live = false; };
  }, [uid]);

  // ---- sending ----
  const sending = useRef(false), again = useRef(false);
  const flush = useCallback(async () => {
    if (!on || !s || !key) return;
    if (sending.current) { again.current = true; return; }
    sending.current = true;
    try {
      meta.current = diff(latest.current, meta.current, Date.now());
      const queued = Object.entries(meta.current.out);
      if (!queued.length) { setStatus('synced'); return; }
      setStatus('syncing');
      const here = recordsOf(latest.current);
      for (let i = 0; i < queued.length; i += 400) {
        const b = writeBatch(s.db), part = queued.slice(i, i + 400);
        for (const [id, o] of part) {
          const r = here.get(id);
          const body: RecordDoc = o.del || !r ? { t: o.t, del: true } : (() => { const x = sealJSON(key, r, random, aad(uid, id)); return { t: o.t, n: x.n, c: x.c }; })();
          b.set(doc(records(s.db, uid), id), body);
        }
        // Without Firestore's offline cache, a write made offline just waits; past the timeout we say so and keep
        // the queue (it's saved, so it survives a restart) and try again when the app is next active.
        const done = await Promise.race([b.commit().then(() => true), new Promise<false>(r => setTimeout(() => r(false), SEND_TIMEOUT))]);
        if (!done) { setStatus('offline'); persist({}); return; }
        meta.current = sent(meta.current, part.map(([id, o]) => ({ id, t: o.t })));
      }
      setStatus('synced'); setError('');
      persist({ last: Date.now() });
    } catch (e) {
      setStatus('error'); setError((e as Error).message || 'Sync failed.'); persist({});
    } finally {
      sending.current = false;
      if (again.current) { again.current = false; flush(); }
    }
  }, [on, s, key, uid, persist]);

  // Send shortly after changes settle, and whenever the app comes back.
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(flush, DEBOUNCE);
    return () => clearTimeout(t);
  }, [state, on, flush]);
  useEffect(() => {
    if (!on) return;
    const sub = AppState.addEventListener('change', a => { if (a === 'active') flush(); });
    return () => sub.remove();
  }, [on, flush]);

  // ---- receiving ----
  const decode = useCallback((id: string, d: RecordDoc, k: Uint8Array): Remote | null => {
    if (d.del) return { id, t: d.t, del: true };
    if (!d.n || !d.c) return null;
    try { return { id, t: d.t, data: openJSON<RecordData>(k, { n: d.n, c: d.c }, aad(uid, id)) }; } catch { return null; }
  }, [uid]);
  useEffect(() => {
    if (!on || !s || !key) return;
    return onSnapshot(records(s.db, uid), snap => {
      const docs = snap.docChanges().filter(c => c.type !== 'removed' && !c.doc.metadata.hasPendingWrites)
        .map(c => decode(c.doc.id, c.doc.data() as RecordDoc, key)).filter((x): x is Remote => !!x);
      if (!docs.length) return;
      update(cur => { const r = applyRemote(cur, meta.current, docs); meta.current = r.meta; return r.state; });
      persist({});
      setStatus(st => (st === 'error' ? st : 'synced'));
    }, e => { setStatus('error'); setError(e.message); });
  }, [on, s, key, uid, decode, update, persist]);

  // A new phone asking for the key (shown on this one to approve).
  useEffect(() => {
    if (!on || !s) return;
    return onSnapshot(pairings(s.db, uid), snap => {
      const open = snap.docs.map(d => ({ id: d.id, ...(d.data() as PairDoc) }))
        .filter(p => !p.reply && Date.now() - p.created < PAIR_TTL).sort((a, b) => b.created - a.created)[0];
      // The code shown is worked out here from the public key itself, never taken from the request's own fields.
      setRequest(open ? { id: open.id, code: pairingCode(fromB64(open.pub)), created: open.created } : null);
    }, () => {});
  }, [on, s, uid]);

  // ---- joining ----
  const needAccount = () => { if (!s || !uid) throw new Error('Sign in first.'); return s.db; };
  const keep = async (k: Uint8Array) => { await SecureStore.setItemAsync(keyName(uid), toB64(k), SECURE); setKey(k); };
  /** Downloads everything, merges it with what this phone has (nothing is lost), and starts syncing. */
  const link = async (k: Uint8Array) => {
    const db = needAccount();
    const snap = await getDocs(records(db, uid));
    const docs = snap.docs.map(d => decode(d.id, d.data() as RecordDoc, k));
    if (docs.some(x => x === null)) throw new Error('Some backed-up data could not be unlocked with this key.');
    const r = firstMerge(latest.current, docs as Remote[]);
    meta.current = r.meta;
    update(() => r.state);
    latest.current = r.state;
    await keep(k);
    persist({ uid, on: true });
    setStatus('syncing');
  };
  const vault = async () => { const v = await getDoc(vaultRef(needAccount(), uid)); return v.exists() ? (v.data() as Vault) : null; };
  const checked = (k: Uint8Array, v: Vault | null) => { if (!v || keyCheck(k) !== v.check) throw new Error('That key doesn’t match this account’s backup.'); return k; };

  const value: Ctx = {
    ready: loaded && storeReady, on, status: on ? status : 'off', last: saved?.last ?? null, error, request: on ? request : null,
    signedIn: !!uid,
    async hasBackup() { return !!(await vault()); },
    async start() {
      const db = needAccount(), k = newDataKey(random), rec = newRecovery(random);
      const v: Vault = { v: 1, check: keyCheck(k), recovery: wrapKey(k, rec.key, random), created: Date.now() };
      await runTransaction(db, async tx => {
        if ((await tx.get(vaultRef(db, uid))).exists()) throw new Error('This account already has a backup. Join it instead.');
        tx.set(vaultRef(db, uid), v);
      });
      await link(k);
      return rec.phrase;
    },
    async joinWithPhrase(phrase) {
      const v = await vault();
      if (!v) throw new Error('There’s no backup on this account yet.');
      const rk = recoveryKey(phrase);
      if (!rk) throw new Error('That isn’t a valid recovery phrase. Check each word.');
      let k: Uint8Array;
      try { k = unwrapKey(v.recovery, rk); } catch { throw new Error('That recovery phrase doesn’t match this backup.'); }
      await link(checked(k, v));
    },
    async askOtherPhone() {
      const db = needAccount(), v = await vault();
      if (!v) throw new Error('There’s no backup on this account yet.');
      const mine = newDeviceKeys(random), code = pairingCode(mine.publicKey), ref = doc(pairings(db, uid));
      await setDoc(ref, { pub: toB64(mine.publicKey), code, created: Date.now() } satisfies PairDoc);
      let stop = () => {}, fail: (e: Error) => void = () => {};
      const done = new Promise<void>((resolve, reject) => {
        fail = reject;
        const timer = setTimeout(() => { stop(); deleteDoc(ref).catch(() => {}); reject(new Error('No answer from your other phone. Try again.')); }, PAIR_TTL);
        const off = onSnapshot(ref, async d => {
          const p = d.data() as PairDoc | undefined;
          if (!d.exists()) { stop(); reject(new Error('Your other phone said no.')); return; }
          if (!p?.reply) return;
          stop();
          try { await link(checked(receiveKey(mine.secret, p.reply), v)); resolve(); } catch (e) { reject(e); }
          deleteDoc(ref).catch(() => {});
        }, e => { stop(); reject(e); });
        stop = () => { clearTimeout(timer); off(); };
      });
      return { code, done, cancel: () => { stop(); deleteDoc(ref).catch(() => {}); fail(new Error(CANCELLED)); } };
    },
    async newPhrase() {
      const db = needAccount();
      if (!key) throw new Error('Backup isn’t on on this phone.');
      const rec = newRecovery(random);
      await setDoc(vaultRef(db, uid), { recovery: wrapKey(key, rec.key, random) }, { merge: true });
      return rec.phrase;
    },
    syncNow() { flush(); },
    async turnOff() {
      if (uid) await SecureStore.deleteItemAsync(keyName(uid), SECURE).catch(() => {});
      setKey(null); meta.current = emptyMeta();
      persist({ on: false, last: undefined });
    },
    async deleteCloud() {
      await deleteCloudCopy(needAccount(), uid);
      await value.turnOff();
    },
    async approve(r) {
      const db = needAccount();
      if (!key) throw new Error('Backup isn’t on on this phone.');
      const d = await getDoc(doc(pairings(db, uid), r.id));
      const p = d.data() as PairDoc | undefined;
      if (!p || p.reply) return;
      // The key must be the one whose code the person just compared (not swapped since it was shown).
      if (pairingCode(fromB64(p.pub)) !== r.code) throw new Error('This request was changed on the way. Not approved.');
      await setDoc(d.ref, { reply: sendKeyToDevice(key, fromB64(p.pub), random) }, { merge: true });
    },
    async deny(r) { await deleteDoc(doc(pairings(needAccount(), uid), r.id)).catch(() => {}); },
  };
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside SyncProvider');
  return ctx;
}
