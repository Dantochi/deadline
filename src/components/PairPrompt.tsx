// On a phone where backup is on: a new phone signed in to the same account is asking for the key. Shown over
// whatever screen is open, with the code to compare. Approving sends the key, encrypted so only that phone can
// read it; the code check stops anyone in between from swapping in their own phone.
import { useState } from 'react';
import { Modal, View } from 'react-native';
import { Btn, Txt, haptic, useToast } from './ui';
import { useSync } from '../lib/cloud';
import { F, R, S, T, usePalette } from '../theme';

export function PairPrompt() {
  const sync = useSync();
  const p = usePalette();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const r = sync.request;
  if (!r) return null;
  const act = async (yes: boolean) => {
    setBusy(true);
    try {
      if (yes) { await sync.approve(r); haptic.ok(); toast('Approved. Your other phone is syncing now.'); }
      else { await sync.deny(r); toast('Not approved'); }
    } catch (e) { haptic.warn(); toast((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => act(false)}>
      <View style={{ flex: 1, backgroundColor: p.scrim, justifyContent: 'center', padding: S.page }}>
        <View style={{ backgroundColor: p.raise, borderRadius: R.lg, borderCurve: 'continuous', padding: S.s5, gap: S.s3 }}>
          <Txt variant="label" dim>Backup & sync</Txt>
          <Txt variant="h2">Let a new phone in?</Txt>
          <Txt dim>A phone signed in to your account is asking to unlock your backup. Approve only if it shows this code:</Txt>
          <Txt accessibilityLabel={`Code ${r.code.split('').join(' ')}`} style={{ fontFamily: F.dot, fontSize: T.x5, lineHeight: 44, textAlign: 'center', marginVertical: S.s2 }}>{r.code}</Txt>
          <Btn kind="primary" label="Approve" disabled={busy} onPress={() => act(true)} />
          <Btn kind="ghost" label="That’s not my phone" disabled={busy} onPress={() => act(false)} />
        </View>
      </View>
    </Modal>
  );
}
