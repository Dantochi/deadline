import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon, CloseIcon } from '../components/icons';
import { TimeSheet, lenText } from '../components/TimeSheet';
import { MicIcon, VoiceSheet } from '../components/Voice';
import { DateTimeField } from '../components/pickers';
import { Btn, Chip, Txt, haptic, useToast } from '../components/ui';
import { aiAvailable, aiParse } from '../lib/ai';
import { parseTask, type Parsed } from '../lib/parse';
import { DEFAULT_MINUTES, fromHM, overlaps, suggestTime, toHM } from '../lib/schedule';
import { uid, useStore, type Task } from '../lib/store';
import { DAY, endOfDay, nextSlot, pad, slotLabel } from '../lib/time';
import { F, R, S, statusColor, usePalette } from '../theme';

type Unit = 'week' | 'month' | 'year';
const UNITS: Unit[] = ['week', 'month', 'year'];
/** `n` weeks, months or years from now (months and years by the calendar, not a fixed number of days). */
const fromNow = (u: Unit, n: number) => {
  const d = new Date();
  if (u === 'week') d.setDate(d.getDate() + 7 * n); else if (u === 'month') d.setMonth(d.getMonth() + n); else d.setFullYear(d.getFullYear() + n);
  return d;
};
const DAYS: [string, number, string][] = [['M', 1, 'Monday'], ['T', 2, 'Tuesday'], ['W', 3, 'Wednesday'], ['T', 4, 'Thursday'], ['F', 5, 'Friday'], ['S', 6, 'Saturday'], ['S', 0, 'Sunday']];
/** Where / "Make the plan stronger" (backup plan and cue) on the form. Off for now; set true to bring them back. */
const PLAN_EXTRAS = false;
/** The day bar and the "held for you" line under the time button. Off for now; set true to bring them back. */
const DAY_PREVIEW = false;

const HINTS: Record<string, string> = {
  career: 'Apply for three senior roles', health: 'Run a 10K', money: 'Save three months of rent', learning: 'Finish the data course',
  family: 'Plan the family reunion', creative: 'Finish the first draft', home: 'Repaint the bedroom',
};

export default function NewTask() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const params = useLocalSearchParams<{ deadline?: string; on?: string; time?: string; edit?: string; voice?: string }>();
  // Editing an existing task: every field starts from it.
  const ed = params.edit ? state.tasks.find(t => t.id === params.edit) : undefined;
  const [title, setTitle] = useState(ed?.title ?? '');
  const onDate = params.on ? (() => { const [y, m, d] = params.on!.split('-').map(Number); return new Date(y, m - 1, d, 12); })() : null;
  // Opened from a day on the Year screen: that day is the deadline.
  const [deadline, setDeadline] = useState(() => {
    if (ed) return new Date(ed.deadline);
    if (!params.deadline) {
      // From an hour on the Timeline: make sure the deadline isn't before that session.
      const base = new Date(Date.now() + 30 * DAY);
      if (!params.on) return base;
      const [y, m, d] = params.on.split('-').map(Number), on = new Date(y, m - 1, d, 12);
      return on > base ? on : base;
    }
    const [y, m, d] = params.deadline.split('-').map(Number); return new Date(y, m - 1, d, 12);
  });
  // Quick deadlines: 1 week, 1 month or 1 year; once one is picked, − and + step it by that unit.
  const [quick, setQuick] = useState<{ u: Unit; n: number } | null>(ed || params.deadline || params.on ? null : { u: 'month', n: 1 });
  const pickQuick = (u: Unit, n: number) => { const v = Math.max(1, Math.min(u === 'week' ? 52 : u === 'month' ? 24 : 10, n)); haptic.tick(); setQuick({ u, n: v }); setDeadline(fromNow(u, v)); };
  // When: always answered. "Repeat" (days of the week) or "Once" (one date). A free time is pre-filled and said
  // to be a suggestion; there is no way to save without a time (Milkman et al. 2011: date *and* time prompts work).
  const [mode, setMode] = useState<'repeat' | 'once'>(ed ? (ed.slot ? 'repeat' : 'once') : onDate ? 'once' : 'repeat');
  const [days, setDays] = useState<number[]>(ed?.slot?.days ?? (onDate ? [onDate.getDay()] : [1, 2, 3, 4, 5]));
  const [onceDate, setOnceDate] = useState<Date>(ed?.oneOff ? new Date(ed.oneOff) : onDate ?? new Date(Date.now() + DAY));
  const [minutes, setMinutes] = useState(ed?.minutes ?? DEFAULT_MINUTES);
  const edTime = ed ? (ed.slot?.time ?? (ed.oneOff ? `${pad(new Date(ed.oneOff).getHours())}:${pad(new Date(ed.oneOff).getMinutes())}` : undefined)) : undefined;
  const [suggested, setSuggested] = useState(() => edTime ?? params.time ?? suggestTime(state, onDate ? [onDate.getDay()] : [1, 2, 3, 4, 5], DEFAULT_MINUTES));
  const [time, setTime] = useState(() => { const d = new Date(); const m = fromHM(params.time ?? suggested); d.setHours(Math.floor(m / 60), m % 60, 0, 0); return d; });
  const [touchedTime, setTouchedTime] = useState(!!params.time || !!ed);
  const [timeOpen, setTimeOpen] = useState(false);
  const [place, setPlace] = useState(ed?.place ?? '');
  const [more, setMore] = useState(!!(ed?.ifthen || ed?.cue));
  const [ifthen, setIfthen] = useState(ed?.ifthen ?? '');
  const [cue, setCue] = useState(ed?.cue ?? '');
  const [err, setErr] = useState('');
  // Voice (or typed) capture: fills the fields below, and shows what it understood so it can be checked.
  const [voiceOpen, setVoiceOpen] = useState(params.voice === '1');
  const [heard, setHeard] = useState<string[]>([]);
  const [newSteps, setNewSteps] = useState<string[]>([]); // subtasks said by voice, added on save
  const setClock = (hm: string) => { const m = fromHM(hm); const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0); setTime(d); };
  // Fills the form from a reading of the sentence. `base` is the form as it was before, so a second reading
  // (Gemini's, after the instant on-phone one) replaces the first instead of mixing with it.
  type Base = { deadline: Date; days: number[]; minutes: number; time: Date; mode: typeof mode; title: string };
  const fill = (r: Parsed, base: Base) => {
    setTitle(r.title || base.title);
    const dl = r.deadline ?? base.deadline;
    setDeadline(dl); if (r.deadline) setQuick(null);
    const wd = r.days ?? (r.once ? [r.once.getDay()] : base.days);
    setMode(r.days ? 'repeat' : r.once ? 'once' : base.mode);
    setDays(r.days ?? base.days);
    if (r.once) { setOnceDate(r.once); if (r.once > dl) { setDeadline(r.once); setQuick(null); } }
    let len = r.minutes ?? base.minutes;
    let startHM = r.time;
    if (!startHM && (r.days || r.once)) startHM = suggestTime(state, wd, len);
    // "until 9pm": the length runs from the start to that end.
    if (r.end && !r.minutes) {
      const from = fromHM(startHM ?? `${pad(base.time.getHours())}:${pad(base.time.getMinutes())}`), to = fromHM(r.end);
      if (to > from && to - from <= 16 * 60) len = to - from;
    }
    setMinutes(len);
    if (startHM) setClock(startHM); else setTime(base.time);
    setTouchedTime(!!r.time);
    setNewSteps(r.steps ?? []);
    setHeard(r.found); setErr('');
  };
  const seq = useRef(0);
  const [thinking, setThinking] = useState(false);
  const apply = (sentence: string) => {
    const base: Base = { deadline, days, minutes, time, mode, title };
    const n = ++seq.current;
    fill(parseTask(sentence), base); // instant, on the phone
    setBy('phone');
    if (!state.aiParse || !aiAvailable) return;
    // Then Gemini, if turned on; its reading replaces the first unless something newer was said meanwhile.
    setThinking(true);
    aiParse(sentence).then(r => {
      if (n !== seq.current) return;
      setThinking(false);
      if (r) { fill(r, base); setBy('gemini'); }
    });
  };
  const [by, setBy] = useState<'phone' | 'gemini'>('phone');

  const input = { minHeight: 56, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: 16, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 } as const;

  const stepsFrom = () => newSteps.map(title => ({ id: uid(), title, done: false }));
  const save = () => {
    if (!title.trim()) return setErr('Give the task a name.');
    const dl = endOfDay(+deadline);
    if (dl <= Date.now() && !(ed && dl === ed.deadline)) return setErr('Pick a deadline from tomorrow onwards.');
    const hm = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    let oneOff: number | null = null;
    if (mode === 'once') {
      const d = new Date(onceDate); d.setHours(time.getHours(), time.getMinutes(), 0, 0); oneOff = +d;
      if (oneOff <= Date.now() && !(ed && oneOff === ed.oneOff)) return setErr('Pick a time that is still ahead.');
      if (oneOff > dl) return setErr('The session is after the deadline. Move one of them.');
    }
    const fields = {
      title: title.trim(), deadline: dl, minutes,
      slot: mode === 'repeat' ? { days, time: hm } : null, oneOff,
      place: place.trim(), ifthen: ifthen.trim(), cue: cue.trim(),
    };
    if (ed) {
      // Editing keeps history (start, sessions, check-ins, notes, colour); only the plan changes.
      update(s => ({ ...s, tasks: s.tasks.map(x => (x.id === ed.id ? { ...x, ...fields, steps: [...(x.steps ?? []), ...stepsFrom()] } : x)) }));
      haptic.ok(); toast('Saved'); router.back();
      return;
    }
    const t: Task = { id: uid(), start: Date.now(), color: null, ...fields, steps: stepsFrom() };
    update(s => ({ ...s, tasks: [...s.tasks, t] }));
    haptic.ok();
    const n = nextSlot(t);
    toast(n ? `${slotLabel(n)} is reserved for this.` : 'The clock is running');
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
          <Txt variant="h2" style={{ flex: 1 }}>{ed ? 'Edit task' : 'New task'}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
            <CloseIcon color={p.dim} />
          </Pressable>
        </View>
        {/* Each question is its own group, 48 apart; inside a group, 12. */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s4, paddingBottom: S.s8, gap: S.s7 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, borderBottomWidth: 1, borderBottomColor: p.line }}>
            <TextInput value={title} onChangeText={t => { setTitle(t); setErr(''); }} autoFocus={!voiceOpen && !ed} placeholder={HINTS[state.focus ?? ''] ?? 'What do you want to get done?'}
              placeholderTextColor={p.dim} maxFontSizeMultiplier={2}
              style={{ flex: 1, fontFamily: F.uiSemi, fontSize: 21, color: p.ink, paddingVertical: S.s3 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Say the task" onPress={() => setVoiceOpen(true)} hitSlop={6}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.raise2 }}>
              <MicIcon color={p.ink} />
            </Pressable>
          </View>
          {heard.length ? (
            <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', gap: S.s2, marginTop: -S.s6 }}>
              <CheckIcon size={16} color={statusColor(p, 'green', true)} />
              <Txt variant="small" numberOfLines={2} style={{ flex: 1 }}><Txt variant="small" dim>{thinking ? 'Checking with Gemini… · ' : by === 'gemini' ? 'Understood by Gemini · ' : 'Understood · '}</Txt>{heard.join(' · ')}</Txt>
            </View>
          ) : null}
          {newSteps.length ? (
            <View style={{ gap: S.s1, marginTop: -S.s6 }}>
              <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>Subtasks to add</Txt>
              {newSteps.map((st, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: S.s2 }}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: p.dim }} />
                  <Txt style={{ flex: 1 }} numberOfLines={2}>{st}</Txt>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${st}`} hitSlop={8} onPress={() => setNewSteps(l => l.filter((_, j) => j !== i))}
                    style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <CloseIcon size={18} color={p.dim} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ gap: S.s3 }}>
            <Txt variant="label" dim>Deadline</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
              {UNITS.map(u => quick?.u === u ? (
                <View key={u} style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderWidth: 1, borderColor: p.ink, backgroundColor: p.ink }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`One ${u} less`} onPress={() => pickQuick(u, quick.n - 1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontFamily: F.uiBold, fontSize: 20 }} color={p.bg}>−</Txt>
                  </Pressable>
                  <Txt style={{ fontFamily: F.uiSemi, minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] }} color={p.bg}>{quick.n} {u}{quick.n === 1 ? '' : 's'}</Txt>
                  <Pressable accessibilityRole="button" accessibilityLabel={`One ${u} more`} onPress={() => pickQuick(u, quick.n + 1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    <Txt style={{ fontFamily: F.uiBold, fontSize: 20 }} color={p.bg}>+</Txt>
                  </Pressable>
                </View>
              ) : <Chip key={u} label={`1 ${u}`} onPress={() => pickQuick(u, 1)} />)}
            </View>
            <DateTimeField label="Deadline" mode="date" value={deadline} minimumDate={new Date(Date.now() + DAY)} onChange={d => { setDeadline(d); setQuick(null); }} />
          </View>

          <View style={{ gap: S.s3 }}>
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
            {/* The day bar and the "held for you" line: switched off for now (DAY_PREVIEW). The bottom button opens
                the time screen, which shows the length and any clash. */}
            {DAY_PREVIEW ? <>
            <DayBar start={fromHM(`${pad(time.getHours())}:${pad(time.getMinutes())}`)} minutes={minutes} color={ed?.color ?? p.ink}
              busy={state.tasks.filter(t => t.id !== ed?.id && !t.done && t.slot && (mode === 'repeat' ? t.slot.days.some(d => days.includes(d)) : t.slot.days.includes(onceDate.getDay())))
                .map(t => [fromHM(t.slot!.time), t.minutes ?? DEFAULT_MINUTES] as [number, number])} />
            {(() => {
              const hm = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
              const clash = overlaps(state, mode === 'repeat' ? days : [onceDate.getDay()], hm, minutes, ed?.id);
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
            </> : null}
          </View>

          {/* Where, backup plan and cue: switched off for now (PLAN_EXTRAS). Saved values are kept on edit. */}
          {PLAN_EXTRAS ? <>
          <View style={{ gap: S.s3 }}>
            <Txt variant="label" dim>Where?</Txt>
            <TextInput value={place} onChangeText={setPlace} placeholder="At my desk" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
          </View>

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: more }} onPress={() => setMore(m => !m)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.uiSemi }} dim>{more ? '−' : '+'}  Make the plan stronger</Txt>
          </Pressable>
          {more ? (
            <View style={{ gap: S.s5, marginTop: -S.s3 }}>
              <View style={{ gap: S.s3 }}>
                <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>If something gets in the way, I will…</Txt>
                <TextInput value={ifthen} onChangeText={setIfthen} placeholder="If I'm too tired, I'll do just 10 minutes" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
                <Txt variant="small" dim>Deciding now what you will do when an obstacle shows up helps the plan hold.</Txt>
              </View>
              <View style={{ gap: S.s3 }}>
                <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>What will you see that reminds you?</Txt>
                <TextInput value={cue} onChangeText={setCue} placeholder="Running shoes by the door" placeholderTextColor={p.dim} style={input} maxFontSizeMultiplier={2} />
              </View>
            </View>
          ) : null}
          </> : null}

          {err ? <Txt variant="meta" color={p.redInk} style={{ fontFamily: F.uiSemi }}>{err}</Txt> : null}
          {/* The button says what is missing (no error popup). Before a time is set it opens the time screen; after
              Done it becomes Save, with the chosen time beside it to change. */}
          {(() => {
            const missing = !title.trim() ? 'Name the task to start' : mode === 'repeat' && !days.length ? 'Pick at least one day' : null;
            if (missing) return <Btn kind="primary" label={missing} disabled style={{ opacity: 0.45 }} />;
            if (!touchedTime) return <Btn kind="primary" label="Set time" onPress={() => setTimeOpen(true)} />;
            const hm = `${pad(time.getHours())}:${pad(time.getMinutes())}`, range = `${hm} – ${toHM(fromHM(hm) + minutes)}`;
            return (
              <View style={{ flexDirection: 'row', gap: S.s2 }}>
                <Btn label={range} accessibilityLabel={`Session ${range}, ${lenText(minutes)}. Change time`} onPress={() => setTimeOpen(true)} />
                <Btn kind="primary" label={ed ? 'Save changes' : 'Save'} style={{ flex: 1 }} onPress={save} />
              </View>
            );
          })()}
        </ScrollView>
      </KeyboardAvoidingView>
      <TimeSheet open={timeOpen} onClose={() => setTimeOpen(false)}
        start={`${pad(time.getHours())}:${pad(time.getMinutes())}`} minutes={minutes}
        onDone={(st, len) => { setClock(st); setMinutes(len); setTouchedTime(true); }}
        note={(st, len) => { const c = overlaps(state, mode === 'repeat' ? days : [onceDate.getDay()], st, len, ed?.id); return c.length ? `Overlaps “${c[0].title}”` : null; }} />
      <VoiceSheet open={voiceOpen} onClose={() => setVoiceOpen(false)} onResult={apply} />
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
