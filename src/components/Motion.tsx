// Small motion helpers. Durations follow tap-feedback findings: feedback within ~0.2 s and settled by ~1 s feels
// fast (Kim 2014); transitions exist to keep continuity between states (Heer & Robertson 2007), so they are short,
// ease-out, and skipped entirely when the phone's Reduce motion setting is on.
import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';

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

/** A list whose items come in one after another, 30 ms apart (the first eight; the rest arrive together), so the
 *  eye is led down it. Give each child a key. */
export function Stagger({ children, gap = 30, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  const items = Children.toArray(children);
  return (
    <View style={style}>
      {items.map((c, i) => <EnterLate key={(c as { key?: string }).key ?? i} delay={Math.min(i, 8) * gap}>{c}</EnterLate>)}
    </View>
  );
}
function EnterLate({ children, delay }: { children: ReactNode; delay: number }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) { t.setValue(1); return; }
    const a = Animated.timing(t, { toValue: 1, duration: 220, delay, easing: EASE_OUT, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [reduce, delay, t]);
  return <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}

/** A small reward: its children pop in (scale up, settle) whenever `on` turns true, e.g. the tick when a task is
 *  finished. No bounce when Reduce motion is on. */
export function Pop({ on, children, style }: { on: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(on ? 1 : 0));
  useEffect(() => {
    if (!on) { t.setValue(0); return; }
    if (reduce) { t.setValue(1); return; }
    t.setValue(0);
    const a = Animated.spring(t, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 10 });
    a.start();
    return () => a.stop();
  }, [on, reduce, t]);
  if (!on) return null;
  return <Animated.View style={[style, { opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>{children}</Animated.View>;
}

/** A slow breathing fade for placeholders shown while something loads. Still when Reduce motion is on. */
export function Pulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const [t] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduce) return;
    const a = Animated.loop(Animated.sequence([
      Animated.timing(t, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      Animated.timing(t, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [reduce, t]);
  return <Animated.View style={[style, { opacity: t }]}>{children}</Animated.View>;
}
