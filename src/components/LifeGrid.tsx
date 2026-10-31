// The life grid: always weeks, 52 per row, one row per year. Rows already lived are removed unless
// "Show weeks already lived" is on; then the grid starts at birth and scrolls. The box size comes from
// the width only, so boxes never resize when units change or lived weeks are shown.
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { PixelRatio, Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { eventColorMap } from '../lib/events';
import { activeTasks, useStore, type State } from '../lib/store';
import { DAY, addYears, info, parseBirth, weekNow } from '../lib/time';
import { statusColor, usePalette, type Palette } from '../theme';

const GAP = 1.5, WEEK = 7 * DAY;
export const DECADE = 6;

export function useGridGeometry(width: number, state: State, lived = false) {
  return useMemo(() => {
    const birth = parseBirth(state.birth), wNow = weekNow(birth, state.life);
    const lr = lived ? 0 : Math.floor(wNow / 52), rows = state.life - lr;
    const u = width / 52;
    const yOf = (r: number) => r * u + (Math.floor((lr + r) / 10) - Math.floor(lr / 10)) * DECADE;
    const h = rows > 0 ? yOf(rows - 1) + u - GAP : 0;
    return { birth, wNow, lr, rows, u, yOf, h };
  }, [width, state.birth, state.life, lived]);
}

export function LifeGrid({ state, maxHeight, onSelect, selected, palette, lived: livedProp, frozen }: {
  state: State; maxHeight: number; onSelect?: (week: number) => void; selected?: number | null; palette?: Palette;
  /** Overrides the "show weeks already lived" setting (the wallpaper chooses its own). */ lived?: boolean;
  /** Show the same window the scroll view opens on, without scrolling (for the wallpaper image). */ frozen?: boolean;
}) {
  const system = usePalette(), p = palette ?? system;
  const [width, setWidth] = useState(0);
  const lived = livedProp ?? !!state.showLived;
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null), scrolled = useRef(false);
  const g = useGridGeometry(width, state, lived);
  const tasks = state.tasks, evs = state.events;
  const height = Math.min(g.h, maxHeight);

  // One <Path> per colour (each made of many rectangles) keeps the native view count tiny. Recomputed only when
  // something drawn changes (tasks, dates, palette, size, or a new day), not on every state change; the selected
  // week is drawn on top separately so tapping a week doesn't rebuild the grid.
  const dayKey = new Date().toDateString();
  const paths = useMemo(() => {
    if (!width) return [];
    const dpr = PixelRatio.get(), snap = (v: number) => Math.round(v * dpr) / dpr;
    const now = Date.now(), box = g.u - GAP;
    const overlays = activeTasks({ ...state, tasks }).map(t => {
      const st = info(t).st, rank = st === 'red' ? 0 : st === 'amber' ? 1 : 2;
      return { s: Math.max(t.start, now), e: t.deadline, color: statusColor(p, st), rank };
    }).filter(o => o.e > now);
    const byColor = new Map<string, string[]>();
    const events = eventColorMap({ ...state, tasks, events: evs });
    for (let r = 0; r < g.rows; r++) {
      // Each row is a year of life: two date calculations per row instead of two per box.
      const rowStart = +addYears(g.birth, g.lr + r), rowEnd = +addYears(g.birth, g.lr + r + 1);
      for (let c = 0; c < 52; c++) {
      const i = (g.lr + r) * 52 + c, s = rowStart + c * WEEK, e = c === 51 ? rowEnd : s + WEEK;
      let color = p.ahead;
      if (e <= now) color = p.lived;
      else if (i === g.wNow) color = p.ink;
      else {
        let best: (typeof overlays)[number] | null = null;
        for (const o of overlays) if (o.s < e && o.e > s && (!best || o.rank < best.rank)) best = o;
        if (best) color = best.color;
      }
      // Important dates sit on top of lived weeks and tasks; this week stays bright so it is always findable.
      const ev = events.get(i);
      if (ev && i !== g.wNow) color = ev;
      const x0 = snap(c * g.u), y0 = snap(g.yOf(r));
      const w = +(snap(c * g.u + box) - x0).toFixed(2), h = +(snap(g.yOf(r) + box) - y0).toFixed(2);
      let d = byColor.get(color);
      if (!d) byColor.set(color, d = []);
      d.push(`M${+x0.toFixed(2)} ${+y0.toFixed(2)}h${w}v${h}h${-w}z`);
      }
    }
    return [...byColor].map(([color, d]) => ({ color, d: d.join('') }));
  }, [width, g, tasks, evs, p, dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The tapped week, drawn over the grid.
  const selRect = useMemo(() => {
    if (!width || selected == null || selected === g.wNow) return null;
    const r = Math.floor(selected / 52) - g.lr, c = selected % 52;
    if (r < 0 || r >= g.rows) return null;
    return { x: c * g.u, y: g.yOf(r), s: g.u - GAP };
  }, [width, g, selected]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tap = (x: number, y: number) => {
    let r = 0;
    for (let k = 0; k < g.rows; k++) if (g.yOf(k) <= y + GAP) r = k;
    const c = Math.max(0, Math.min(51, Math.floor(x / g.u)));
    onSelect?.((g.lr + r) * 52 + c);
  };

  // Where the lived view opens: the row the person last scrolled to (remembered as a year of life, so it maps to
  // the same place at any box size, e.g. the wallpaper), or this year with some of the past above it.
  const { update } = useStore();
  const yAtRow = (row: number) => { const k = Math.floor(row); return g.yOf(k) + (row - k) * g.u; };
  const fallback = g.yOf(Math.floor(g.wNow / 52)) - maxHeight * 0.35;
  const openAt = Math.max(0, Math.min(g.h - maxHeight, state.gridTop != null ? yAtRow(state.gridTop) : fallback));
  const remember = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    let k = 0;
    for (let r = 0; r < g.rows; r++) if (g.yOf(r) <= y) k = r;
    const row = Math.round((k + Math.min(1, (y - g.yOf(k)) / g.u)) * 100) / 100;
    if (row !== state.gridTop) update(s => ({ ...s, gridTop: row }));
  };

  const grid = (
    <Pressable onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
      {width ? (
        <Svg width={width} height={g.h}>
          {paths.map(x => <Path key={x.color} d={x.d} fill={x.color} />)}
          {selRect ? <Rect x={selRect.x} y={selRect.y} width={selRect.s} height={selRect.s} fill={p.dim} /> : null}
        </Svg>
      ) : null}
    </Pressable>
  );

  return (
    <View onLayout={onLayout} style={{ width: '100%', height, overflow: 'hidden' }}
      accessible accessibilityRole="image"
      accessibilityLabel={`Life grid: ${g.wNow} weeks lived, ${state.life * 52 - g.wNow} of ${state.life * 52} left.`}>
      {lived && g.h > maxHeight ? (
        frozen ? <View style={{ transform: [{ translateY: -openAt }] }}>{grid}</View> : (
          <ScrollView ref={scroller} nestedScrollEnabled showsVerticalScrollIndicator={false}
            onScrollEndDrag={remember} onMomentumScrollEnd={remember}
            onContentSizeChange={() => {
              if (scrolled.current) return;
              scrolled.current = true;
              scroller.current?.scrollTo({ y: openAt, animated: false });
            }}>
            {grid}
          </ScrollView>
        )
      ) : grid}
    </View>
  );
}
