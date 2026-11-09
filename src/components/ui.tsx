import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { BTN, F, R, S, T, statusColor, usePalette, type Status } from '../theme';

export const haptic = {
  tick: () => Haptics.selectionAsync().catch(() => {}),
  ok: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

type TxtProps = TextProps & { variant?: 'h1' | 'h2' | 'body' | 'label' | 'meta' | 'small' | 'num'; dim?: boolean; color?: string };
export function Txt({ variant = 'body', dim, color, style, ...rest }: TxtProps) {
  const p = usePalette();
  const v: Record<string, TextStyle> = {
    h1: { fontFamily: F.uiHeavy, fontSize: T.x5, lineHeight: 40, letterSpacing: -1 },
    h2: { fontFamily: F.uiBold, fontSize: T.xl, lineHeight: 28 },
    body: { fontFamily: F.uiMedium, fontSize: T.base, lineHeight: 24 },
    label: { fontFamily: F.uiBold, fontSize: T.xs, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
    meta: { fontFamily: F.ui, fontSize: T.md, lineHeight: 20, fontVariant: ['tabular-nums'] },
    // Small text gets a touch of extra tracking, as optical sizing does for small sizes.
    small: { fontFamily: F.ui, fontSize: T.sm, lineHeight: 18, letterSpacing: 0.1, fontVariant: ['tabular-nums'] },
    // Dates and times: the same dot-matrix digits as the big countdown.
    num: { fontFamily: F.dot, fontSize: T.md, lineHeight: 20 },
  };
  return <Text maxFontSizeMultiplier={2} style={[v[variant], { color: color ?? (dim ? p.dim : p.ink) }, style]} {...rest} />;
}

/** A date as "9 November 2026" with the numbers in the dot-matrix digits and the month in the UI font. */
export function DateTitle({ date, size = T.xl, month = 'long', style, color }: { date: Date; size?: number; month?: 'long' | 'short'; style?: StyleProp<TextStyle>; color?: string }) {
  const m = date.toLocaleDateString('en-GB', { month });
  const n = { fontFamily: F.dot, fontSize: size + 1, lineHeight: size + 7 };
  return (
    <Txt numberOfLines={1} color={color} style={[{ fontFamily: F.uiBold, fontSize: size, lineHeight: size + 7 }, style]}>
      <Txt color={color} style={n}>{date.getDate()}</Txt> {m} <Txt color={color} style={n}>{date.getFullYear()}</Txt>
    </Txt>
  );
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
        // One button height across the app; secondary buttons are frosted glass.
        { minHeight: BTN.m, backgroundColor: primary ? p.ink : kind === 'pill' ? p.glass : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }] },
        kind === 'pill' && { borderWidth: StyleSheet.hairlineWidth, borderColor: p.glassEdge, borderTopColor: p.glassHi },
        style,
      ]}
      {...rest}
    >
      {icon}
      <Txt style={{ fontFamily: primary ? F.uiBold : F.uiSemi, fontSize: T.md, lineHeight: 20 }} color={primary ? p.bg : p.ink}>{label}</Txt>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => { haptic.tick(); onPress(); }}
      style={[styles.chip, { borderColor: on ? p.ink : p.glassEdge, borderTopColor: on ? p.ink : p.glassHi, backgroundColor: on ? p.ink : p.glass }]}>
      <Txt style={{ fontFamily: F.uiSemi, fontSize: T.md, lineHeight: 20 }} color={on ? p.bg : p.ink}>{label}</Txt>
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
type ToastAction = { label: string; onPress: () => void };
const ToastCtx = createContext<(msg: string, ms?: number, action?: ToastAction) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const p = usePalette();
  const [msg, setMsg] = useState<{ text: string; action?: ToastAction } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // An optional action (e.g. Undo after a delete) keeps the toast up longer and makes it tappable.
  const show = useCallback((m: string, ms = 2600, action?: ToastAction) => {
    setMsg({ text: m, action });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), action ? Math.max(ms, 6000) : ms);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents={msg.action ? 'box-none' : 'none'} style={[styles.toast, { backgroundColor: p.ink, flexDirection: 'row', alignItems: 'center', gap: S.s3 }]} accessibilityLiveRegion="polite">
          <Txt style={{ fontFamily: F.uiSemi, fontSize: T.md, lineHeight: 20, flex: msg.action ? 1 : undefined }} color={p.bg}>{msg.text}</Txt>
          {msg.action ? (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { haptic.tick(); msg.action!.onPress(); setMsg(null); }}>
              <Txt style={{ fontFamily: F.uiBold, fontSize: T.md, lineHeight: 20, textDecorationLine: 'underline' }} color={p.bg}>{msg.action.label}</Txt>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Section({ label, st, count, children }: { label?: string; st?: Status; count?: number; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ marginTop: label ? S.s7 : S.s5 }}>
      {label ? <Txt variant="label" color={st ? statusColor(p, st, true) : p.dim} style={{ marginBottom: S.s2 }}>
        {label}{count != null ? <Txt variant="label" dim>{`  ${count}`}</Txt> : null}
      </Txt> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  chip: { minHeight: 44, paddingHorizontal: 16, borderRadius: R.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 110, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 14 },
});
