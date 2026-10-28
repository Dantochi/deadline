// The life grid: always weeks, 52 per row, one row per year. Rows already lived are removed;
// the box size comes from the width only, so boxes never resize when units change.
import { useMemo, useState } from 'react';
import { PixelRatio, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { activeTasks, type State } from '../lib/store';
import { info, parseBirth, weekEnd, weekNow, weekStart } from '../lib/time';
import { statusColor, usePalette, type Palette } from '../theme';

const GAP = 1.5, DECADE = 6;

export function useGridGeometry(width: number, state: State) {
  return useMemo(() => {
    const birth = parseBirth(state.birth), wNow = weekNow(birth, state.life);
    const lr = Math.floor(wNow / 52), rows = state.life - lr;
    const u = width / 52;
    const yOf = (r: number) => r * u + (Math.floor((lr + r) / 10) - Math.floor(lr / 10)) * DECADE;
    const h = rows > 0 ? yOf(rows - 1) + u - GAP : 0;
    return { birth, wNow, lr, rows, u, yOf, h };
  }, [width, state.birth, state.life]);
}

export function LifeGrid({ state, maxHeight, onSelect, selected, palette }: {
  state: State; maxHeight: number; onSelect?: (week: number) => void; selected?: number | null; palette?: Palette;
}) {
  const system = usePalette(), p = palette ?? system;
  const [width, setWidth] = useState(0);
  const g = useGridGeometry(width, state);
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

  return (
    <View onLayout={onLayout} style={{ width: '100%', height, overflow: 'hidden' }}
      accessible accessibilityRole="image"
      accessibilityLabel={`Life grid: ${state.life * 52 - g.wNow} of ${state.life * 52} weeks left.`}>
      <Pressable onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
        {width ? (
          <Svg width={width} height={g.h}>
            {paths.map(x => <Path key={x.color} d={x.d} fill={x.color} />)}
          </Svg>
        ) : null}
      </Pressable>
    </View>
  );
}
