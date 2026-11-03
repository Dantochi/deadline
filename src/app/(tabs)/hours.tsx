// Day tab: one day as hours, like a calendar day view. Each reserved session is a square block at its time, as
// tall as it lasts, in the task's colour; overlapping sessions sit side by side. Deadlines and important dates sit
// in a fixed strip above the hours. Tap a block to open the task, press and hold it to change its colour (the only
// place colours are changed), and tap an empty hour to plan a session there.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorSwatches } from '../../components/ColorSwatches';
import { MicIcon } from '../../components/Voice';
import { ChevronIcon } from '../../components/icons';
import { Enter } from '../../components/Motion';
import { Txt, haptic } from '../../components/ui';
import { dayDetail, taskColor } from '../../lib/calendar';
import { columns, sessionsOn, toHM } from '../../lib/schedule';
import { useStore, type Task } from '../../lib/store';
import { DAY, addYears, pad, parseBirth, ymd } from '../../lib/time';
import { F, S, usePalette } from '../../theme';

const HOUR = 64, GUTTER = 52;
const at = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };

export default function Hours() {
  const { state, updateTask } = useStore();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ date?: string }>();
  const today = ymd(new Date());
  const [key, setKey] = useState(params.date ?? today);
  const [dir, setDir] = useState(0);
  const [colorFor, setColorFor] = useState<Task | null>(null);
  // Opened from a date page with ?date=: follow it.
  useEffect(() => { if (params.date) setKey(params.date); }, [params.date]);
  const date = at(key), isToday = key === today, past = key < today;
  const birth = parseBirth(state.birth), first = ymd(birth), last = ymd(addYears(birth, state.life));
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const blocks = useMemo(() => columns(sessionsOn(state, +date)), [state.tasks, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const detail = useMemo(() => dayDetail(state, +date), [state.tasks, state.events, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = detail.tasks.filter(x => x.due).map(x => x.t);

  // Open near now (today) or the first session, so the useful part of the day is in view.
  useEffect(() => {
    const now = new Date(), firstStart = blocks[0] ? new Date(blocks[0].b.start) : null;
    const h = isToday ? now.getHours() - 1 : firstStart ? firstStart.getHours() - 1 : 7;
    const id = setTimeout(() => scroller.current?.scrollTo({ y: Math.max(0, h) * HOUR, animated: false }), 0);
    return () => clearTimeout(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (n: number) => {
    const next = ymd(new Date(+date + n * DAY));
    if (next < first || next > last) return;
    haptic.tick(); setDir(n); setKey(next);
  };

  const inner = width * 0.91, laneW = inner - GUTTER;
  const nowMin = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      {/* Fixed header: day and arrows to the days either side. */}
      <View style={{ height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => move(-1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
          <ChevronIcon left color={p.ink} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="label" dim>{isToday ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'long' })}</Txt>
          <Txt variant="h2" numberOfLines={1}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Next day" onPress={() => move(1)} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <ChevronIcon color={p.ink} />
        </Pressable>
      </View>

      {/* All-day strip, fixed height: deadlines due and important dates. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 44, flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: '4.5%', gap: S.s2, alignItems: 'center' }}>
        {due.map(t => (
          <Pressable key={t.id} onPress={() => router.push({ pathname: '/task', params: { id: t.id } })} onLongPress={() => setColorFor(t)}
            style={{ height: 32, paddingHorizontal: S.s3, flexDirection: 'row', alignItems: 'center', gap: S.s2, backgroundColor: taskColor(p, t) }}>
            <Txt variant="small" style={{ fontFamily: F.uiBold }} color={p.bg} numberOfLines={1}>Due · {t.title}</Txt>
          </Pressable>
        ))}
        {detail.events.map(ev => (
          <View key={ev.id} style={{ height: 32, paddingHorizontal: S.s3, justifyContent: 'center', backgroundColor: ev.color }}>
            <Txt variant="small" style={{ fontFamily: F.uiBold }} color={p.bg} numberOfLines={1}>{ev.title}</Txt>
          </View>
        ))}
        {detail.steps.map(({ t, st }) => (
          <Pressable key={st.id} onPress={() => router.push({ pathname: '/task', params: { id: t.id } })}
            style={{ height: 32, paddingHorizontal: S.s3, justifyContent: 'center', borderWidth: 1, borderColor: taskColor(p, t) }}>
            <Txt variant="small" style={{ fontFamily: F.uiSemi, textDecorationLine: st.done ? 'line-through' : 'none' }} numberOfLines={1}>Step · {st.title}</Txt>
          </Pressable>
        ))}
        {!due.length && !detail.events.length && !detail.steps.length ? <Txt variant="small" dim>No deadlines or dates on this day</Txt> : null}
      </ScrollView>

      <ScrollView ref={scroller} contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s2, paddingBottom: S.s8 }}>
        <Enter id={key} from={{ x: dir * 20 }} duration={200}>
          <View style={{ height: 24 * HOUR }}>
            {/* Hours: a label and a hairline each; tapping an empty hour plans a session there. */}
            {Array.from({ length: 24 }, (_, h) => (
              <Pressable key={h} accessibilityRole="button" accessibilityLabel={`Plan a session at ${pad(h)}:00`} disabled={past}
                onPress={() => { haptic.tick(); router.push({ pathname: '/new-task', params: { on: key, time: `${pad(h)}:00` } }); }}
                style={{ position: 'absolute', top: h * HOUR, left: 0, right: 0, height: HOUR, flexDirection: 'row' }}>
                <Txt variant="small" dim allowFontScaling={false} style={{ width: GUTTER, marginTop: -8, fontVariant: ['tabular-nums'] }}>{h === 0 ? '' : `${pad(h)}:00`}</Txt>
                <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: p.line }} />
              </Pressable>
            ))}

            {/* Sessions: square blocks, height = duration. */}
            {blocks.map(({ b, col, cols }) => {
              const d = new Date(b.start), top = (d.getHours() * 60 + d.getMinutes()) * (HOUR / 60);
              const h = Math.max(28, b.minutes * (HOUR / 60)), w = laneW / cols, c = taskColor(p, b.t);
              const muted = b.state === 'missed' || b.state === 'unanswered';
              return (
                <Pressable key={`${b.t.id}${b.start}`} accessibilityRole="button"
                  accessibilityLabel={`${b.t.title}, ${toHM(d.getHours() * 60 + d.getMinutes())} for ${b.minutes} minutes${b.state === 'done' ? ', done' : b.state === 'missed' ? ', did not happen' : ''}`}
                  onPress={() => { haptic.tick(); router.push({ pathname: '/task', params: { id: b.t.id } }); }}
                  onLongPress={() => { haptic.tick(); setColorFor(b.t); }} delayLongPress={350}
                  style={({ pressed }) => ({ position: 'absolute', top, left: GUTTER + col * w + 1, width: w - 2, height: h - 2, padding: 6,
                    backgroundColor: muted ? `${c}55` : c, borderLeftWidth: 3, borderLeftColor: b.state === 'done' ? p.ink : 'transparent', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                  <Txt numberOfLines={h > 44 ? 2 : 1} style={{ fontFamily: F.uiBold, fontSize: 13, lineHeight: 16 }} color={muted ? p.ink : p.bg}>
                    {b.state === 'done' ? '✓ ' : ''}{b.t.title}
                  </Txt>
                  {h > 44 ? <Txt allowFontScaling={false} style={{ fontSize: 12, lineHeight: 16, fontFamily: F.uiMedium }} color={muted ? p.dim : p.bg}>{toHM(d.getHours() * 60 + d.getMinutes())}–{toHM(d.getHours() * 60 + d.getMinutes() + b.minutes)}</Txt> : null}
                </Pressable>
              );
            })}

            {/* Now. */}
            {nowMin >= 0 ? (
              <View pointerEvents="none" style={{ position: 'absolute', top: nowMin * (HOUR / 60) - 1, left: GUTTER - 6, right: 0, height: 2, backgroundColor: p.redInk }}>
                <View style={{ position: 'absolute', left: 0, top: -3, width: 8, height: 8, backgroundColor: p.redInk }} />
              </View>
            ) : null}
          </View>
        </Enter>
      </ScrollView>

      {/* Say a task: it lands on this day's timeline at the time you say. */}
      {!past ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Say a task"
          onPress={() => { haptic.tick(); router.push({ pathname: '/new-task', params: isToday ? { voice: '1' } : { voice: '1', on: key } }); }}
          style={({ pressed }) => ({ position: 'absolute', left: 20, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.ink, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
          <MicIcon color={p.bg} />
        </Pressable>
      ) : null}
      {!isToday ? (
        <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setDir(key > today ? -1 : 1); setKey(today); }}
          style={{ position: 'absolute', right: 20, bottom: 24, height: 44, paddingHorizontal: S.s4, justifyContent: 'center', backgroundColor: p.ink }}>
          <Txt style={{ fontFamily: F.uiBold }} color={p.bg}>Today</Txt>
        </Pressable>
      ) : null}

      {/* Colour, changed only here: press and hold a session. */}
      <Modal transparent visible={!!colorFor} animationType="fade" onRequestClose={() => setColorFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: p.scrim, justifyContent: 'flex-end' }} onPress={() => setColorFor(null)}>
          <Pressable style={{ backgroundColor: p.raise, padding: S.s5, paddingBottom: S.s7, gap: S.s3 }} onPress={() => {}}>
            <Txt variant="label" dim>Colour</Txt>
            <Txt variant="h2" numberOfLines={1}>{colorFor?.title}</Txt>
            <ColorSwatches auto value={colorFor?.color} onChange={c => { if (colorFor) updateTask(colorFor.id, x => ({ ...x, color: c })); haptic.ok(); setColorFor(null); }} />
            <Txt variant="small" dim>The first circle follows the app: light in dark mode, dark in light mode. Used on the Year calendar and here.</Txt>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
