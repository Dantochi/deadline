// Year: focus + context (after DateLens, Bederson et al. 2003). One month is drawn large, with day cells big enough
// to tap (~50dp; Parhi, Karlson & Bederson 2006 found ~9mm targets needed for thumbs), and the whole year sits
// below as an overview that stays in place. Task days take the task's colour (tinted while it runs, full on the
// deadline), important dates their own colour, and a dot marks a reserved session.
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { ChevronIcon } from '../../components/icons';
import { Txt, haptic } from '../../components/ui';
import { MONTHS, dayDetail, taskColor, yearCells, type DayCell } from '../../lib/calendar';
import { useStore } from '../../lib/store';
import { addYears, info, leftShort, pad, parseBirth, ymd } from '../../lib/time';
import { F, R, S, usePalette, type Palette } from '../../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const noon = (y: number, m: number, d: number) => +new Date(y, m, d, 12);

/** How a day looks, shared by the large month and the overview. */
function dayLook(p: Palette, c: DayCell | undefined, past: boolean) {
  // Days already lived are muted, as on the life grid, so 'now' stays readable inside a long task.
  if (c?.fill) return { fill: c.strong ? c.fill : `${c.fill}${past ? '3A' : '70'}`, text: c.strong ? p.bg : past ? p.dim : p.ink };
  return { fill: past ? p.lived : p.ahead, text: past ? p.dim : p.ink };
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
  const [sel, setSel] = useState(() => noon(thisYear, now.getMonth(), now.getDate()));

  const inner = width * 0.91;
  const cells = useMemo(() => yearCells(state, p, year), [state, p, year]);
  const todayKey = ymd(now), selKey = ymd(new Date(sel));
  const detail = useMemo(() => dayDetail(state, sel), [state, sel]);

  const focus = (y: number, m: number) => {
    let ny = y, nm = m;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    if (ny < minY || ny > maxY) return;
    haptic.tick();
    setYear(ny); setMonth(nm);
    setSel(ny === thisYear && nm === now.getMonth() ? noon(ny, nm, now.getDate()) : noon(ny, nm, 1));
  };
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 50) focusRef.current(yearRef.current, monthRef.current + (g.dx < 0 ? 1 : -1)); },
  })).current;
  const yearRef = useRef(year), monthRef = useRef(month);
  yearRef.current = year; monthRef.current = month;

  // The focused month: 7 columns across the full width, day numbers inside.
  const cell = inner / 7, gap = 4, box = cell - gap;
  const first = new Date(year, month, 1), lead = (first.getDay() + 6) % 7, days = new Date(year, month + 1, 0).getDate();
  const big = [];
  for (let d = 1; d <= days; d++) {
    const k = lead + d - 1, x = (k % 7) * cell, y = Math.floor(k / 7) * cell;
    const key = ymd(new Date(year, month, d)), c = cells.get(key), look = dayLook(p, c, key < todayKey);
    const selected = key === selKey, today = key === todayKey;
    big.push(
      <Pressable key={d} accessibilityRole="button" accessibilityState={{ selected }}
        accessibilityLabel={`${d} ${MONTHS[month]}${c?.fill ? (c.strong ? ', deadline or important date' : ', task running') : ''}${c?.session ? ', session reserved' : ''}`}
        onPress={() => { haptic.tick(); setSel(noon(year, month, d)); }}
        style={{ position: 'absolute', left: x, top: y, width: box, height: box, borderRadius: R.sm, backgroundColor: look.fill,
          borderWidth: selected || today ? 2 : 0, borderColor: selected ? p.ink : p.dim, alignItems: 'center', justifyContent: 'center' }}>
        <Txt allowFontScaling={false} style={{ fontFamily: today || c?.strong ? F.uiBold : F.uiMedium, fontSize: 15, lineHeight: 18 }} color={look.text}>{d}</Txt>
        {c?.session && key >= todayKey ? <View style={{ width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: look.text }} /> : null}
      </Pressable>,
    );
  }
  const bigRows = Math.ceil((lead + days) / 7);

  // The year at a glance: 12 small months, 6 across. Tap one to focus it.
  const COLS = 6, mg = 8, mw = (inner - mg * (COLS - 1)) / COLS, u = mw / 7, mbox = u - 1.2;
  const mini = (m: number) => {
    const f = new Date(year, m, 1), ld = (f.getDay() + 6) % 7, n = new Date(year, m + 1, 0).getDate(), items = [];
    for (let d = 1; d <= n; d++) {
      const k = ld + d - 1, key = ymd(new Date(year, m, d)), look = dayLook(p, cells.get(key), key < todayKey);
      items.push(<Rect key={d} x={(k % 7) * u} y={Math.floor(k / 7) * u} width={mbox} height={mbox} rx={mbox * 0.25} fill={key === todayKey ? p.ink : look.fill} />);
      if (cells.get(key)?.session && key >= todayKey && key !== todayKey) items.push(<Circle key={`s${d}`} cx={(k % 7) * u + mbox / 2} cy={Math.floor(k / 7) * u + mbox / 2} r={Math.max(0.8, mbox * 0.16)} fill={p.ink} />);
    }
    const on = m === month;
    return (
      <Pressable key={m} accessibilityRole="button" accessibilityLabel={`${MONTHS[m]} ${year}`} accessibilityState={{ selected: on }}
        onPress={() => focus(year, m)} hitSlop={4} style={{ width: mw }}>
        <Txt variant="label" style={{ fontSize: 10, letterSpacing: 1, marginBottom: 3 }} color={on ? p.ink : p.dim}>{MONTHS[m].slice(0, 3)}</Txt>
        <Svg width={mw} height={6 * u}>{items}</Svg>
        <View style={{ height: 2, borderRadius: 1, marginTop: 3, backgroundColor: on ? p.ink : 'transparent' }} />
      </Pressable>
    );
  };

  const selDate = new Date(sel);
  const nothing = !detail.tasks.length && !detail.sessions.length && !detail.events.length;
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s5, paddingBottom: S.s7 }}>
        {/* Month and year, with the year in the app's dot numerals. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: S.s3 }}>
          {arrow(-1)}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Txt variant="h2">{MONTHS[month]}</Txt>
            <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 22, lineHeight: 26 }} color={p.dim}>{year}</Txt>
          </View>
          {arrow(1)}
        </View>

        {/* Focus: the month, large. Swipe sideways to change month. */}
        <View {...swipe.panHandlers}>
          <View style={{ flexDirection: 'row', marginBottom: S.s1 }}>
            {WEEKDAYS.map((w, i) => <Txt key={i} variant="small" dim style={{ width: cell, textAlign: 'center', fontFamily: F.uiSemi }}>{w}</Txt>)}
          </View>
          <View style={{ height: bigRows * cell }}>{big}</View>
        </View>

        {/* What's on the selected day. */}
        <View style={{ marginTop: S.s3, minHeight: 84, padding: S.s4, borderRadius: R.lg, backgroundColor: p.raise, gap: 6 }} accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt style={{ fontFamily: F.uiSemi, flex: 1 }}>{selDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Mark this day as an important date" hitSlop={12}
              onPress={() => router.push({ pathname: '/events', params: { date: selKey } })}>
              <Txt variant="meta" style={{ fontFamily: F.uiSemi }}>+ Mark</Txt>
            </Pressable>
          </View>
          {detail.events.map(ev => (
            <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: ev.color }} /><Txt variant="meta" numberOfLines={1}>{ev.title}</Txt>
            </View>
          ))}
          {detail.sessions.map(({ t, n }) => {
            const d = new Date(n!);
            return (
              <View key={`s${t.id}`} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
                <View style={{ width: 10, alignItems: 'center' }}><View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: p.ink }} /></View>
                <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{pad(d.getHours())}:{pad(d.getMinutes())} reserved · {t.title}</Txt>
              </View>
            );
          })}
          {detail.tasks.map(({ t, due }) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: taskColor(p, t) }} />
              <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt>
              <Txt variant="small" dim>{t.done ? 'Done' : due ? 'Due' : leftShort(info(t).left)}</Txt>
            </View>
          ))}
          {nothing ? <Txt variant="meta" dim>Nothing on this day.</Txt> : null}
        </View>

        {/* Context: the whole year. */}
        <Txt variant="label" dim style={{ marginTop: S.s6, marginBottom: S.s2 }}>{year} at a glance</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: mg, rowGap: S.s3 }}>
          {Array.from({ length: 12 }, (_, m) => mini(m))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: S.s4, rowGap: S.s1, marginTop: S.s5 }}>
          {[['Task running', `${p.green}70`], ['Deadline or date', p.green]].map(([l, c]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} /><Txt variant="small" dim>{l}</Txt>
            </View>
          ))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: p.ahead, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: p.ink }} /></View>
            <Txt variant="small" dim>Session reserved</Txt>
          </View>
        </View>
        <Txt variant="small" dim style={{ marginTop: S.s2 }}>Set a task's colour when you open it on the Tasks tab.</Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
