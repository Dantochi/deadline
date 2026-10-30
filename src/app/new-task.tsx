import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorSwatches } from '../components/ColorSwatches';
import { CloseIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Chip, Txt, haptic, useToast } from '../components/ui';
import { uid, useStore, type Task } from '../lib/store';
import { DAY, endOfDay, nextSlot, pad, slotLabel } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

const QUICK: [string, number][] = [['2 weeks', 14], ['1 month', 30], ['3 months', 91], ['1 year', 365]];
const DAYS: [string, number, string][] = [['M', 1, 'Monday'], ['T', 2, 'Tuesday'], ['W', 3, 'Wednesday'], ['T', 4, 'Thursday'], ['F', 5, 'Friday'], ['S', 6, 'Saturday'], ['S', 0, 'Sunday']];
const HINTS: Record<string, string> = {
  career: 'Apply for three senior roles', health: 'Run a 10K', money: 'Save three months of rent', learning: 'Finish the data course',
  family: 'Plan the family reunion', creative: 'Finish the first draft', home: 'Repaint the bedroom',
};

export default function NewTask() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState(new Date(Date.now() + 30 * DAY));
  const [quick, setQuick] = useState<number | null>(30);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [time, setTime] = useState(() => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; });
  const [place, setPlace] = useState('');
  const [more, setMore] = useState(false);
  const [ifthen, setIfthen] = useState('');
  const [cue, setCue] = useState('');
  const [color, setColor] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const input = { minHeight: 56, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: 16, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 } as const;

  const save = () => {
    if (!title.trim()) return setErr('Give the task a name.');
    const dl = endOfDay(+deadline);
    if (dl <= Date.now()) return setErr('Pick a deadline from tomorrow onwards.');
    const t: Task = {
      id: uid(), title: title.trim(), start: Date.now(), deadline: dl,
      slot: days.length ? { days, time: `${pad(time.getHours())}:${pad(time.getMinutes())}` } : null,
      place: place.trim(), ifthen: ifthen.trim(), cue: cue.trim(), color,
    };
    update(s => ({ ...s, tasks: [...s.tasks, t] }));
    haptic.ok();
    const n = nextSlot(t);
    toast(n ? `${slotLabel(n)} is reserved for this.` : 'The clock is running');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
          <Txt variant="h2" style={{ flex: 1 }}>New task</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
            <CloseIcon color={p.dim} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingBottom: S.s7, gap: S.s5 }} keyboardShouldPersistTaps="handled">
          <TextInput value={title} onChangeText={t => { setTitle(t); setErr(''); }} autoFocus placeholder={HINTS[state.focus ?? ''] ?? 'What do you want to get done?'}
            placeholderTextColor={p.dim} maxFontSizeMultiplier={2}
            style={{ fontFamily: F.uiSemi, fontSize: 21, color: p.ink, borderBottomWidth: 1, borderBottomColor: p.line, paddingVertical: S.s3 }} />

          <View style={{ gap: S.s2 }}>
            <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>Deadline</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
              {QUICK.map(([l, d]) => <Chip key={l} label={l} on={quick === d} onPress={() => { setQuick(d); setDeadline(new Date(Date.now() + d * DAY)); }} />)}
            </View>
            <DateTimeField label="Deadline" mode="date" value={deadline} minimumDate={new Date(Date.now() + DAY)} onChange={d => { setDeadline(d); setQuick(null); }} />
          </View>

          <View style={{ gap: S.s2 }}>
            <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>Reserve a time for it</Txt>
            <View style={{ flexDirection: 'row', gap: S.s1 }}>
              {DAYS.map(([l, n, name]) => (
                <Pressable key={name} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: days.includes(n) }}
                  onPress={() => { haptic.tick(); setDays(d => (d.includes(n) ? d.filter(x => x !== n) : [...d, n])); }}
                  style={{ flex: 1, minHeight: 44, borderRadius: R.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: days.includes(n) ? p.ink : p.line, backgroundColor: days.includes(n) ? p.ink : 'transparent' }}>
                  <Txt style={{ fontFamily: F.uiSemi, fontSize: 15 }} color={days.includes(n) ? p.bg : p.dim}>{l}</Txt>
                </Pressable>
              ))}
            </View>
            <DateTimeField label="Time" mode="time" value={time} onChange={setTime} />
            <Txt variant="small" dim>This time is held for you. You get a reminder the evening before and 15 minutes before.</Txt>
          </View>

          <View style={{ gap: S.s2 }}>
            <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>Where?</Txt>
            <TextInput value={place} onChangeText={setPlace} placeholder="At my desk" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
          </View>

          <View style={{ gap: S.s2 }}>
            <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>Colour on the Year calendar</Txt>
            <ColorSwatches value={color} onChange={setColor} auto />
            <Txt variant="small" dim>Auto follows the status: green, then amber, then red as time runs out.</Txt>
          </View>

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(m => !m)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.uiSemi }} dim>{more ? '−' : '+'}  Make the plan stronger</Txt>
          </Pressable>
          {more ? (
            <View style={{ gap: S.s5, marginTop: -S.s3 }}>
              <View style={{ gap: S.s2 }}>
                <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>If something gets in the way, I will…</Txt>
                <TextInput value={ifthen} onChangeText={setIfthen} placeholder="If I'm too tired, I'll do just 10 minutes" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
                <Txt variant="small" dim>Deciding now what you will do when an obstacle shows up helps the plan hold.</Txt>
              </View>
              <View style={{ gap: S.s2 }}>
                <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>What will you see that reminds you?</Txt>
                <TextInput value={cue} onChangeText={setCue} placeholder="Running shoes by the door" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
              </View>
            </View>
          ) : null}

          {err ? <Txt variant="meta" color={p.redInk} style={{ fontFamily: F.uiSemi }}>{err}</Txt> : null}
          <Btn kind="primary" label="Start the clock" onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
