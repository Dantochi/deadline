// Frosted glass without real blur: a translucent fill, a hairline edge and a brighter top edge. Cheap to draw,
// so it can sit on the calendar, the tab bar and buttons without costing frames on mid-range phones.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { EASE_OUT, useReduceMotion } from './Motion';
import { Txt, haptic } from './ui';
import { F, R, usePalette } from '../theme';

export function Glass({ radius = R.lg, style, children, ...rest }: ViewProps & { radius?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={[{ backgroundColor: p.glass, borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: p.glassEdge, borderTopColor: p.glassHi, overflow: 'hidden' }, style]} {...rest}>
      {children}
    </View>
  );
}

/** A glass pill of equal segments with an indicator that slides to the chosen one. */
export function GlassSegment<T extends string>({ options, value, onChange, height = 34, fontSize = 14, style, labels }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; height?: number; fontSize?: number; style?: StyleProp<ViewStyle>;
  labels?: Partial<Record<T, string>>; // accessibility names, e.g. W → Weeks
}) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.indexOf(value));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    if (reduce) { x.setValue(idx); return; }
    const a = Animated.timing(x, { toValue: idx, duration: 220, easing: EASE_OUT, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [idx, reduce, x]);
  const seg = w / options.length;
  const pad = 3;
  return (
    <Glass radius={height / 2} style={[{ height, flexDirection: 'row' }, style]} onLayout={e => setW(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {w ? (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: pad, bottom: pad, left: pad, width: seg - pad * 2, borderRadius: (height - pad * 2) / 2,
          backgroundColor: p.ink, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }],
        }} />
      ) : null}
      {options.map(o => (
        <Pressable key={o} accessibilityRole="tab" accessibilityState={{ selected: o === value }} accessibilityLabel={labels?.[o] ?? o}
          onPress={() => { if (o !== value) { haptic.tick(); onChange(o); } }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontFamily: F.uiBold, fontSize, lineHeight: fontSize + 4 }} color={o === value ? p.bg : p.ink}>{o}</Txt>
        </Pressable>
      ))}
    </Glass>
  );
}
