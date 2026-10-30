import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Chip, StatusDot, Txt, useToast } from '../components/ui';
import { askPermission, digestContent, nextDigestAt, nextReminderLabel, permissionStatus } from '../lib/notifications';
import { usePartner } from '../lib/partner';
import { DEFAULT_STATE, useStore } from '../lib/store';
import { addYears, pad, parseBirth, slotLabel, ymd } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

// What the next digest notification will say: built by the same code that schedules it.
function DigestPreview() {
  const { state } = useStore();
  const p = usePalette();
  const at = nextDigestAt(state), c = digestContent(state, at), d = new Date(at);
  return (
    <View style={{ marginTop: S.s3, gap: S.s2 }}>
      <Txt variant="small" dim>Arrives {slotLabel(at)}. One notification, most urgent first.</Txt>
      <View style={{ padding: S.s4, borderRadius: R.lg, backgroundColor: p.raise2, gap: S.s1 }}>
        <Txt variant="small" dim><Txt variant="small" style={{ fontFamily: F.uiSemi }}>Deadline</Txt> · {pad(d.getHours())}:{pad(d.getMinutes())}</Txt>
        <Txt style={{ fontFamily: F.uiBold }}>{c.title}</Txt>
        {c.slots.map((l, i) => <Txt key={i} variant="meta" dim>{l}</Txt>)}
        {c.tasks.map((t, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, minHeight: 28 }}>
            <StatusDot st={t.st} shapes={state.shapes} size={8} />
            <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt>
            <Txt variant="small" dim>{t.left}</Txt>
          </View>
        ))}
        {!c.tasks.length ? <Txt variant="meta" dim>Add a deadline to start a clock.</Txt> : null}
      </View>
    </View>
  );
}

export default function Settings() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [perm, setPerm] = useState<string>('…');
  const [armReset, setArmReset] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const partner = usePartner();
  const partnerSub = partner.active ? `${state.partner}. Sunday check-ins are on.`
    : partner.incoming.length ? `${partner.incoming[0].fromName || `@${partner.incoming[0].fromUsername}`} asked to be your partner`
      : partner.outgoing ? `Waiting for @${partner.outgoing.toUsername}`
        : 'One person who sees your week every Sunday';
  useEffect(() => { permissionStatus().then(setPerm).catch(() => setPerm('unknown')); }, []);

  const row = (title: string, sub: string | undefined, right: ReactNode) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.s3, minHeight: 64, paddingVertical: S.s2, borderBottomWidth: 1, borderBottomColor: p.line }}>
      <View style={{ flex: 1, minWidth: 160 }}><Txt style={{ fontFamily: F.uiSemi }}>{title}</Txt>{sub ? <Txt variant="small" dim>{sub}</Txt> : null}</View>
      {right}
    </View>
  );
  const group = (label: string, children: ReactNode) => (
    <View style={{ marginTop: S.s5 }}><Txt variant="label" dim style={{ marginBottom: S.s1 }}>{label}</Txt>{children}</View>
  );
  const toDate = (hm: string) => { const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Settings</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingBottom: S.s8 }}>
        {group('You', <>
          {row('Date of birth', undefined, <View style={{ minWidth: 160 }}><DateTimeField label="Date of birth" mode="date" value={parseBirth(state.birth)} maximumDate={new Date()}
            onChange={d => { if (+addYears(d, state.life) <= Date.now()) return toast('Check the year of birth'); update(s => ({ ...s, birth: ymd(d) })); }} /></View>)}
          {row('Reference age', 'A point to count towards, not a prediction', (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s1 }}>
              <Btn label="−" accessibilityLabel="Younger" style={{ width: 48 }} onPress={() => update(s => (+addYears(parseBirth(s.birth), s.life - 1) <= Date.now() ? s : { ...s, life: Math.max(50, s.life - 1) }))} />
              <Txt style={{ fontFamily: F.uiBold, minWidth: 32, textAlign: 'center' }}>{state.life}</Txt>
              <Btn label="+" accessibilityLabel="Older" style={{ width: 48 }} onPress={() => update(s => ({ ...s, life: Math.min(110, s.life + 1) }))} />
            </View>
          ))}
          {row('Accountability partner', partnerSub, <Btn label={partner.active || partner.incoming.length ? 'Open' : 'Set up'} onPress={() => router.push('/partner')} />)}
        </>)}

        {group('Display', <>
          {row('Appearance', 'Light reads best in bright places; dark is easier at night', (
            <View style={{ flexDirection: 'row', gap: S.s1 }}>
              {(['system', 'light', 'dark'] as const).map(a => (
                <Chip key={a} label={a === 'system' ? 'Auto' : a[0].toUpperCase() + a.slice(1)} on={(state.appearance ?? 'system') === a}
                  onPress={() => update(s => ({ ...s, appearance: a }))} />
              ))}
            </View>
          ))}
          {row('Show life grid', 'Turn off to see only the number', <Switch value={state.showGrid} onValueChange={v => update(s => ({ ...s, showGrid: v }))} />)}
          {state.showGrid ? row('Show weeks already lived', 'Every week since you were born, filled in. The grid scrolls.', <Switch value={!!state.showLived} onValueChange={v => update(s => ({ ...s, showLived: v }))} />) : null}
          {row('Important dates', `${(state.events ?? []).length || 'No'} dates on your life grid`, <Btn label="Open" onPress={() => router.push('/events')} />)}
          {row('Widgets', 'Your weeks and deadlines on the home screen', <Btn label="Open" onPress={() => router.push('/widgets')} />)}
          {row('Lock screen wallpaper', 'Your weeks and years lived, as an image', <Btn label="Make" onPress={() => router.push('/wallpaper')} />)}
          {row('Shapes on status colours', '● on track  ◆ pay attention  ▲ act now', <Switch value={state.shapes} onValueChange={v => update(s => ({ ...s, shapes: v }))} />)}
        </>)}

        {group('Reminders', <>
          {row('Notifications', perm === 'granted' ? (nextReminderLabel(state) ?? 'Allowed') : perm === 'denied' ? 'Turned off in phone settings' : 'Not allowed yet', (
            perm === 'granted' ? <Txt variant="meta" dim>On</Txt>
              : <Btn label={perm === 'denied' ? 'Open settings' : 'Allow'} onPress={async () => {
                if (perm === 'denied') return Linking.openSettings();
                setPerm((await askPermission()) ? 'granted' : 'denied');
              }} />
          ))}
          <Txt variant="small" dim style={{ marginTop: S.s3, marginBottom: S.s2 }}>Digest times: everything arrives together three times a day.</Txt>
          <View style={{ flexDirection: 'row', gap: S.s2 }}>
            {state.digest.map((hm, i) => (
              <View key={i} style={{ flex: 1 }}>
                <DateTimeField label={`Digest ${i + 1}`} mode="time" value={toDate(hm)}
                  onChange={d => update(s => ({ ...s, digest: s.digest.map((x, j) => (j === i ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : x)) }))} />
              </View>
            ))}
          </View>
          <Btn style={{ marginTop: S.s3 }} label={showDigest ? 'Hide preview' : 'Preview next digest'} onPress={() => setShowDigest(!showDigest)} />
          {showDigest ? <DigestPreview /> : null}
        </>)}

        {group('More', <>
          {row('Weekly review', 'Arrives every Sunday at 18:00', <Btn label="Open" onPress={() => router.push('/review')} />)}
          {row('Replay intro', undefined, <Btn label="Replay" onPress={() => { update(s => ({ ...s, onboarded: false })); router.replace('/onboarding'); }} />)}
          {row('Erase everything', 'Removes all tasks and settings on this phone', <Btn label={armReset ? 'Tap again' : 'Erase'} onPress={() => {
            if (!armReset) return setArmReset(true);
            update(() => DEFAULT_STATE); router.replace('/onboarding');
          }} />)}
          <Txt variant="small" dim style={{ marginTop: S.s4 }}>Deadline {Constants.expoConfig?.version ?? ''} · test build. Your data stays on this phone.</Txt>
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}
