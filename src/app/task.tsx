// One task, on its own screen: how much time is left, the check-in for its last session, recovery when the
// deadline has passed, its plan (reserved time, backup, cue), subtasks and a diary of notes. Actions sit in a
// fixed bar at the bottom.
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, UndoIcon } from '../components/icons';
import { Diary } from '../components/Diary';
import { Glass } from '../components/Glass';
import { Subtasks } from '../components/Subtasks';
import { useDeleteTask } from '../components/TaskParts';
import { BoxStrip, Chip, StatusDot, Txt, haptic, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { DAY, boxesAt, endOfDay, fdate, fshort, info, lastSlot, leftShort, pad, slotLabel } from '../lib/time';
import { F, S, statusColor, usePalette } from '../theme';
import Svg, { Path } from 'react-native-svg';

const NotesIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round"><Path d="M5 4h14v16H5zM8.5 9h7M8.5 13h7M8.5 17h4" /></Svg>
);
const EditIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></Svg>
);
const TrashIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Svg>
);

export default function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const del = useDeleteTask();
  const t = state.tasks.find(x => x.id === id);
  const [rescheduling, setRescheduling] = useState(false);
  const [write, setWrite] = useState(0); // bumped by the Notes button: open a new diary note

  if (!t) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', gap: S.s3 }}>
        <Txt dim>This task no longer exists.</Txt>
        <Chip label="Back" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const { left, st } = info(t);
  const over = !t.done && !t.pausedAt && left < 0, paused = !!t.pausedAt && !t.done;
  const ls = !t.done && !paused && !over ? lastSlot(t) : null;
  const ask = ls != null && !(t.checks ?? []).includes(ls);
  const sb = boxesAt(t, Date.now());
  const label = t.done ? (t.letGo ? 'Let go' : 'Done') : paused ? 'Paused' : over ? leftShort(left) : `${leftShort(left)} left`;
  const unitsLeft = sb.n - sb.gone;

  const complete = () => {
    updateTask(t.id, x => ({ ...x, done: true, doneAt: Date.now() }));
    haptic.ok();
    const d = Math.round((t.deadline - Date.now()) / DAY);
    toast(d > 0 ? `Done, ${d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} day${d === 1 ? '' : 's'}`} early.` : 'Done.', 3200);
  };
  const extend = (days: number) => {
    const nd = endOfDay(Date.now() + days * DAY);
    // A new deadline is a fresh start: the clock restarts from today.
    updateTask(t.id, x => ({ ...x, deadline: nd, start: Date.now() }));
    haptic.ok(); toast(`New deadline ${fdate(nd)}. A fresh start.`);
  };
  const checkIn = (yes: boolean) => {
    if (ls == null) return;
    if (yes) {
      const back = t.missedAt != null && t.missedAt < ls;
      updateTask(t.id, x => ({ ...x, checks: [...(x.checks ?? []), ls], sessions: [...(x.sessions ?? []), ls], missedAt: null }));
      haptic.ok();
      // Coming back after a miss is the moment worth rewarding.
      toast(back ? 'Welcome back. Returning after a miss is what builds the habit.' : 'Session logged. That is how it gets done.', back ? 3800 : 2600);
    } else {
      updateTask(t.id, x => ({ ...x, checks: [...(x.checks ?? []), ls], missedAt: ls }));
      setRescheduling(true);
    }
  };
  const reserveAt = (ms: number) => { updateTask(t.id, x => ({ ...x, oneOff: ms })); setRescheduling(false); haptic.ok(); toast(`${slotLabel(ms)} is reserved for this.`); };
  const at = (dayOff: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return +d; };
  const [uh, um] = (t.slot?.time ?? '07:00').split(':').map(Number);

  const card = (children: ReactNode) => <Glass style={{ padding: S.s5, gap: S.s3 }}>{children}</Glass>;
  const line = (k: string, v: string) => <Txt variant="meta" numberOfLines={2}><Txt variant="meta" dim>{k} · </Txt>{v}</Txt>;

  // Bottom bar: small, equal buttons (icon over a short label), fixed height.
  const act = (key: string, text: string, icon: ReactNode, onPress: () => void, danger?: boolean) => (
    <Pressable key={key} accessibilityRole="button" accessibilityLabel={text} onPress={() => { haptic.tick(); onPress(); }}
      style={({ pressed }) => ({ flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: pressed ? 0.6 : 1 })}>
      {icon}
      <Txt variant="small" style={{ fontFamily: F.uiSemi }} color={danger ? p.redInk : p.ink}>{text}</Txt>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page }}>
        <View style={{ flex: 1 }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>

      {/* The title block, then groups set apart by 48: the space between groups is well over the space inside them. */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s4, paddingBottom: S.s8, gap: S.s7 }}>
        <View style={{ gap: S.s2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
            <StatusDot st={st} shapes={state.shapes} />
            <Txt variant="label" color={statusColor(p, st, true)}>{label}</Txt>
          </View>
          <Txt variant="h1" style={[t.done && { color: p.dim, textDecorationLine: 'line-through' }]}>{t.title}</Txt>
          {!t.done && !paused && !over ? (
            <View style={{ gap: S.s2, marginTop: S.s4 }}>
              <BoxStrip n={sb.n} gone={sb.gone} st={st} />
              <Txt variant="meta" dim>{unitsLeft} {sb.unit}{unitsLeft === 1 ? '' : 's'} left</Txt>
            </View>
          ) : null}
        </View>

        {over ? card(<>
          <Txt style={{ fontFamily: F.uiSemi }}>The deadline passed {leftShort(left).replace(' over', '')} ago.</Txt>
          <Txt variant="meta" dim>That happens. Choose what is true now.</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
            <Chip label="+3 days" onPress={() => extend(3)} /><Chip label="+1 week" onPress={() => extend(7)} /><Chip label="+2 weeks" onPress={() => extend(14)} />
            <Chip label="Let go" onPress={() => { updateTask(t.id, x => ({ ...x, done: true, letGo: true, doneAt: Date.now() })); toast('Let go. That time is yours again.'); }} />
          </View>
        </>) : null}

        {ask && !rescheduling ? card(<>
          <Txt>Did your {pad(new Date(ls!).getHours())}:{pad(new Date(ls!).getMinutes())} session happen?</Txt>
          <View style={{ flexDirection: 'row', gap: S.s2 }}><Chip label="Yes" onPress={() => checkIn(true)} /><Chip label="Not today" onPress={() => checkIn(false)} /></View>
        </>) : null}
        {rescheduling ? card(<>
          <Txt variant="meta">No problem. Missing one session does not undo the others. Find another time:</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
            {new Date().getHours() < 18 ? <Chip label="This evening" onPress={() => reserveAt(at(0, 19, 0))} /> : null}
            <Chip label="Tomorrow, usual time" onPress={() => reserveAt(at(1, uh, um))} />
            <Chip label="Tomorrow evening" onPress={() => reserveAt(at(1, 19, 0))} />
          </View>
        </>) : null}

        {paused ? <Txt variant="meta" dim>Paused since {fdate(t.pausedAt!)}. The clock is stopped. When you resume, the deadline moves by the time you were away.</Txt> : null}

        <View style={{ gap: S.s2 }}>
          {t.place ? line('Where', t.place) : null}
          {t.ifthen ? line('Backup', t.ifthen) : null}
          {t.cue ? line('Cue', t.cue) : null}
          {t.done && t.doneAt ? line('Finished', fshort(t.doneAt)) : null}
        </View>

        {/* Breaking work into small parts is one of the best-supported ways to start (and to plan time realistically). */}
        <Subtasks t={t} />

        <Diary t={t} writeSignal={write} />
      </ScrollView>

      {/* Fixed action bar. */}
      <View style={{ height: 72, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: p.line, paddingHorizontal: '2%' }}>
        {t.done
          ? act('restore', 'Restore', <UndoIcon color={p.ink} />, () => updateTask(t.id, x => ({ ...x, done: false, letGo: false, doneAt: undefined })))
          : act('done', 'Done', <CheckIcon color={p.ink} />, complete)}
        {!t.done ? (paused
          ? act('resume', 'Resume', <PlayIcon color={p.ink} />, () => {
            const away = Date.now() - (t.pausedAt ?? Date.now());
            updateTask(t.id, x => ({ ...x, pausedAt: null, deadline: x.deadline + away, start: x.start + away }));
            toast(`Welcome back. Deadline moved to ${fdate(t.deadline + away)}.`);
          })
          : act('pause', 'Pause', <PauseIcon color={p.ink} />, () => { updateTask(t.id, x => ({ ...x, pausedAt: Date.now() })); toast('Paused. The clock is stopped.'); })) : null}
        {act('notes', 'Note', <NotesIcon color={p.ink} />, () => setWrite(w => w + 1))}
        {act('edit', 'Edit', <EditIcon color={p.ink} />, () => router.push({ pathname: '/new-task', params: { edit: t.id } }))}
        {act('delete', 'Delete', <TrashIcon color={p.redInk} />, () => { router.back(); del(t); }, true)}
      </View>

    </SafeAreaView>
  );
}
