// The daily summary: the first time the app is opened each day, what today holds (sessions, deadlines, anything
// past its deadline), with the time left today counting down at the top right. Shown once a day.
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RollingNumber } from './RollingNumber';
import { Btn, DateTitle, StatusDot, Txt, haptic } from './ui';
import { briefDue, dailyBrief } from '../lib/brief';
import { toHM } from '../lib/schedule';
import { useStore, type Task } from '../lib/store';
import { hms, info, leftShort, secondsLeftToday, ymd } from '../lib/time';
import { S, T, statusColor, usePalette } from '../theme';

const hm = (ms: number) => { const d = new Date(ms); return toHM(d.getHours() * 60 + d.getMinutes()); };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function DailyBrief() {
  const { state, ready, update } = useStore();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Open on the first launch of the day, and when the app comes back to the front on a new day.
  const due = ready && briefDue(state);
  useEffect(() => {
    if (!due) return;
    setNow(new Date()); setOpen(true);
    update(s => ({ ...s, briefSeen: ymd(new Date()) }));
  }, [due, update]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') setNow(new Date()); });
    return () => sub.remove();
  }, []);

  // Tick once a second, on the second, only while the summary is showing.
  useEffect(() => {
    if (!open) return;
    let id: ReturnType<typeof setTimeout>;
    const tick = () => { const d = new Date(); setNow(d); id = setTimeout(tick, 1000 - d.getMilliseconds() + 5); };
    tick();
    return () => clearTimeout(id);
  }, [open]);

  const day = ymd(now);
  const brief = useMemo(() => dailyBrief(state, Date.now()), [state.tasks, state.events, day, open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open) return null;

  const close = () => setOpen(false);
  const go = (t: Task) => { haptic.tick(); close(); router.push({ pathname: '/task', params: { id: t.id } }); };
  const left = secondsLeftToday(now);
  const hrs = Math.floor(left / 3600), mins = Math.floor((left % 3600) / 60);
  const { sessions, due: dueToday, overdue } = brief;
  const empty = !sessions.length && !dueToday.length && !overdue.length;
  const todo = sessions.filter(b => b.state !== 'done').length;
  const summary = [sessions.length ? plural(sessions.length, 'session') : null, dueToday.length ? `${plural(dueToday.length, 'deadline')} today` : null,
    overdue.length ? `${overdue.length} past deadline` : null].filter(Boolean).join(' · ');

  const group = (label: string, color: string, children: ReactNode) => (
    <View style={{ marginTop: S.s6 }}>
      <Txt variant="label" color={color} style={{ marginBottom: S.s1 }}>{label}</Txt>
      {children}
    </View>
  );
  const row = (key: string, t: Task, lead: ReactNode, right: string | null, struck = false) => (
    <Pressable key={key} accessibilityRole="button" accessibilityHint="Opens the task" onPress={() => go(t)}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: S.s3, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.7 : 1 })}>
      {lead}
      <View style={{ width: 12, alignItems: 'center' }}><StatusDot st={info(t).st} shapes={state.shapes} /></View>
      <Txt numberOfLines={1} style={[{ flex: 1 }, struck && { color: p.dim, textDecorationLine: 'line-through' }]}>{t.title}</Txt>
      {right ? <Txt variant="meta" dim>{right}</Txt> : null}
    </Pressable>
  );

  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
        {/* The day on the left; the time left today, counting down, on the right. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: S.page, paddingTop: S.s5 }}>
          <View style={{ flex: 1 }}>
            <Txt variant="label" dim>{now.toLocaleDateString('en-GB', { weekday: 'long' })}</Txt>
            <DateTitle date={now} style={{ marginTop: S.s1 }} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="label" dim>Left today</Txt>
            <View style={{ marginTop: S.s1 }}>
              <RollingNumber value={left} text={hms(left)} fontSize={T.x2} color={p.ink}
                accessibilityLabel={`${plural(hrs, 'hour')} ${plural(mins, 'minute')} left today`} />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s6, paddingBottom: S.s6 }}>
          <Txt variant="h1">{empty ? 'A clear day' : todo ? 'Today' : 'Today, so far'}</Txt>
          <Txt dim style={{ marginTop: S.s2 }}>{empty ? 'Nothing is reserved for today.' : summary}</Txt>

          {sessions.length ? group('Sessions', p.dim, sessions.map(b => row(`${b.t.id}-${b.start}`, b.t,
            <Txt variant="num" dim={b.state !== 'planned'} style={{ width: 52 }} allowFontScaling={false}
              accessibilityLabel={`${hm(b.start)} to ${hm(b.start + b.minutes * 6e4)}`}>{hm(b.start)}</Txt>,
            b.state === 'done' ? 'Done' : b.state === 'missed' ? 'Missed' : null, b.state === 'done'))) : null}
          {dueToday.length ? group('Due today', statusColor(p, 'amber', true), dueToday.map(t => row(t.id, t, null, 'Today'))) : null}
          {overdue.length ? group('Past deadline', statusColor(p, 'red', true), overdue.map(t => row(t.id, t, null, leftShort(info(t).left)))) : null}

          {empty ? <Btn label="Plan a task" style={{ marginTop: S.s6, alignSelf: 'flex-start' }} onPress={() => { close(); router.push('/new-task'); }} /> : null}
        </ScrollView>

        <View style={{ paddingHorizontal: S.page, paddingBottom: S.s4, paddingTop: S.s2 }}>
          <Btn kind="primary" label="Start the day" onPress={close} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
