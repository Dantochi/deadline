// The life grid: always weeks, 52 per row, one row per year. Rows already lived are removed unless
// "Show weeks already lived" is on; then the grid starts at birth and scrolls. The box size comes from
// the width only, so boxes never resize when units change or lived weeks are shown.
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, PixelRatio, Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, G, Path, Rect } from 'react-native-svg';
import { EASE_OUT, useReduceMotion } from './Motion';
import { eventColorMap } from '../lib/events';
import { activeTasks, useStore, type State } from '../lib/store';
import { DAY, addYears, info, parseBirth, weekNow } from '../lib/time';
import { statusColor, usePalette, type Palette } from '../theme';

/** Space between week boxes; a box is (width / 52) − GAP. The Year overview's day boxes use the same size. */
export const GAP = 1.5;
const WEEK = 7 * DAY;
export const DECADE = 6;

// Entrance: the boxes start soft and see-through and come into focus together.
//
// Animating a blur's strength means re-blurring the whole grid on every frame, in software, which mid-range
// phones can't keep up with (it stuttered on a Redmi Note 13). Instead the grid is drawn twice while the entrance
// plays: a copy blurred once (over the visible window only) on top, the sharp grid underneath. Both opacities then
// run on the native thread, soft fading out while sharp fades in, so nothing is redrawn during the motion and the
// eye still sees the boxes come into focus. The blurred copy is removed when it's done.
const INTRO_MS = 700, INTRO_BLUR = 8;

/** Plays the entrance whenever `play` changes (once the grid has a size). Nothing plays with Reduce motion, or when
 *  `skip` (the wallpaper image). `drawn` is called once the blurred copy is on screen: only then does the motion
 *  start, so the one-off blur never lands in the middle of it. */
function useIntro(ready: boolean, play: number, skip: boolean) {
  const reduce = useReduceMotion();
  const on = ready && !skip && !reduce;
  // The entrance whose motion has finished; any other `play` value means one is due or running.
  const [doneFor, setDoneFor] = useState<number | null>(null);
  const [sharp] = useState(() => new Animated.Value(1));
  const [soft] = useState(() => new Animated.Value(0));
  const start = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!on) return;
    let live = true, raf = 0, begun = false;
    const anim = Animated.parallel([
      Animated.timing(sharp, { toValue: 1, duration: INTRO_MS, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(soft, { toValue: 0, duration: INTRO_MS, easing: EASE_OUT, useNativeDriver: true }),
    ]);
    sharp.setValue(0); soft.setValue(1);
    const begin = () => {
      if (begun || !live) return;
      begun = true;
      raf = requestAnimationFrame(() => anim.start(({ finished }) => { if (finished && live) setDoneFor(play); }));
    };
    start.current = begin;
    const fallback = setTimeout(begin, 250); // if the blurred copy never reports in, play anyway
    return () => { live = false; clearTimeout(fallback); cancelAnimationFrame(raf); anim.stop(); sharp.setValue(1); soft.setValue(0); start.current = null; };
  }, [on, play, sharp, soft]);
  const drawn = useCallback(() => start.current?.(), []);
  return { playing: on && doneFor !== play, sharp, soft, drawn };
}

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

export function LifeGrid({ state, maxHeight, onSelect, selected, palette, lived: livedProp, frozen, play = 0 }: {
  state: State; maxHeight: number; onSelect?: (week: number) => void; selected?: number | null; palette?: Palette;
  /** Overrides the "show weeks already lived" setting (the wallpaper chooses its own). */ lived?: boolean;
  /** Show the same window the scroll view opens on, without scrolling (for the wallpaper image). */ frozen?: boolean;
  /** Change this to play the blur-fade entrance again (e.g. each time the Life tab is visited). */ play?: number;
}) {
  const system = usePalette(), p = palette ?? system;
  const [width, setWidth] = useState(0);
  const lived = livedProp ?? !!state.showLived;
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null), scrolled = useRef(false);
  const g = useGridGeometry(width, state, lived);
  const tasks = state.tasks, evs = state.events;
  const height = Math.min(g.h, maxHeight);
  const intro = useIntro(width > 0, play, !!frozen); // the wallpaper image is drawn sharp
  const [scrollY, setScrollY] = useState<number | null>(null); // where the lived view rests, for the blurred copy

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
    setScrollY(y);
    let k = 0;
    for (let r = 0; r < g.rows; r++) if (g.yOf(r) <= y) k = r;
    const row = Math.round((k + Math.min(1, (y - g.yOf(k)) / g.u)) * 100) / 100;
    if (row !== state.gridTop) update(s => ({ ...s, gridTop: row }));
  };

  const grid = (
    <Pressable onPress={e => tap(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
      {width ? (
        <Animated.View style={{ opacity: intro.sharp }}>
          <Svg width={width} height={g.h}>
            {paths.map(x => <Path key={x.color} d={x.d} fill={x.color} />)}
            {selRect ? <Rect x={selRect.x} y={selRect.y} width={selRect.s} height={selRect.s} fill={p.dim} /> : null}
          </Svg>
        </Animated.View>
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
      {intro.playing && width ? (() => {
        // The blurred copy of what is on screen: the visible window only, blurred once, laid over the grid.
        const y = lived && g.h > maxHeight ? (scrollY ?? openAt) : 0, pad = INTRO_BLUR * 3;
        return (
          <Animated.View pointerEvents="none" onLayout={intro.drawn}
            style={{ position: 'absolute', left: 0, top: 0, width, height, opacity: intro.soft }}>
            <Svg width={width} height={height}>
              <Defs>
                <Filter id="lifeIntro" filterUnits="userSpaceOnUse" x={-pad} y={y - pad} width={width + pad * 2} height={height + pad * 2}>
                  <FeGaussianBlur stdDeviation={INTRO_BLUR} />
                </Filter>
              </Defs>
              <G transform={`translate(0, ${-y})`}>
                <G filter="url(#lifeIntro)">
                  {paths.map(x => <Path key={x.color} d={x.d} fill={x.color} />)}
                </G>
              </G>
            </Svg>
          </Animated.View>
        );
      })() : null}
    </View>
  );
}
