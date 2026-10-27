import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { BTN, F, R, S, statusColor, usePalette, type Status } from '../theme';

export const haptic = {
  tick: () => Haptics.selectionAsync().catch(() => {}),
  ok: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

type TxtProps = TextProps & { variant?: 'h1' | 'h2' | 'body' | 'label' | 'meta' | 'small'; dim?: boolean; color?: string };
export function Txt({ variant = 'body', dim, color, style, ...rest }: TxtProps) {
  const p = usePalette();
  const v: Record<string, TextStyle> = {
    h1: { fontFamily: F.uiHeavy, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
    h2: { fontFamily: F.uiBold, fontSize: 21, lineHeight: 26 },
    body: { fontFamily: F.uiMedium, fontSize: 17, lineHeight: 23 },
    label: { fontFamily: F.uiBold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase' },
    meta: { fontFamily: F.ui, fontSize: 15, lineHeight: 20 },
    small: { fontFamily: F.ui, fontSize: 13, lineHeight: 18 },
  };
  return <Text maxFontSizeMultiplier={2} style={[v[variant], { color: color ?? (dim ? p.dim : p.ink) }, style]} {...rest} />;
}

type BtnProps = PressableProps & { label: string; icon?: ReactNode; kind?: 'primary' | 'pill' | 'ghost'; style?: StyleProp<ViewStyle> };
export function Btn({ label, icon, kind = 'pill', style, onPress, ...rest }: BtnProps) {
  const p = usePalette();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={e => { haptic.tick(); onPress?.(e); }}
      style={({ pressed }) => [
        styles.btn,
        { minHeight: primary ? BTN.l : BTN.m, backgroundColor: primary ? p.ink : kind === 'pill' ? p.raise2 : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
      {...rest}
    >
      {icon}
      <Txt style={{ fontFamily: primary ? F.uiBold : F.uiSemi, fontSize: primary ? 18 : 16, lineHeight: primary ? 24 : 20 }} color={primary ? p.bg : p.ink}>{label}</Txt>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { haptic.tick(); onPress(); }}
      style={[styles.chip, { borderColor: on ? p.ink : p.line, backgroundColor: on ? p.ink : 'transparent' }]}>
      <Txt style={{ fontFamily: F.uiSemi, fontSize: 15 }} color={on ? p.bg : p.ink}>{label}</Txt>
    </Pressable>
  );
}

/** Status dot with a shape cue (● ◆ ▲) so colour is never the only signal. Red pulses faster. */
export function StatusDot({ st, shapes = true, size = 10 }: { st: Status; shapes?: boolean; size?: number }) {
  const p = usePalette();
  const pulse = useRef(new Animated.Value(1)).current;
  const live = st === 'red' || st === 'amber' || st === 'green';
  useEffect(() => {
    if (!live) return;
    const ms = st === 'red' ? 700 : st === 'amber' ? 1100 : 1500;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.45, duration: ms, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: ms, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [st, live, pulse]);
  const c = statusColor(p, st);
  const shape: ViewStyle = !shapes || st === 'green' || !live ? { borderRadius: size / 2 }
    : st === 'amber' ? { borderRadius: 2, transform: [{ rotate: '45deg' }, { scale: 0.82 }] } : {};
  if (shapes && st === 'red') {
    return <Animated.View style={{ opacity: pulse, width: 0, height: 0, borderLeftWidth: size * 0.6, borderRightWidth: size * 0.6, borderBottomWidth: size * 1.05, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c }} />;
  }
  return <Animated.View style={[{ width: size, height: size, backgroundColor: c, opacity: live ? pulse : 1 }, shape]} />;
}

/** The task's own boxes: weeks (or months for long tasks); spent ones are hollow. */
export function BoxStrip({ n, gone, st }: { n: number; gone: number; st: Status }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: i < gone ? p.ahead : statusColor(p, st), borderWidth: i < gone ? StyleSheet.hairlineWidth : 0, borderColor: p.line }} />
      ))}
    </View>
  );
}

// Tiny toast, one at a time.
const ToastCtx = createContext<(msg: string, ms?: number) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const p = usePalette();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string, ms = 2600) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), ms);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={[styles.toast, { backgroundColor: p.ink }]} accessibilityLiveRegion="polite">
          <Txt style={{ fontFamily: F.uiSemi, fontSize: 15 }} color={p.bg}>{msg}</Txt>
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Section({ label, st, count, children }: { label: string; st?: Status; count?: number; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ marginTop: S.s7 }}>
      <Txt variant="label" color={st ? statusColor(p, st, true) : p.dim} style={{ marginBottom: S.s2 }}>
        {label}{count != null ? <Txt variant="label" dim>{`  ${count}`}</Txt> : null}
      </Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: R.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 110, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 14 },
});
