// Backup & sync: turn on an end-to-end encrypted copy of everything in the person's account, join it from another
// phone (approve from a phone that already syncs, or type the recovery phrase), and manage it. Opened from
// Settings, or from the first onboarding screen with ?restore=1 ("Restore from my account").
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Block, SignIn, type Run } from '../components/Account';
import { CheckIcon, CloseIcon } from '../components/icons';
import { Btn, Toggle, Txt, haptic, useToast } from '../components/ui';
import { CANCELLED, statusLine, useSync } from '../lib/cloud';
import { friendlyError, usePartner } from '../lib/partner';
import { useStore } from '../lib/store';
import { F, R, S, T, usePalette } from '../theme';

/** The 24 words, numbered, to write down or save; Done only once the person says they've kept it. */
function Phrase({ phrase, onDone }: { phrase: string; onDone: () => void }) {
  const p = usePalette();
  const toast = useToast();
  const [kept, setKept] = useState(false);
  const words = phrase.split(' ');
  return (
    <Block title="Your recovery phrase">
      <Txt>These 24 words unlock your backup on a new phone if this one is lost. Save them in a password manager or write them down.</Txt>
      <Txt variant="small" color={p.redInk} style={{ fontFamily: F.uiSemi }}>Nobody else has them, not even us. Without them and without this phone, your backup can’t be opened.</Txt>
      <View accessible accessibilityLabel={`Recovery phrase: ${phrase}`} style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: S.s2, paddingVertical: S.s2 }}>
        {words.map((w, i) => (
          <View key={i} style={{ width: '50%', flexDirection: 'row', gap: S.s2 }}>
            <Txt variant="small" dim style={{ width: 24, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{i + 1}</Txt>
            <Txt style={{ fontFamily: F.uiSemi }} selectable>{w}</Txt>
          </View>
        ))}
      </View>
      <Btn label="Copy the 24 words" onPress={async () => { await Clipboard.setStringAsync(phrase); toast('Copied. Paste it into your password manager, then clear your clipboard.'); }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, minHeight: 56 }}>
        <Txt style={{ flex: 1 }}>I’ve saved my recovery phrase somewhere safe</Txt>
        <Toggle value={kept} onValueChange={setKept} accessibilityLabel="I've saved my recovery phrase" />
      </View>
      <Btn kind="primary" label="Done" disabled={!kept} onPress={onDone} />
    </Block>
  );
}

/** Joining a backup this account already has: approve from another phone, or type the phrase. */
function Join({ run, restoring }: { run: Run; restoring: boolean }) {
  const p = usePalette();
  const sync = useSync();
  const [mode, setMode] = useState<'choose' | 'phone' | 'phrase'>('choose');
  const [code, setCode] = useState('');
  const [cancel, setCancel] = useState<(() => void) | null>(null);
  const [phrase, setPhrase] = useState('');
  useEffect(() => () => { cancel?.(); }, [cancel]);

  if (mode === 'phone') {
    return (
      <Block title="Approve from your other phone">
        {code ? (
          <>
            <Txt>Open Deadline on a phone where backup is on. It will ask to let this phone in. Approve only if it shows this code:</Txt>
            <Txt accessibilityLabel={`Code ${code.split('').join(' ')}`} style={{ fontFamily: F.dot, fontSize: T.x5, lineHeight: 44, textAlign: 'center', marginVertical: S.s3 }}>{code}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.s2 }}><ActivityIndicator color={p.dim} /><Txt variant="small" dim>Waiting for your other phone…</Txt></View>
          </>
        ) : <ActivityIndicator color={p.dim} />}
        <Btn kind="ghost" label="Cancel" onPress={() => { cancel?.(); setCancel(null); setCode(''); setMode('choose'); }} />
      </Block>
    );
  }
  if (mode === 'phrase') {
    return (
      <Block title="Use your recovery phrase">
        <Txt variant="small" dim>Type or paste the 24 words, in order, with spaces between them.</Txt>
        <TextInput value={phrase} onChangeText={setPhrase} multiline autoCapitalize="none" autoCorrect={false} autoComplete="off" spellCheck={false}
          placeholder="word word word …" placeholderTextColor={p.dim} accessibilityLabel="Recovery phrase" textAlignVertical="top" maxFontSizeMultiplier={2}
          style={{ minHeight: 120, borderRadius: R.sm, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, padding: S.s3, color: p.ink, fontFamily: F.uiMedium, fontSize: T.base, lineHeight: 24 }} />
        <Btn kind="primary" label={restoring ? 'Restore my data' : 'Turn on backup & sync'} onPress={() => run(() => sync.joinWithPhrase(phrase), restoring ? 'Restored' : 'Backup & sync is on')} />
        <Btn kind="ghost" label="Back" onPress={() => setMode('choose')} />
      </Block>
    );
  }
  return (
    <Block title="This account already has a backup">
      <Txt>To unlock it on this phone, approve it from a phone that already syncs, or use your recovery phrase.</Txt>
      <Btn kind="primary" label="Approve from my other phone" onPress={() => run(async () => {
        setMode('phone');
        try {
          const r = await sync.askOtherPhone();
          setCode(r.code); setCancel(() => r.cancel);
          await r.done;
        } catch (e) {
          setMode('choose'); setCode('');
          if ((e as Error).message !== CANCELLED) throw e;
        }
      }, restoring ? 'Restored' : 'Backup & sync is on')} />
      <Btn label="Use my recovery phrase" onPress={() => setMode('phrase')} />
    </Block>
  );
}

export default function Backup() {
  const P = usePartner();
  const sync = useSync();
  const { update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const { restore } = useLocalSearchParams<{ restore?: string }>();
  const restoring = restore === '1';
  const [busy, setBusy] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [exists, setExists] = useState<boolean | null>(null);
  const [armDelete, setArmDelete] = useState(false);
  const run: Run = async (fn, ok) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); if (ok) { haptic.ok(); toast(ok); } } catch (e) { haptic.warn(); toast(friendlyError(e)); } finally { setBusy(false); }
  };

  // Does this account have a backup already? (Decides between starting one and joining it.)
  useEffect(() => {
    if (!sync.signedIn || sync.on) return;
    let live = true;
    sync.hasBackup().then(v => { if (live) setExists(v); }).catch(() => { if (live) setExists(false); });
    return () => { live = false; };
  }, [sync.signedIn, sync.on]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restoring during setup: once the data is in, setup is done.
  useEffect(() => {
    if (restoring && sync.on && !phrase) { update(s => ({ ...s, onboarded: true })); if (router.canDismiss()) router.dismissAll(); router.replace('/'); }
  }, [restoring, sync.on, phrase, update]);

  const body = () => {
    if (!P.configured) return <Txt>Backup isn’t switched on in this build yet.</Txt>;
    if (!P.ready || !sync.ready) return <ActivityIndicator color={p.dim} />;
    if (!P.user) {
      return <SignIn run={run} note={restoring ? 'Sign in with the account you used for backup.' : 'Your email is only for signing in. Your backup is encrypted on this phone before it is sent: nobody else can read it, not even us.'} />;
    }
    if (phrase) return <Phrase phrase={phrase} onDone={() => { setPhrase(''); if (restoring) router.replace('/'); }} />;
    if (!sync.on) {
      if (exists === null) return <ActivityIndicator color={p.dim} />;
      if (exists) return <Join run={run} restoring={restoring} />;
      if (restoring) return <Block title="No backup yet"><Txt>There’s no backup on {P.user.email ?? 'this account'}. Go back and set up the app as new, then turn on backup in Settings.</Txt></Block>;
      return (
        <Block title="Turn on backup & sync">
          {[
            'Your tasks, notes, important dates and settings are copied to your account and kept in step on every phone you sign in on.',
            'Everything is encrypted on this phone first. Nobody else can read it, not even us.',
            'You’ll get a recovery phrase: 24 words that unlock your backup if you lose this phone.',
          ].map(t => (
            <View key={t} style={{ flexDirection: 'row', gap: S.s3 }}><CheckIcon size={18} color={p.ink} /><Txt style={{ flex: 1 }}>{t}</Txt></View>
          ))}
          <Btn kind="primary" label="Turn on backup & sync" onPress={() => run(async () => { setPhrase(await sync.start()); })} />
        </Block>
      );
    }
    return (
      <>
        <Block title="Backup & sync is on">
          <Txt>{statusLine(sync.status, sync.last, sync.error)}</Txt>
          <Txt variant="meta" dim>Encrypted on this phone; nobody else can read it, not even us. Signed in as {P.user.email}.</Txt>
          <Btn label="Sync now" onPress={() => { haptic.tick(); sync.syncNow(); }} />
        </Block>
        <Block title="Recovery phrase">
          <Txt variant="small" dim>Lost your 24 words? Make new ones. The old phrase stops working.</Txt>
          <Btn label="Make a new recovery phrase" onPress={() => run(async () => { setPhrase(await sync.newPhrase()); })} />
        </Block>
        <Block title="On this phone">
          <Txt variant="small" dim>Stop syncing here. Your data stays on this phone and in your backup.</Txt>
          <Btn label="Turn off on this phone" onPress={() => run(() => sync.turnOff(), 'Backup is off on this phone')} />
        </Block>
        <Block title="Delete backup">
          <Txt variant="small" dim>Removes the encrypted copy from your account. Your data stays on this phone.</Txt>
          <Btn label={armDelete ? 'Tap again to delete the backup' : 'Delete my backup'} onPress={() => {
            if (!armDelete) { setArmDelete(true); haptic.warn(); return; }
            setArmDelete(false); run(async () => { await sync.deleteCloud(); setExists(false); }, 'Backup deleted');
          }} />
        </Block>
      </>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>{restoring ? 'Restore from my account' : 'Backup & sync'}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s3, paddingBottom: S.s8, gap: S.s4 }} keyboardShouldPersistTaps="handled">
        {body()}
        {busy ? <ActivityIndicator color={p.dim} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
