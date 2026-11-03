// A day: opened by tapping a date on the Year screen (or from a reminder). Today shows every task that needs
// handling: overdue, running, paused and done. Other days show the tasks running then, what is due, sessions
// and important dates. Rows expand for check-ins, recovery, notes, colour and done/pause.
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarIcon, ChevronIcon, CloseIcon, PlusIcon } from '../components/icons';
import { TaskFabs } from '../components/Fabs';
import { Enter } from '../components/Motion';
import { PartnerCard, TaskRow } from '../components/TaskParts';
import { Section, Txt, haptic } from '../components/ui';
import { dayDetail } from '../lib/calendar';
import { activeTasks, useStore, type Task } from '../lib/store';
import { DAY, addYears, info, pad, parseBirth, ymd } from '../lib/time';
import { BTN, F, R, S, usePalette, type Status } from '../theme';

const GROUP: Record<'red' | 'amber' | 'green', string> = { red: 'Act now', amber: 'Pay attention', green: 'On track' };
const at = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };

export default function Day() {
  const { state } = useStore();
  const p = usePalette();
  const params = useLocalSearchParams<{ date?: string; task?: string }>();
  const today = ymd(new Date());
  const [key, setKey] = useState(params.date ?? today);
  const [dir, setDir] = useState(0);
  const date = at(key), isToday = key === today, past = key < today;
  const birth = parseBirth(state.birth), first = ymd(birth), last = ymd(addYears(birth, state.life));

  const d = useMemo(() => dayDetail(state, +date), [state, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (n: number) => {
    const next = ymd(new Date(+date + n * DAY));
    if (next < first || next > last) return;
    haptic.tick(); setDir(n); setKey(next);
  };

  const row = (t: Task) => <TaskRow key={t.id} t={t} />;
  const group = (label: string, st: Status, list: Task[]) => (list.length ? <Section key={label} label={label} st={st} count={list.length}>{list.map(row)}</Section> : null);

  // Today: everything that can be acted on. Other days: what that day holds.
  let body: React.ReactNode;
  if (isToday) {
    const act = activeTasks(state), over = act.filter(t => info(t).left < 0), live = act.filter(t => info(t).left >= 0);
    const paused = state.tasks.filter(t => t.pausedAt && !t.done), done = state.tasks.filter(t => t.done);
    body = (
      <>
        {group('Past deadline', 'red', over)}
        {(['red', 'amber', 'green'] as const).map(st => group(GROUP[st], st, live.filter(t => info(t).st === st)))}
        {group('Paused', 'paused', paused)}
        {group('Done', 'done', done)}
      </>
    );
  } else {
    const due = d.tasks.filter(x => x.due).map(x => x.t), running = d.tasks.filter(x => !x.due).map(x => x.t);
    body = <>{group('Due this day', 'red', due)}{group(past ? 'Was running' : 'Running', 'green', running)}</>;
  }
  const empty = isToday ? !state.tasks.length : !d.tasks.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      {/* Fixed header: day and arrows to the days either side. */}
      <View style={{ height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => move(-1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
          <ChevronIcon left color={p.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="label" dim>{isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' })}</Txt>
          <Txt variant="h2" numberOfLines={1}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next day" onPress={() => move(1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronIcon color={p.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>

      {/* Fixed row: the same day as hours. */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingBottom: 140 }}>
        <Enter id={key} from={{ x: dir * 20 }} duration={200}>
        {/* The weekly review lives in the Year screen's strip; the partner's week shows here, on today. */}
        {isToday ? <PartnerCard /> : null}

        {d.events.length || d.sessions.length || d.steps.length ? (
          <View style={{ marginTop: S.s5, gap: S.s2 }}>
            {d.events.map(ev => (
              <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, height: 44, paddingHorizontal: S.s4, backgroundColor: p.raise, borderRadius: R.md }}>
                <View style={{ width: 12, height: 12, backgroundColor: ev.color }} />
                <Txt numberOfLines={1} style={{ flex: 1, fontFamily: F.uiSemi }}>{ev.title}</Txt>
              </View>
            ))}
            {d.steps.map(({ t, st }) => (
              <Pressable key={st.id} onPress={() => router.push({ pathname: '/task', params: { id: t.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, height: 44, paddingHorizontal: S.s4, backgroundColor: p.raise, borderRadius: R.md }}>
                <View style={{ width: 12, height: 12, borderWidth: 2, borderColor: p.dim, backgroundColor: st.done ? p.dim : 'transparent' }} />
                <Txt numberOfLines={1} variant="meta" style={{ flex: 1, textDecorationLine: st.done ? 'line-through' : 'none' }}>Step · {st.title} <Txt variant="meta" dim>({t.title})</Txt></Txt>
              </Pressable>
            ))}
            {d.sessions.map(({ t, n }) => {
              const s = new Date(n!);
              return (
                <View key={`s${t.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, height: 44, paddingHorizontal: S.s4, backgroundColor: p.raise, borderRadius: R.md }}>
                  <Txt style={{ fontFamily: F.dot, fontSize: 17, lineHeight: 20 }}>{pad(s.getHours())}:{pad(s.getMinutes())}</Txt>
                  <Txt numberOfLines={1} variant="meta" style={{ flex: 1 }}>reserved for {t.title}</Txt>
                </View>
              );
            })}
          </View>
        ) : null}

        {body}

        {empty ? (
          <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', gap: S.s2 }}>
            <Txt variant="h2">{isToday ? 'No deadlines yet' : 'A clear day'}</Txt>
            <Txt dim style={{ textAlign: 'center' }}>{isToday ? 'Give a goal an end date and it gets its own boxes.' : past ? 'Nothing was running on this day.' : 'Nothing is due or running yet.'}</Txt>
          </View>
        ) : null}

        </Enter>
      </ScrollView>

      <TaskFabs onDate={() => router.push({ pathname: '/events', params: { date: key } })}
        onTask={past ? undefined : () => router.push(isToday ? '/new-task' : { pathname: '/new-task', params: { deadline: key, on: key } })} />
    </SafeAreaView>
  );
}
