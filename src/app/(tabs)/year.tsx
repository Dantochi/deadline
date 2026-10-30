// Year: twelve months, every day a box. Task days take the task's colour (tinted while it runs, full on the
// deadline), important dates their own colour, and a dot marks a reserved session. Tap a day to see what's on it.
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Rect } from 'react-native-svg';
import { ChevronIcon } from '../../components/icons';
import { Btn, Txt, haptic } from '../../components/ui';
import { MONTHS, dayDetail, taskColor, yearCells } from '../../lib/calendar';
import { useStore } from '../../lib/store';
import { addYears, info, leftShort, pad, parseBirth, ymd } from '../../lib/time';
import { F, R, S, usePalette } from '../../theme';

const COLS = 3, GAP_M = 12;

export default function Year() {
  const { state } = useStore();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const thisYear = new Date().getFullYear();
  const birth = parseBirth(state.birth);
  const minY = birth.getFullYear(), maxY = addYears(birth, state.life).getFullYear();
  const [year, setYear] = useState(thisYear);
  const [sel, setSel] = useState<number>(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return +d; });

  const inner = width * 0.91;
  const mw = (inner - GAP_M * (COLS - 1)) / COLS, u = mw / 7, box = u - 2.5;
  const cells = useMemo(() => yearCells(state, p, year), [state, p, year]);
  const todayKey = ymd(new Date()), selKey = ymd(new Date(sel));
  const detail = useMemo(() => dayDetail(state, sel), [state, sel]);

  const go = (y: number) => {
    const ny = Math.max(minY, Math.min(maxY, y));
    haptic.tick(); setYear(ny);
    const d = new Date(sel); d.setFullYear(ny); setSel(+d);
  };

  const month = (m: number) => {
    const first = new Date(year, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(year, m + 1, 0).getDate();
    const rows = 6, h = rows * u;
    const items = [];
    for (let d = 1; d <= days; d++) {
      const k = lead + d - 1, x = (k % 7) * u, y = Math.floor(k / 7) * u;
      const date = new Date(year, m, d), key = ymd(date), c = cells.get(key);
      const past = key < todayKey;
      const fill = c?.fill ? (c.strong ? c.fill : `${c.fill}70`) : past ? p.lived : p.ahead;
      items.push(<Rect key={`r${d}`} x={x} y={y} width={box} height={box} rx={box * 0.22} fill={fill} />);
      if (c?.session && !past) items.push(<Circle key={`s${d}`} cx={x + box / 2} cy={y + box / 2} r={Math.max(1.5, box * 0.13)} fill={p.ink} />);
      if (key === todayKey || key === selKey) {
        items.push(<Rect key={`o${d}`} x={x + 0.75} y={y + 0.75} width={box - 1.5} height={box - 1.5} rx={box * 0.22}
          fill="none" stroke={key === selKey ? p.ink : p.dim} strokeWidth={1.5} />);
      }
    }
    const tap = (lx: number, ly: number) => {
      const k = Math.floor(ly / u) * 7 + Math.floor(lx / u), d = k - lead + 1;
      if (d < 1 || d > days) return;
      haptic.tick(); setSel(+new Date(year, m, d, 12));
    };
    return (
      <View key={m} style={{ width: mw }}>
        <Txt variant="label" style={{ marginBottom: S.s1 }} color={year === thisYear && m === new Date().getMonth() ? p.ink : p.dim}>{MONTHS[m].slice(0, 3)}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel={`${MONTHS[m]} ${year}`} onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
          <Svg width={mw} height={h}>{items}</Svg>
        </Pressable>
      </View>
    );
  };

  const selDate = new Date(sel);
  const nothing = !detail.tasks.length && !detail.sessions.length && !detail.events.length;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ paddingHorizontal: '4.5%', paddingTop: S.s5, gap: S.s3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous year" disabled={year <= minY} onPress={() => go(year - 1)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: -12, opacity: year <= minY ? 0.3 : 1 }}>
            <ChevronIcon left color={p.ink} />
          </Pressable>
          <Txt accessibilityRole="header" style={{ fontFamily: F.dot, fontSize: 40, lineHeight: 44, flex: 1, textAlign: 'center' }}>{year}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Next year" disabled={year >= maxY} onPress={() => go(year + 1)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12, opacity: year >= maxY ? 0.3 : 1 }}>
            <ChevronIcon color={p.ink} />
          </Pressable>
        </View>

        {/* What's on the selected day. */}
        <View style={{ minHeight: 76, padding: S.s3, borderRadius: R.lg, backgroundColor: p.raise, gap: 4 }} accessibilityLiveRegion="polite">
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt style={{ fontFamily: F.uiSemi, flex: 1 }}>{selDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Mark this day as an important date" hitSlop={12}
              onPress={() => router.push({ pathname: '/events', params: { date: ymd(selDate) } })}>
              <Txt variant="meta" style={{ fontFamily: F.uiSemi }}>+ Mark</Txt>
            </Pressable>
          </View>
          {detail.events.map(ev => (
            <View key={ev.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: ev.color }} /><Txt variant="meta" numberOfLines={1}>{ev.title}</Txt>
            </View>
          ))}
          {detail.sessions.map(({ t, n }) => {
            const d = new Date(n!);
            return <Txt key={`s${t.id}`} variant="meta" numberOfLines={1}>{pad(d.getHours())}:{pad(d.getMinutes())} reserved · {t.title}</Txt>;
          })}
          {detail.tasks.map(({ t, due }) => (
            <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: taskColor(p, t) }} />
              <Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt>
              <Txt variant="small" dim>{t.done ? 'Done' : due ? 'Due' : leftShort(info(t).left)}</Txt>
            </View>
          ))}
          {nothing ? <Txt variant="meta" dim>Nothing on this day.</Txt> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s4, paddingBottom: S.s7 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP_M, rowGap: S.s4 }}>
          {Array.from({ length: 12 }, (_, m) => month(m))}
        </View>
        <Txt variant="small" dim style={{ marginTop: S.s5 }}>
          Tinted: a task is running · Full colour: its deadline, or an important date · Dot: a reserved session. Pick a task's colour when you open it on the Tasks tab.
        </Txt>
        {year !== thisYear ? <Btn style={{ marginTop: S.s4 }} label={`Back to ${thisYear}`} onPress={() => { go(thisYear); const d = new Date(); d.setHours(12, 0, 0, 0); setSel(+d); }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
