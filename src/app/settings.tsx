import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Txt, useToast } from '../components/ui';
import { askPermission, nextReminderLabel, permissionStatus } from '../lib/notifications';
import { DEFAULT_STATE, useStore } from '../lib/store';
import { addYears, pad, parseBirth, ymd } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

export default function Settings() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [perm, setPerm] = useState<string>('…');
  const [armReset, setArmReset] = useState(false);
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
          {row('Accountability partner', 'Their name. Sunday updates arrive in a later test build.', (
            <TextInput defaultValue={state.partner} placeholder="Name" placeholderTextColor={p.dim} maxLength={30} maxFontSizeMultiplier={2}
              onEndEditing={e => update(s => ({ ...s, partner: e.nativeEvent.text.trim() }))}
              style={{ minWidth: 140, minHeight: 48, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: 12, color: p.ink, fontFamily: F.uiMedium, fontSize: 16 }} />
          ))}
        </>)}

        {group('Display', <>
          {row('Show life grid', 'Turn off to see only the number', <Switch value={state.showGrid} onValueChange={v => update(s => ({ ...s, showGrid: v }))} />)}
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
        </>)}

        {group('More', <>
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
