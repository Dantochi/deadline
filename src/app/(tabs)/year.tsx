// Year: focus + context (after DateLens, Bederson et al. 2003). One month is drawn large, with day cells big enough
// to tap (~50dp; Parhi, Karlson & Bederson 2006 found ~9mm targets needed for thumbs), and the whole year sits
// below as an overview that stays in place. Tapping a day opens its page (tasks, sessions, important dates).
// Every block has a fixed size (the month is always six rows), so nothing shifts as months or content change.
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { ChevronIcon, CloseIcon } from '../../components/icons';
import { Enter } from '../../components/Motion';
import { Txt, haptic } from '../../components/ui';
import { MONTHS, yearCells, type DayCell } from '../../lib/calendar';
import { usePartner } from '../../lib/partner';
import { reviewDue, weekKey, weekReview } from '../../lib/review';
import { activeTasks, useStore } from '../../lib/store';
import { addYears, info, nextSlot, parseBirth, slotLabel, ymd } from '../../lib/time';
import { F, R, S, usePalette, type Palette } from '../../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const STRIP = 72;

/** How a day looks, shared by the large month and the overview. */
function dayLook(p: Palette, c: DayCell | undefined, past: boolean) {
  // Days already lived are muted, as on the life grid, so 'now' stays readable inside a long task.
  if (c?.fill) return { fill: c.strong ? c.fill : `${c.fill}${past ? '3A' : '70'}`, text: c.strong ? p.bg : past ? p.dim : p.ink };
  return { fill: past ? p.lived : p.ahead, text: past ? p.dim : p.ink };
}

/** One fixed-height strip under the month title: the weekly review when due, a partner request, or today. */
function TodayStrip() {
  const { state, update } = useStore();
  const P = usePartner();
  const p = usePalette();
  const box = { height: STRIP, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: p.raise, borderRadius: R.lg };
  const line = (title: string, sub: string, onPress: () => void, onDismiss?: () => void) => (
    <View style={box}>
      <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); onPress(); }} style={{ flex: 1, height: STRIP, paddingHorizontal: S.s4, justifyContent: 'center', gap: 2 }}>
        <Txt numberOfLines={1} style={{ fontFamily: F.uiBold }}>{title}</Txt>
        <Txt numberOfLines={1} variant="meta" dim>{sub}</Txt>
      </Pressable>
      {onDismiss ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={onDismiss} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: S.s1 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      ) : null}
    </View>
  );
  if (reviewDue(state)) {
    const r = weekReview(state);
    return line('Your week is ready', `${r.finished.length} finished · ${r.needYou.length} ${r.needYou.length === 1 ? 'needs' : 'need'} you · ${r.sessions} sessions`,
      () => router.push('/review'), () => update(s => ({ ...s, reviewSeen: weekKey() })));
  }
  const req = P.incoming[0];
  if (req) return line('Partner request', `${req.fromName || `@${req.fromUsername}`} wants you as their accountability partner`, () => router.push('/partner'));
  const act = activeTasks(state), need = act.filter(t => info(t).st === 'red' || info(t).left < 0).length;
  const next = act.map(t => ({ t, n: nextSlot(t) })).filter(x => x.n).sort((a, b) => a.n! - b.n!)[0];
  return line('Today', act.length
    ? `${need ? `${need} ${need === 1 ? 'needs' : 'need'} you` : 'All on track'}${next ? ` · ${slotLabel(next.n!)} ${next.t.title}` : ''}`
    : 'No deadlines yet. Tap to add one.', () => router.push('/day'));
}

export default function Year() {
  const { state } = useStore();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const now = new Date(), thisYear = now.getFullYear();
  const birth = parseBirth(state.birth);
  const minY = birth.getFullYear(), maxY = addYears(birth, state.life).getFullYear();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(now.getMonth());
  const [dir, setDir] = useState(0); // which way the month moved, so it slides in from that side

  const inner = width * 0.91;
  const cells = useMemo(() => yearCells(state, p, year), [state.tasks, state.events, p, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayKey = ymd(now);
  const openDay = (key: string) => { haptic.tick(); router.push({ pathname: '/day', params: { date: key } }); };

  const focus = (y: number, m: number) => {
    let ny = y, nm = m;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    if (ny < minY || ny > maxY) return;
    haptic.tick(); setDir(ny * 12 + nm > year * 12 + month ? 1 : -1); setYear(ny); setMonth(nm);
  };
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const yearRef = useRef(year), monthRef = useRef(month);
  yearRef.current = year; monthRef.current = month;
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 50) focusRef.current(yearRef.current, monthRef.current + (g.dx < 0 ? 1 : -1)); },
  })).current;

  // The focused month: 7 columns across the full width, always six rows tall. Square cells, numbers inside.
  const cell = inner / 7, gap = 3, box = cell - gap;
  const first = new Date(year, month, 1), lead = (first.getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
  const big = [];
  for (let d = 1; d <= days; d++) {
    const k = lead + d - 1, x = (k % 7) * cell, y = Math.floor(k / 7) * cell;
    const key = ymd(new Date(year, month, d)), c = cells.get(key), look = dayLook(p, c, key < todayKey), today = key === todayKey;
    big.push(
      <Pressable key={d} accessibilityRole="button"
        accessibilityLabel={`${d} ${MONTHS[month]}${today ? ', today' : ''}${c?.fill ? (c.strong ? ', deadline or important date' : ', task running') : ''}${c?.session ? ', session reserved' : ''}`}
        onPress={() => openDay(key)}
        style={({ pressed }) => ({ position: 'absolute', left: x, top: y, width: box, height: box, backgroundColor: look.fill,
          borderWidth: today ? 2 : 0, borderColor: p.ink, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        <Txt allowFontScaling={false} style={{ fontFamily: today || c?.strong ? F.uiBold : F.uiMedium, fontSize: 15, lineHeight: 18 }} color={look.text}>{d}</Txt>
        <View style={{ width: 5, height: 5, marginTop: 3, backgroundColor: c?.session && key >= todayKey ? look.text : 'transparent' }} />
      </Pressable>,
    );
  }

  // The year at a glance: 12 small months, 6 across. Tap one to focus it.
  const COLS = 6, mg = 8, mw = (inner - mg * (COLS - 1)) / COLS, u = mw / 7, mbox = u - 1;
  const mini = (m: number) => {
    const f = new Date(year, m, 1), ld = (f.getDay() + 6) % 7, n = new Date(year, m + 1, 0).getDate(), items = [];
    for (let d = 1; d <= n; d++) {
      const k = ld + d - 1, key = ymd(new Date(year, m, d)), look = dayLook(p, cells.get(key), key < todayKey);
      items.push(<Rect key={d} x={(k % 7) * u} y={Math.floor(k / 7) * u} width={mbox} height={mbox} fill={key === todayKey ? p.ink : look.fill} />);
      if (cells.get(key)?.session && key > todayKey) items.push(<Circle key={`s${d}`} cx={(k % 7) * u + mbox / 2} cy={Math.floor(k / 7) * u + mbox / 2} r={Math.max(0.8, mbox * 0.16)} fill={p.ink} />);
    }
    const on = m === month;
    return (
      <Pressable key={m} accessibilityRole="button" accessibilityLabel={`${MONTHS[m]} ${year}`} accessibilityState={{ selected: on }}
        onPress={() => focus(year, m)} hitSlop={4} style={{ width: mw }}>
        <Txt variant="label" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 3 }} color={on ? p.ink : p.dim}>{MONTHS[m].slice(0, 3)}</Txt>
        <Svg width={mw} height={6 * u}>{items}</Svg>
        <View style={{ height: 2, marginTop: 3, backgroundColor: on ? p.ink : 'transparent' }} />
      </Pressable>
    );
  };

  const arrow = (dir: -1 | 1) => {
    const disabled = dir < 0 ? year <= minY && month === 0 : year >= maxY && month === 11;
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous month' : 'Next month'} disabled={disabled}
        onPress={() => focus(year, month + dir)}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.3 : 1, marginHorizontal: -12 }}>
        <ChevronIcon left={dir < 0} color={p.ink} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s4, paddingBottom: 120 }}>
        {/* Month and year, fixed height; the year in the app's dot numerals. */}
        <View style={{ height: 64, flexDirection: 'row', alignItems: 'center' }}>
          {arrow(-1)}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="h2" numberOfLines={1}>{MONTHS[month]}</Txt>
            <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 22, lineHeight: 26 }} color={p.dim}>{year}</Txt>
          </View>
          {arrow(1)}
        </View>

        <View style={{ marginTop: S.s2, marginBottom: S.s4 }}><TodayStrip /></View>

        {/* Focus: the month, large, always six rows. Swipe sideways to change month. */}
        <View {...swipe.panHandlers}>
          <View style={{ height: 24, flexDirection: 'row' }}>
            {WEEKDAYS.map((w, i) => <Txt key={i} variant="small" dim allowFontScaling={false} style={{ width: cell, textAlign: 'center', fontFamily: F.uiSemi }}>{w}</Txt>)}
          </View>
          <Enter id={`${year}-${month}`} from={{ x: dir * 24 }} duration={220} style={{ height: 6 * cell }}>{big}</Enter>
        </View>

        {/* Context: the whole year, fixed size (every small month is six rows). */}
        <Txt variant="label" dim style={{ marginTop: S.s5, marginBottom: S.s2 }}>{year} at a glance</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: mg, rowGap: S.s3 }}>
          {Array.from({ length: 12 }, (_, m) => mini(m))}
        </View>
        <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', columnGap: S.s4, marginTop: S.s4 }}>
          {[['Running', `${p.green}70`], ['Due or date', p.green]].map(([l, c]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: c }} /><Txt variant="small" dim>{l}</Txt>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, backgroundColor: p.ahead, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 4, height: 4, backgroundColor: p.ink }} /></View>
            <Txt variant="small" dim>Session</Txt>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
