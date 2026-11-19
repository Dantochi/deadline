import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { onBriefClosed } from '../../components/DailyBrief';
import { SlidersIcon } from '../../components/icons';
import { LifeGrid } from '../../components/LifeGrid';
import { Enter } from '../../components/Motion';
import { RollingNumber } from '../../components/RollingNumber';
import { GlassSegment } from '../../components/Glass';
import { StatusDot, Txt } from '../../components/ui';
import { eventsInWeek } from '../../lib/events';
import { activeTasks, useStore } from '../../lib/store';
import { DAY, YEAR, addYears, fdate, fmt, fshort, info, leftShort, parseBirth, weekEnd, weekNow, weekStart } from '../../lib/time';
import { F, S, usePalette } from '../../theme';

type Unit = 'weeks' | 'months' | 'years';
const SHORT = { W: 'weeks', M: 'months', Y: 'years' } as const;
type Short = keyof typeof SHORT;

export default function Life() {
  const { state } = useStore();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const [unit, setUnit] = useState<Unit>('weeks');
  const [sel, setSel] = useState<number | null>(null);
  // The grid's blur-fade entrance plays on every visit: when this tab is opened, when the daily summary closes,
  // and when the app comes back to the front while Life is showing.
  const [play, setPlay] = useState(0);
  const [focused, setFocused] = useState(false);
  const replay = useCallback(() => setPlay(n => n + 1), []);
  useFocusEffect(useCallback(() => { setFocused(true); replay(); return () => setFocused(false); }, [replay]));
  useEffect(() => onBriefClosed(replay), [replay]);
  useEffect(() => {
    if (!focused) return;
    const sub = AppState.addEventListener('change', a => { if (a === 'active') replay(); });
    return () => sub.remove();
  }, [focused, replay]);
  const birth = parseBirth(state.birth);
  const wNow = weekNow(birth, state.life);

  useEffect(() => { if (sel == null) return; const t = setTimeout(() => setSel(null), 8000); return () => clearTimeout(t); }, [sel]);

  const left = useMemo(() => {
    const now = Date.now(), end = +addYears(birth, state.life);
    if (unit === 'weeks') return state.life * 52 - wNow;
    if (unit === 'years') return Math.max(0, Math.floor((end - now) / YEAR));
    return Math.max(0, Math.floor((end - now) / (YEAR / 12)));
  }, [unit, state.birth, state.life, wNow]);

  const today = new Date(), bday = birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
  const next = activeTasks(state)[0];

  const detail = sel != null ? (() => {
    const s = weekStart(birth, sel), e = weekEnd(birth, sel), age = Math.floor((s - +birth) / YEAR);
    const head = sel === wNow ? 'This week' : e <= Date.now() ? 'Lived' : `In ${fmt(sel - wNow)} weeks`;
    const hit = activeTasks(state).find(t => Math.max(t.start, Date.now()) < e && t.deadline > s);
    return { line: `${head} · age ${age} · ${fshort(s)} – ${fdate(e - DAY)}`, hit, events: eventsInWeek(state, sel) };
  })() : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      {/* The gutter sits on an inner View: percentage padding on SafeAreaView is dropped on Android. */}
      <View style={{ flex: 1, paddingHorizontal: S.page }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <SlidersIcon color={p.dim} />
        </Pressable>
      </View>

      {/* From the top, with the space left over below the grid: pinned to the bottom, the number floated low on tall
          phones under an empty third of the screen. */}
      <View style={{ flex: 1, justifyContent: 'flex-start', paddingTop: S.s5 }}>
        {bday ? <Txt variant="label" dim>Happy birthday. A new row begins.</Txt> : null}
        {/* The number alone; the unit switch under it says what it counts (and the label says it to screen readers). */}
        <RollingNumber value={left} fontSize={120} color={p.ink} accessibilityLabel={`${fmt(left)} ${unit} left until ${state.life}`} />
        <GlassSegment<Short> options={['W', 'M', 'Y']} value={(unit[0].toUpperCase() as Short)} onChange={k => setUnit(SHORT[k])}
          labels={{ W: 'Weeks', M: 'Months', Y: 'Years' }} style={{ width: 150, marginTop: S.s2, marginBottom: S.s5 }} />
        {state.showGrid ? <LifeGrid state={state} maxHeight={height * 0.5} selected={sel} onSelect={setSel} play={play} /> : null}
      </View>

      <View style={{ height: 52, justifyContent: 'center', marginTop: S.s3 }} accessibilityLiveRegion="polite">
        {detail ? (
          <Enter id={sel ?? -1} from={{ y: 4 }} duration={160}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <Txt variant="meta" style={{ fontFamily: F.uiSemi, flex: 1 }} numberOfLines={1}>{detail.line}</Txt>
              <Pressable accessibilityRole="button" accessibilityLabel="Mark this week as an important date" hitSlop={12}
                onPress={() => router.push({ pathname: '/events', params: { week: String(sel) } })}>
                <Txt variant="meta" style={{ fontFamily: F.uiSemi }}>+ Mark</Txt>
              </Pressable>
            </View>
            {detail.events.length ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: detail.events[0].color }} />
                <Txt variant="meta" dim numberOfLines={1}>{detail.events.map(e => e.title).join(' · ')}</Txt>
              </View>
            ) : detail.hit ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><StatusDot st={info(detail.hit).st} shapes={state.shapes} size={8} /><Txt variant="meta" dim numberOfLines={1}>{detail.hit.title}</Txt></View> : null}
          </Enter>
        ) : !state.showGrid && next ? (
          <Txt variant="meta" dim numberOfLines={2}>Next deadline · {next.title} · {leftShort(info(next).left)}</Txt>
        ) : null}
      </View>

      </View>
    </SafeAreaView>
  );
}
