// The life grid: always weeks, 52 per row, one row per year. Rows already lived are removed unless
// "Show weeks already lived" is on; then the grid starts at birth and scrolls. The box size comes from
// the width only, so boxes never resize when units change or lived weeks are shown.
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { PixelRatio, Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { activeTasks, type State } from '../lib/store';
import { info, parseBirth, weekEnd, weekNow, weekStart } from '../lib/time';
import { statusColor, usePalette, type Palette } from '../theme';

const GAP = 1.5;
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
  const height = Math.min(g.h, maxHeight);

  // One <Path> per colour (each made of many rectangles) keeps the native view count tiny.
  const paths = useMemo(() => {
    if (!width) return [];
    const dpr = PixelRatio.get(), snap = (v: number) => Math.round(v * dpr) / dpr;
    const now = Date.now(), box = g.u - GAP;
    const overlays = activeTasks(state).map(t => {
      const st = info(t).st, rank = st === 'red' ? 0 : st === 'amber' ? 1 : 2;
      return { s: Math.max(t.start, now), e: t.deadline, color: statusColor(p, st), rank };
    }).filter(o => o.e > now);
    const byColor = new Map<string, string[]>();
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < 52; c++) {
      const i = (g.lr + r) * 52 + c, s = weekStart(g.birth, i), e = weekEnd(g.birth, i);
      let color = p.ahead;
      if (e <= now) color = p.lived;
      else if (i === g.wNow) color = p.ink;
      else {
        let best: (typeof overlays)[number] | null = null;
        for (const o of overlays) if (o.s < e && o.e > s && (!best || o.rank < best.rank)) best = o;
        if (best) color = best.color;
      }
      if (i === selected && i !== g.wNow) color = p.dim;
      const x0 = snap(c * g.u), y0 = snap(g.yOf(r));
      const w = +(snap(c * g.u + box) - x0).toFixed(2), h = +(snap(g.yOf(r) + box) - y0).toFixed(2);
      let d = byColor.get(color);
      if (!d) byColor.set(color, d = []);
      d.push(`M${+x0.toFixed(2)} ${+y0.toFixed(2)}h${w}v${h}h${-w}z`);
    }
    return [...byColor].map(([color, d]) => ({ color, d: d.join('') }));
  }, [width, g, state, p, selected]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const tap = (x: number, y: number) => {
    let r = 0;
    for (let k = 0; k < g.rows; k++) if (g.yOf(k) <= y + GAP) r = k;
    const c = Math.max(0, Math.min(51, Math.floor(x / g.u)));
    onSelect?.((g.lr + r) * 52 + c);
  };

  // Where the lived view opens: this year's row with some of the past above it. Rows outside are cropped.
  const openAt = Math.max(0, Math.min(g.h - maxHeight, g.yOf(Math.floor(g.wNow / 52)) - maxHeight * 0.35));

  const grid = (
    <Pressable onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
      {width ? (
        <Svg width={width} height={g.h}>
          {paths.map(x => <Path key={x.color} d={x.d} fill={x.color} />)}
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
