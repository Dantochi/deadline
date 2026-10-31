// Small motion helpers. Durations follow tap-feedback findings: feedback within ~0.2 s and settled by ~1 s feels
// fast (Kim 2014); transitions exist to keep continuity between states (Heer & Robertson 2007), so they are short,
// ease-out, and skipped entirely when the phone's Reduce motion setting is on.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

export const EASE_OUT = Easing.bezier(0.2, 0.9, 0.1, 1);

let reduceCached: boolean | null = null;
export function useReduceMotion() {
  const [reduce, setReduce] = useState(reduceCached ?? false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceCached = v; setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => { reduceCached = v; setReduce(v); });
    return () => sub.remove();
  }, []);
  return reduce;
}

/** Fades and slides its children in when mounted (or when `id` changes). `from` is the starting offset. */
export function Enter({ children, id, from = { y: 8 }, duration = 200, style }: {
  children: ReactNode; id?: string | number; from?: { x?: number; y?: number }; duration?: number; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) { t.setValue(1); return; }
    t.setValue(0);
    const a = Animated.timing(t, { toValue: 1, duration, easing: EASE_OUT, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [id, reduce, duration, t]);
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [from.x ?? 0, 0] });
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [from.y ?? 0, 0] });
  return <Animated.View style={[style, { opacity: t, transform: [{ translateX: tx }, { translateY: ty }] }]}>{children}</Animated.View>;
}
