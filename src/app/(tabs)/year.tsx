// Year: focus + context (after DateLens, Bederson et al. 2003). One month is drawn large, with day cells big enough
// to tap (~50dp; Parhi, Karlson & Bederson 2006 found ~9mm targets needed for thumbs), and the whole year sits
// below as an overview that stays in place. Tapping a day opens its page (its tasks); pressing and holding opens
// that day's timeline. A day carries one mark: a circle in the status colour of its most urgent task.
// Every block has a fixed size (the month is always six rows), so nothing shifts as months or content change.
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import { Glass } from '../../components/Glass';
import { ChevronIcon } from '../../components/icons';
import { GAP } from '../../components/LifeGrid';
import { Enter } from '../../components/Motion';
import { Txt, haptic } from '../../components/ui';
import { MONTHS, yearCells } from '../../lib/calendar';
import { useStore } from '../../lib/store';
import { addYears, parseBirth, ymd } from '../../lib/time';
import { F, R, S, statusColor, usePalette } from '../../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
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

  const inner = (width - S.page * 2);
  const cells = useMemo(() => yearCells(state, year), [state.tasks, state.events, year]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayKey = ymd(now);
  const openDay = (key: string) => { haptic.tick(); router.push({ pathname: '/day', params: { date: key } }); };
  const openTimeline = (key: string) => { haptic.ok(); router.push({ pathname: '/hours', params: { date: key } }); };

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

  // The focused month: 7 columns straight on the page, always six rows tall. No boxes: a number, and under it a
  // circle in the colour of the day's most urgent task. Only today is outlined.
  const PAD = S.s2, cell = inner / 7;
  const first = new Date(year, month, 1), lead = (first.getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
  const big = [];
  for (let d = 1; d <= days; d++) {
    const k = lead + d - 1, x = (k % 7) * cell, y = Math.floor(k / 7) * cell;
    const key = ymd(new Date(year, month, d)), c = cells.get(key), today = key === todayKey;
    const mark = c?.urgent ? statusColor(p, c.urgent) : undefined;
    big.push(
      <Pressable key={d} accessibilityRole="button"
        accessibilityLabel={`${d} ${MONTHS[month]}${today ? ', today' : ''}${c?.urgent ? `, ${c.urgent === 'red' ? 'act now' : c.urgent === 'amber' ? 'pay attention' : 'on track'}` : ''}${c?.event ? ', important date' : ''}`}
        accessibilityHint="Opens the day. Press and hold for its timeline."
        onPress={() => openDay(key)} onLongPress={() => openTimeline(key)} delayLongPress={380}
        style={({ pressed }) => ({ position: 'absolute', left: x + 2, top: y + 2, width: cell - 4, height: cell - 4, alignItems: 'center', justifyContent: 'center',
          borderWidth: today ? 1.5 : 0, borderColor: p.ink, borderRadius: R.sm - 4, transform: [{ scale: pressed ? 0.9 : 1 }] })}>
        <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 17, lineHeight: 20 }}>{d}</Txt>
        <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 4, backgroundColor: mark ?? 'transparent', borderWidth: !mark && c?.event ? 1.5 : 0, borderColor: c?.event }} />
      </Pressable>,
    );
  }

  // The year at a glance: 12 small months, 4 across and 3 down, about the size of the month above. Tap one to
  // focus it. Each day is a square box the same size as a week box on the life grid (width / 52 − GAP).
  // 2 spare points for the card's hairline border and rounding, so four always fit on one row.
  const COLS = 4, mg = S.s4, mw = (inner - PAD * 2 - 2 - mg * (COLS - 1)) / COLS, u = mw / 7;
  const box = inner / 52 - GAP, off = (u - box) / 2;
  const mini = (m: number) => {
    const f = new Date(year, m, 1), ld = (f.getDay() + 6) % 7, n = new Date(year, m + 1, 0).getDate(), items = [];
    for (let d = 1; d <= n; d++) {
      const k = ld + d - 1, key = ymd(new Date(year, m, d)), c = cells.get(key);
      const x = (k % 7) * u + off, y = Math.floor(k / 7) * u + off;
      // Every day the same box; a day with a task takes its most urgent status colour, an important date its own.
      // Plain days use `line`: `ahead` (the life grid's colour on the page) all but vanishes on the glass card.
      items.push(<Rect key={d} x={x} y={y} width={box} height={box} fill={c?.urgent ? statusColor(p, c.urgent) : c?.event ?? p.line} />);
      if (key === todayKey) items.push(<Rect key="today" x={x - 1} y={y - 1} width={box + 2} height={box + 2} fill="none" stroke={p.ink} strokeWidth={1} />);
    }
    const on = m === month;
    return (
      <Pressable key={m} accessibilityRole="button" accessibilityLabel={`${MONTHS[m]} ${year}`} accessibilityState={{ selected: on }}
        onPress={() => focus(year, m)} hitSlop={4} style={{ width: mw }}>
        <Txt variant="label" style={{ fontSize: 11, letterSpacing: 1, marginBottom: 3 }} color={on ? p.ink : p.dim}>{MONTHS[m].slice(0, 3)}</Txt>
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s4, paddingBottom: 120 }}>
        {/* Month and year, fixed height; the year in the app's dot numerals. */}
        <View style={{ height: 64, flexDirection: 'row', alignItems: 'center' }}>
          {arrow(-1)}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="h2" numberOfLines={1}>{MONTHS[month]}</Txt>
            <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 22, lineHeight: 26 }} color={p.dim}>{year}</Txt>
          </View>
          {arrow(1)}
        </View>

        {/* Focus: the month, large, always six rows, straight on the page. Swipe sideways to change month. */}
        <View style={{ marginTop: S.s5 }} {...swipe.panHandlers}>
          <View style={{ height: 24, flexDirection: 'row' }}>
            {WEEKDAYS.map((w, i) => <Txt key={i} variant="small" dim allowFontScaling={false} style={{ width: cell, textAlign: 'center', fontFamily: F.uiSemi }}>{w}</Txt>)}
          </View>
          <Enter id={`${year}-${month}`} from={{ x: dir * 24 }} duration={220} style={{ height: 6 * cell }}>{big}</Enter>
        </View>

        {/* Context: the whole year on glass, fixed size (every small month is six rows), 48 below the month. */}
        <Txt variant="label" dim style={{ marginTop: S.s7, marginBottom: S.s3 }}>{year} at a glance</Txt>
        <Glass style={{ padding: PAD, flexDirection: 'row', flexWrap: 'wrap', columnGap: mg, rowGap: S.s4 }}>
          {Array.from({ length: 12 }, (_, m) => mini(m))}
        </Glass>
      </ScrollView>

    </SafeAreaView>
  );
}
