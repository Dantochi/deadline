// Accountability partner: sign in (only needed here), pick a username, add or invite one partner,
// and see each other's week. Invites are sent from the phone's own email app or share sheet.
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Share, Switch, TextInput, View, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { Btn, StatusDot, Txt, haptic, useToast } from '../components/ui';
import { INSTALL_LINK } from '../lib/firebase';
import { cleanUsername, friendlyError, mondayOf, otherSide, usePartner, type Progress } from '../lib/partner';
import { useStore } from '../lib/store';
import { fmt, ymd } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

type Run = (fn: () => Promise<unknown>, ok?: string) => Promise<void>;

function Field(props: TextInputProps & { label: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: S.s1 }}>
      <Txt variant="small" dim>{props.label}</Txt>
      <TextInput placeholderTextColor={p.dim} maxFontSizeMultiplier={2} autoCorrect={false} {...props}
        style={{ minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: S.s3, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 }} />
    </View>
  );
}

function Block({ title, children }: { title?: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: S.s3, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
      {title ? <Txt variant="label" dim>{title}</Txt> : null}
      {children}
    </View>
  );
}

function SignIn({ run }: { run: Run }) {
  const P = usePartner();
  const [isNew, setIsNew] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Block title={isNew ? 'Create your account' : 'Sign in'}>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder={isNew ? 'At least 6 characters' : ''} secureTextEntry autoCapitalize="none"
        autoComplete={isNew ? 'new-password' : 'current-password'} textContentType={isNew ? 'newPassword' : 'password'} />
      <Btn kind="primary" label={isNew ? 'Create account' : 'Sign in'}
        onPress={() => run(() => (isNew ? P.signUp(email, password) : P.signIn(email, password)))} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1 }}>
        <Btn kind="ghost" label={isNew ? 'I already have an account' : 'I am new here'} onPress={() => setIsNew(!isNew)} />
        {!isNew ? <Btn kind="ghost" label="Forgot password" onPress={() => run(() => P.resetPassword(email), 'Check your email for a reset link')} /> : null}
      </View>
      <Txt variant="small" dim>Your email is only for signing in. Your partner sees your name and username, never your email.</Txt>
    </Block>
  );
}

function PickUsername({ run }: { run: Run }) {
  const P = usePartner();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  return (
    <Block title="How your partner finds you">
      <Field label="Your name" value={name} onChangeText={setName} placeholder="Chidi" maxLength={30} autoComplete="name" />
      <Field label="Username" value={username} onChangeText={v => setUsername(cleanUsername(v))} placeholder="chidi" maxLength={20} autoCapitalize="none" />
      <Txt variant="small" dim>3–20 letters, numbers or _. People add you as @{username || 'username'}.</Txt>
      <Btn kind="primary" label="Save" onPress={() => run(() => (name.trim() ? P.claimUsername(username, name) : Promise.reject(new Error('Add your name.'))))} />
    </Block>
  );
}

function Week({ pr, name }: { pr: Progress | null; name: string }) {
  const { state } = useStore();
  const p = usePalette();
  if (!pr) return <Txt dim>No update from {name} yet. It appears after they next open Deadline.</Txt>;
  const thisWeek = pr.week === ymd(mondayOf());
  const when = pr.updatedAt ? Math.round((Date.now() - pr.updatedAt.toMillis()) / 36e5) : null;
  const stat = (n: number, label: string) => (
    <View style={{ flex: 1 }}><Txt style={{ fontFamily: F.dot, fontSize: 34, lineHeight: 40 }}>{fmt(thisWeek ? n : 0)}</Txt><Txt variant="small" dim>{label}</Txt></View>
  );
  const counts = [[pr.over, 'past deadline'], [pr.red, 'act now'], [pr.amber, 'pay attention'], [pr.green, 'on track']]
    .filter(([n]) => +n > 0).map(([n, l]) => `${n} ${l}`).join(' · ');
  return (
    <View style={{ gap: S.s3 }}>
      <Txt variant="small" dim>{thisWeek ? 'This week' : 'Nothing logged this week yet'}{when != null ? ` · updated ${when < 1 ? 'just now' : when < 24 ? `${when} h ago` : `${Math.round(when / 24)} d ago`}` : ''}</Txt>
      <View style={{ flexDirection: 'row', gap: S.s3 }}>{stat(pr.sessions, 'sessions kept')}{stat(pr.missed, 'missed')}{stat(pr.done, 'finished')}</View>
      {counts ? <Txt variant="meta">{counts}</Txt> : null}
      {pr.tasks.map((t, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, minHeight: 28 }}>
          <StatusDot st={t.st} shapes={state.shapes} size={9} />
          <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt>
          <Txt variant="small" dim>{t.days < 0 ? `${-t.days} d over` : `${t.days} d`}</Txt>
        </View>
      ))}
      <Txt variant="small" dim>A kind word works better than pressure. If they missed sessions, ask what got in the way.</Txt>
    </View>
  );
}

function Connected({ run }: { run: Run }) {
  const P = usePartner();
  const { state, update } = useStore();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [armStop, setArmStop] = useState(false);
  const me = P.user!.uid, profile = P.profile!;

  const invite = `Will you be my accountability partner on Deadline? Each Sunday we see how the other's week went.\n\n`
    + `1. Install the test app: ${INSTALL_LINK || '(ask me for the link)'}\n`
    + `2. Open Settings → Accountability partner and sign up with your email\n`
    + `3. Add me: @${profile.username}`;
  const byEmail = async () => {
    const url = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent('Be my accountability partner?')}&body=${encodeURIComponent(invite)}`;
    try { await Linking.openURL(url); } catch { toast('No email app found. Use Share invite.'); }
  };

  if (P.active) {
    const o = otherSide(P.active, me), name = o.name || `@${o.username}`;
    return (
      <>
        <Block title="Your partner">
          <View><Txt variant="h2">{name}</Txt><Txt variant="meta" dim>@{o.username}</Txt></View>
          <Week pr={P.progress} name={name} />
        </Block>
        <Block title="What you share">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: F.uiSemi }}>Task titles</Txt>
              <Txt variant="small" dim>Off: {name} only sees counts. Notes are never shared.</Txt>
            </View>
            <Switch value={state.shareTitles !== false} onValueChange={v => update(s => ({ ...s, shareTitles: v }))} />
          </View>
          <Btn label={armStop ? 'Tap again to stop' : 'Stop being partners'} onPress={() => {
            if (!armStop) { setArmStop(true); haptic.warn(); return; }
            run(() => P.remove(P.active!), 'Partnership ended');
          }} />
        </Block>
      </>
    );
  }

  return (
    <>
      {P.incoming.map(r => (
        <Block key={r.id} title="Request">
          <Txt><Txt style={{ fontFamily: F.uiSemi }}>{r.fromName || `@${r.fromUsername}`}</Txt> (@{r.fromUsername}) wants you as their accountability partner.</Txt>
          <View style={{ flexDirection: 'row', gap: S.s2 }}>
            <Btn kind="primary" style={{ flex: 1 }} label="Accept" onPress={() => run(() => P.accept(r), 'You are partners now')} />
            <Btn style={{ flex: 1 }} label="Decline" onPress={() => run(() => P.remove(r))} />
          </View>
        </Block>
      ))}
      {P.outgoing ? (
        <Block title="Waiting">
          <Txt>Waiting for <Txt style={{ fontFamily: F.uiSemi }}>@{P.outgoing.toUsername}</Txt> to accept. They see it under Settings → Accountability partner.</Txt>
          <Btn label="Cancel request" onPress={() => run(() => P.remove(P.outgoing!))} />
        </Block>
      ) : null}
      <Block title="Already on Deadline?">
        <Field label="Their username" value={username} onChangeText={v => setUsername(cleanUsername(v))} placeholder="@username" autoCapitalize="none" maxLength={21} />
        <Btn kind="primary" label="Send request" onPress={() => run(async () => { await P.request(username); setUsername(''); }, 'Request sent')} />
      </Block>
      <Block title="Not on Deadline yet?">
        <Field label="Their email" value={email} onChangeText={setEmail} placeholder="friend@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Btn kind="primary" label="Invite by email" onPress={byEmail} />
        <Btn label="Share invite another way" onPress={() => Share.share({ message: invite }).catch(() => {})} />
        <Txt variant="small" dim>The invite opens in your own email app, so it comes from you. When they join, they add @{profile.username}.</Txt>
      </Block>
    </>
  );
}

function Account({ run }: { run: Run }) {
  const P = usePartner();
  const [armDelete, setArmDelete] = useState(false);
  const [password, setPassword] = useState('');
  return (
    <View style={{ gap: S.s3 }}>
      <Txt variant="small" dim>
        Signed in as {P.user!.email}{P.profile ? ` · @${P.profile.username}` : ''}{P.user!.emailVerified ? '' : ' · check your inbox to verify your email'}
      </Txt>
      <View style={{ flexDirection: 'row', gap: S.s2 }}>
        <Btn style={{ flex: 1 }} label="Sign out" onPress={() => run(() => P.signOut())} />
        <Btn style={{ flex: 1 }} label="Delete account" onPress={() => setArmDelete(!armDelete)} />
      </View>
      {armDelete ? (
        <Block title="Delete account">
          <Txt variant="small" dim>Removes your account, username, partnership and shared summary. Your tasks on this phone stay.</Txt>
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          <Btn label="Delete for good" onPress={() => run(() => P.deleteAccount(password), 'Account deleted')} />
        </Block>
      ) : null}
    </View>
  );
}

export default function PartnerScreen() {
  const P = usePartner();
  const toast = useToast();
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const run: Run = async (fn, ok) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); if (ok) { haptic.ok(); toast(ok); } } catch (e) { haptic.warn(); toast(friendlyError(e)); } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Accountability partner</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s3, paddingBottom: S.s8, gap: S.s4 }} keyboardShouldPersistTaps="handled">
        <Txt dim>Pick one person. Every Sunday you both see how the week went: sessions kept, missed, finished and what is coming up.</Txt>
        {!P.configured ? <Txt>Partners are not switched on in this test build yet.</Txt>
          : !P.ready ? <Txt dim>Loading…</Txt>
            : !P.user ? <SignIn run={run} />
              : (
                <>
                  {P.profile ? <Connected run={run} /> : <PickUsername run={run} />}
                  <Account run={run} />
                </>
              )}
      </ScrollView>
    </SafeAreaView>
  );
}
