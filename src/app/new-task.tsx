import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorSwatches } from '../components/ColorSwatches';
import { CloseIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Chip, Txt, haptic, useToast } from '../components/ui';
import { DEFAULT_MINUTES, fromHM, overlaps, suggestTime, toHM } from '../lib/schedule';
import { uid, useStore, type Task } from '../lib/store';
import { DAY, endOfDay, nextSlot, pad, slotLabel } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

const LENGTHS = [15, 30, 45, 60, 90];
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
  const params = useLocalSearchParams<{ deadline?: string; on?: string; time?: string }>();
  const onDate = params.on ? (() => { const [y, m, d] = params.on!.split('-').map(Number); return new Date(y, m - 1, d, 12); })() : null;
  // Opened from a day on the Year screen: that day is the deadline.
  const [deadline, setDeadline] = useState(() => {
    if (!params.deadline) {
      // From an hour on the Timeline: make sure the deadline isn't before that session.
      const base = new Date(Date.now() + 30 * DAY);
      if (!params.on) return base;
      const [y, m, d] = params.on.split('-').map(Number), on = new Date(y, m - 1, d, 12);
      return on > base ? on : base;
    }
    const [y, m, d] = params.deadline.split('-').map(Number); return new Date(y, m - 1, d, 12);
  });
  const [quick, setQuick] = useState<number | null>(params.deadline ? null : 30);
  // When: always answered. "Repeat" (days of the week) or "Once" (one date). A free time is pre-filled and said
  // to be a suggestion; there is no way to save without a time (Milkman et al. 2011: date *and* time prompts work).
  const [mode, setMode] = useState<'repeat' | 'once'>(onDate ? 'once' : 'repeat');
  const [days, setDays] = useState<number[]>(onDate ? [onDate.getDay()] : [1, 2, 3, 4, 5]);
  const [onceDate, setOnceDate] = useState<Date>(onDate ?? new Date(Date.now() + DAY));
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [suggested, setSuggested] = useState(() => params.time ?? suggestTime(state, onDate ? [onDate.getDay()] : [1, 2, 3, 4, 5], DEFAULT_MINUTES));
  const [time, setTime] = useState(() => { const d = new Date(); const m = fromHM(params.time ?? suggested); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; });
  const [touchedTime, setTouchedTime] = useState(!!params.time);
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
    const hm = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    let oneOff: number | null = null;
    if (mode === 'once') {
      const d = new Date(onceDate); d.setHours(time.getHours(), time.getMinutes(), 0, 0); oneOff = +d;
      if (oneOff <= Date.now()) return setErr('Pick a time that is still ahead.');
      if (oneOff > dl) return setErr('The session is after the deadline. Move one of them.');
    }
    const t: Task = {
      id: uid(), title: title.trim(), start: Date.now(), deadline: dl, minutes,
      slot: mode === 'repeat' ? { days, time: hm } : null, oneOff,
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

          <View style={{ gap: S.s3 }}>
            <Txt variant="label">When will you work on it?</Txt>
            <View style={{ flexDirection: 'row', gap: S.s1 }}>
              <View style={{ flex: 1 }}><Chip label="Repeat" on={mode === 'repeat'} onPress={() => setMode('repeat')} /></View>
              <View style={{ flex: 1 }}><Chip label="Once" on={mode === 'once'} onPress={() => setMode('once')} /></View>
            </View>
            {mode === 'repeat' ? (
              <View style={{ flexDirection: 'row', gap: S.s1 }}>
                {DAYS.map(([l, n, name]) => (
                  <Pressable key={name} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: days.includes(n) }}
                    onPress={() => { haptic.tick(); setDays(d => (d.includes(n) ? d.filter(x => x !== n) : [...d, n])); }}
                    style={{ flex: 1, height: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderColor: days.includes(n) ? p.ink : p.line, backgroundColor: days.includes(n) ? p.ink : 'transparent' }}>
                    <Txt style={{ fontFamily: F.uiSemi, fontSize: 15 }} color={days.includes(n) ? p.bg : p.dim}>{l}</Txt>
                  </Pressable>
                ))}
              </View>
            ) : (
              <DateTimeField label="Day" mode="date" value={onceDate} minimumDate={new Date()} maximumDate={deadline} onChange={setOnceDate} />
            )}
            <View style={{ flexDirection: 'row', gap: S.s2 }}>
              <View style={{ flex: 1 }}><DateTimeField label="Start time" mode="time" value={time} onChange={d => { setTime(d); setTouchedTime(true); }} /></View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1 }}>
              {LENGTHS.map(m => <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60 === 1 ? '1' : '1½'} h`} on={minutes === m} onPress={() => setMinutes(m)} />)}
            </View>
            <DayBar start={fromHM(`${pad(time.getHours())}:${pad(time.getMinutes())}`)} minutes={minutes} color={color ?? p.ink}
              busy={state.tasks.filter(t => !t.done && t.slot && (mode === 'repeat' ? t.slot.days.some(d => days.includes(d)) : t.slot.days.includes(onceDate.getDay())))
                .map(t => [fromHM(t.slot!.time), t.minutes ?? DEFAULT_MINUTES] as [number, number])} />
            {(() => {
              const hm = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
              const clash = overlaps(state, mode === 'repeat' ? days : [onceDate.getDay()], hm, minutes);
              const end = toHM(fromHM(hm) + minutes);
              if (clash.length) {
                const alt = suggestTime(state, mode === 'repeat' ? days : [onceDate.getDay()], minutes, hm);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, height: 44 }}>
                    <Txt variant="small" style={{ flex: 1 }} numberOfLines={2}>Overlaps “{clash[0].title}”. {alt} is free.</Txt>
                    <Chip label={`Use ${alt}`} onPress={() => { const m = fromHM(alt); const d = new Date(time); d.setHours(Math.floor(m / 60), m % 60, 0, 0); setTime(d); setSuggested(alt); setTouchedTime(true); }} />
                  </View>
                );
              }
              return (
                <Txt variant="small" dim style={{ height: 44 }} numberOfLines={2}>
                  {touchedTime ? `${hm}–${end} is held for you.` : `${hm}–${end} is free, so we've suggested it. Change it to whatever suits you.`} You get a reminder the evening before and 15 minutes before.
                </Txt>
              );
            })()}
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
          {/* Saving needs a time: with "Repeat", at least one day. The button says what is missing, no error popup. */}
          {(() => {
            const missing = !title.trim() ? 'Name the task to start' : mode === 'repeat' && !days.length ? 'Pick at least one day' : null;
            return <Btn kind="primary" label={missing ?? 'Reserve the time and start'} disabled={!!missing} style={missing ? { opacity: 0.45 } : undefined} onPress={save} />;
          })()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The chosen session on a 06:00–23:00 bar, with times already reserved on those days shown dimmed. */
function DayBar({ start, minutes, busy, color }: { start: number; minutes: number; busy: [number, number][]; color: string }) {
  const p = usePalette();
  const from = 360, span = 1020, pct = (m: number) => `${Math.max(0, Math.min(100, ((m - from) / span) * 100))}%` as const;
  return (
    <View accessible accessibilityLabel={`Session from ${toHM(start)} for ${minutes} minutes`} style={{ height: 44 }}>
      <View style={{ height: 24, backgroundColor: p.ahead }}>
        {busy.map(([s, m], i) => <View key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: pct(s), width: pct(from + m), backgroundColor: p.lived }} />)}
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: pct(start), width: pct(from + minutes), minWidth: 3, backgroundColor: color }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        {['06', '10', '14', '18', '22'].map(h => <Txt key={h} variant="small" dim allowFontScaling={false}>{h}</Txt>)}
      </View>
    </View>
  );
}
