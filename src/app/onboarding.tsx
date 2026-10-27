import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LifeGrid } from '../components/LifeGrid';
import { DateTimeField } from '../components/pickers';
import { Btn, Chip, Txt, haptic } from '../components/ui';
import { askPermission } from '../lib/notifications';
import { useStore } from '../lib/store';
import { addYears, fmt, parseBirth, weekNow, ymd } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

const FOCUS: [string, string][] = [['career', 'Career'], ['health', 'Health'], ['money', 'Money'], ['learning', 'Learning'], ['family', 'Family'], ['creative', 'Creative work'], ['home', 'Home']];

export default function Onboarding() {
  const { state, update } = useStore();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [birth, setBirth] = useState(parseBirth(state.birth));
  const [err, setErr] = useState('');

  const finish = () => { update(s => ({ ...s, onboarded: true })); router.replace('/'); };
  const card = (title: string, body: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress(); }}
      style={({ pressed }) => ({ padding: S.s5, borderRadius: R.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.raise, gap: S.s1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Txt style={{ fontFamily: F.uiBold, fontSize: 19 }}>{title}</Txt>
      <Txt variant="meta" dim>{body}</Txt>
    </Pressable>
  );
  const heading = (t: string, sub?: string) => (
    <View style={{ gap: S.s2 }}>
      <Txt style={{ fontFamily: F.uiHeavy, fontSize: 42, lineHeight: 44, letterSpacing: -1.4 }}>{t}</Txt>
      {sub ? <Txt dim>{sub}</Txt> : null}
    </View>
  );

  const wNow = weekNow(birth, state.life);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: '6%', gap: S.s5 }}>
        {step === 0 ? (
          <>
            {heading('How do you want to see your time?', 'You can change this later in Settings.')}
            {card('My life in weeks', 'Every week you have left, with your deadlines on it.', () => { update(s => ({ ...s, showGrid: true })); setStep(1); })}
            {card('Just my deadlines', 'Countdowns and plans, without the life view.', () => { update(s => ({ ...s, showGrid: false })); setStep(3); })}
          </>
        ) : null}

        {step === 1 ? (
          <>
            {heading('Your life, in boxes.', "Each box is one week. Let's draw yours.")}
            <View style={{ gap: S.s2 }}>
              <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>When were you born?</Txt>
              <DateTimeField label="Date of birth" mode="date" value={birth} maximumDate={new Date()} onChange={d => { setBirth(d); setErr(''); }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
              <View style={{ flex: 1 }}><Txt style={{ fontFamily: F.uiSemi }}>Count towards age</Txt><Txt variant="small" dim>A reference point, not a prediction</Txt></View>
              <Btn label="−" accessibilityLabel="Younger" onPress={() => update(s => ({ ...s, life: Math.max(50, s.life - 1) }))} style={{ width: 48 }} />
              <Txt style={{ fontFamily: F.uiBold, minWidth: 32, textAlign: 'center' }}>{state.life}</Txt>
              <Btn label="+" accessibilityLabel="Older" onPress={() => update(s => ({ ...s, life: Math.min(110, s.life + 1) }))} style={{ width: 48 }} />
            </View>
            {err ? <Txt variant="meta" color={p.redInk}>{err}</Txt> : null}
            <Btn kind="primary" label="Draw my life" onPress={() => {
              if (+addYears(birth, state.life) <= Date.now()) return setErr('Pick a reference age older than you are now.');
              update(s => ({ ...s, birth: ymd(birth) })); haptic.ok(); setStep(2);
            }} />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <View style={{ gap: S.s1 }}>
              <Txt variant="label" dim>You are here</Txt>
              <Txt numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.dot, fontSize: 84, lineHeight: 88, color: p.ink }}>{fmt(state.life * 52 - wNow)}</Txt>
              <Txt dim>weeks left until {state.life}. Make them count.</Txt>
            </View>
            <LifeGrid state={{ ...state, birth: ymd(birth), tasks: [] }} maxHeight={height * 0.45} />
            <Btn kind="primary" label="Continue" onPress={() => setStep(3)} />
          </>
        ) : null}

        {step === 3 ? (
          <>
            {heading('What do you want to finish first?', 'Your first plan starts from this.')}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
              {FOCUS.map(([k, l]) => <Chip key={k} label={l} on={state.focus === k} onPress={() => update(s => ({ ...s, focus: k }))} />)}
            </View>
            <Btn kind="primary" label="Continue" onPress={() => setStep(4)} />
          </>
        ) : null}

        {step === 4 ? (
          <>
            {heading('Reminders that respect you.', 'Three short digests a day, plus a nudge before each time you reserve. Nothing else.')}
            <Btn kind="primary" label="Allow reminders" onPress={async () => { await askPermission().catch(() => false); finish(); }} />
            <Btn kind="ghost" label="Not now" onPress={finish} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
