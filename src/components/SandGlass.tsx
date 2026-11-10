// A pixel hourglass: sand in the top chamber for the part of the day still left, in the bottom for the part gone,
// and one grain always falling through the neck. Square cells like the life grid. Decorative, so hidden from
// screen readers (the countdown beside it says the time).
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useReduceMotion } from './Motion';
import { SAND_COLS, SAND_ROWS, grainsTop, sandCells } from '../lib/sand';
import type { Palette } from '../theme';

export function SandGlass({ fraction, height, p }: { fraction: number; height: number; p: Palette }) {
  const reduce = useReduceMotion();
  const u = height / SAND_ROWS, gap = Math.max(1, u * 0.18), box = u - gap, width = u * SAND_COLS;
  const top = grainsTop(fraction);
  const g = useMemo(() => sandCells(top), [top]);
  const y = useRef(new Animated.Value(0)).current;

  // The falling grain: from the neck to the top of the heap, about once a second.
  useEffect(() => {
    if (reduce || !g.falling) { y.setValue(0); return; }
    y.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: 1, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(300),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, g.falling, g.land, y]);

  const rect = (key: string, [r, c]: [number, number], fill: string) =>
    <Rect key={key} x={c * u + gap / 2} y={r * u + gap / 2} width={box} height={box} fill={fill} />;

  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        {g.empty.map((c, i) => rect(`e${i}`, c, p.ahead))}
        {g.glass.map((c, i) => rect(`g${i}`, c, p.lived))}
        {g.sand.map(c => rect(`s${c[0]}_${c[1]}`, c, p.ink))}
      </Svg>
      {g.falling ? (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: g.mid * u + gap / 2, top: g.neck * u + gap / 2, width: box, height: box, backgroundColor: p.ink,
          opacity: reduce ? 1 : y.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, (g.land - g.neck) * u] }) }],
        }} />
      ) : null}
    </View>
  );
}
