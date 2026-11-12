import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Switch, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { F, H, R, S, T, slop, statusColor, usePalette, type Status } from '../theme';

export const haptic = {
  tick: () => Haptics.selectionAsync().catch(() => {}),
  ok: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

type TxtProps = TextProps & { variant?: 'h1' | 'h2' | 'body' | 'label' | 'meta' | 'small' | 'num'; dim?: boolean; color?: string };
export function Txt({ variant = 'body', dim, color, style, ...rest }: TxtProps) {
  const p = usePalette();
  const v: Record<string, TextStyle> = {
    // Inter: tighter tracking on headings (as its own guidance suggests for display sizes), default on body text.
    h1: { fontFamily: F.uiBold, fontSize: T.x5, lineHeight: 40, letterSpacing: -0.8 },
    h2: { fontFamily: F.uiSemi, fontSize: T.xl, lineHeight: 28, letterSpacing: -0.3 },
    body: { fontFamily: F.ui, fontSize: T.base, lineHeight: 26 },
    label: { fontFamily: F.uiSemi, fontSize: T.xs, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
    meta: { fontFamily: F.ui, fontSize: T.md, lineHeight: 20, fontVariant: ['tabular-nums'] },
    // Small text gets a touch of extra tracking, as optical sizing does for small sizes.
    small: { fontFamily: F.ui, fontSize: T.sm, lineHeight: 18, letterSpacing: 0.1, fontVariant: ['tabular-nums'] },
    // Dot-matrix digits, only for a number standing on its own (a time, a day number, a count). When a number
    // sits in a phrase with words ("3 weeks left", "9 November"), it stays in the text font.
    num: { fontFamily: F.dot, fontSize: T.md, lineHeight: 20 },
  };
  return <Text maxFontSizeMultiplier={2} style={[v[variant], { color: color ?? (dim ? p.dim : p.ink) }, style]} {...rest} />;
}

/** A date as "9 November 2026", in the text font (numbers among words are not set in the dot digits). */
export function DateTitle({ date, size = T.xl, month = 'long', style, color }: { date: Date; size?: number; month?: 'long' | 'short'; style?: StyleProp<TextStyle>; color?: string }) {
  return (
    <Txt numberOfLines={1} color={color} style={[{ fontFamily: F.uiSemi, fontSize: size, lineHeight: size + 7, letterSpacing: size >= 20 ? -0.3 : 0, fontVariant: ['tabular-nums'] }, style]}>
      {date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric' })}
    </Txt>
  );
}

type BtnKind = 'primary' | 'secondary' | 'pill' | 'ghost';
type BtnProps = PressableProps & {
  label: string; icon?: ReactNode; kind?: BtnKind; size?: 'sm' | 'md' | 'lg'; danger?: boolean; style?: StyleProp<ViewStyle>;
};
/**
 * The one button. Primary is solid ink, for the main action (lg, full width, at the bottom of a screen; md inline).
 * Secondary is a raised surface with a hairline, for everything else that matters; ghost is text only, for the
 * least important choice. Sizes are visual only: hitSlop keeps every button at least 44pt to tap.
 * 'pill' is the old name of secondary.
 */
export function Btn({ label, icon, kind = 'secondary', size, danger, disabled, style, onPress, ...rest }: BtnProps) {
  const p = usePalette();
  const primary = kind === 'primary', ghost = kind === 'ghost';
  const sz = size ?? (primary ? 'lg' : 'md');
  const h = H[sz];
  const fg = primary ? p.bg : danger ? p.redInk : ghost ? p.dim : p.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={slop(h)}
      onPress={e => { haptic.tick(); onPress?.(e); }}
      style={({ pressed }) => [
        styles.btn,
        {
          minHeight: h, paddingHorizontal: sz === 'lg' ? 20 : sz === 'md' ? 16 : 12, borderRadius: sz === 'sm' ? R.sm : R.md,
          backgroundColor: primary ? p.ink : ghost ? (pressed ? p.raise2 : 'transparent') : p.raise2,
          opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        !primary && !ghost && { borderWidth: StyleSheet.hairlineWidth, borderColor: p.hairline },
        style,
      ]}
      {...rest}
    >
      {icon}
      <Txt numberOfLines={1} style={{ fontFamily: primary ? F.uiSemi : F.uiMedium, fontSize: sz === 'sm' ? T.sm : 14, lineHeight: 20, fontVariant: ['tabular-nums'] }} color={fg}>{label}</Txt>
    </Pressable>
  );
}

/** A round icon-only button (close, back, settings…). 40 across, 44+ to tap. Always give an accessibilityLabel. */
export function IconButton({ children, kind = 'ghost', size = H.md, style, onPress, accessibilityLabel, ...rest }:
  PressableProps & { children: ReactNode; kind?: 'ghost' | 'secondary'; size?: number; style?: StyleProp<ViewStyle>; accessibilityLabel: string }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={slop(size)}
      onPress={e => { haptic.tick(); onPress?.(e); }}
      style={({ pressed }) => [{
        width: size, height: size, borderRadius: R.full, alignItems: 'center', justifyContent: 'center',
        backgroundColor: kind === 'secondary' || pressed ? p.raise2 : 'transparent', transform: [{ scale: pressed ? 0.97 : 1 }],
      }, kind === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: p.hairline }, style]}
      {...rest}>
      {children}
    </Pressable>
  );
}

/**
 * A compact pill: an action ("+1 week") or, with `on`, a choice in a set where several can be picked (a ✓ marks
 * the picked ones). For one-of-two or one-of-three choices use GlassSegment.
 */
export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: ReactNode }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityState={on == null ? undefined : { selected: on }} hitSlop={slop(H.sm)}
      onPress={() => { haptic.tick(); onPress(); }}
      style={({ pressed }) => [styles.chip, {
        borderColor: on ? p.ink : p.hairline, backgroundColor: on || pressed ? p.raise2 : 'transparent',
        transform: [{ scale: pressed ? 0.97 : 1 }],
      }]}>
      {on ? <Txt style={{ fontFamily: F.uiSemi, fontSize: T.sm, lineHeight: 18 }}>✓</Txt> : icon}
      <Txt numberOfLines={1} style={{ fontFamily: on ? F.uiSemi : F.uiMedium, fontSize: T.sm, lineHeight: 18, fontVariant: ['tabular-nums'] }}>{label}</Txt>
    </Pressable>
  );
}

/** The platform switch in the app's colours (ink when on), so it matches the rest of the controls. */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; accessibilityLabel?: string }) {
  const p = usePalette();
  return (
    <Switch value={value} disabled={disabled} accessibilityLabel={accessibilityLabel}
      onValueChange={v => { haptic.tick(); onValueChange(v); }}
      trackColor={{ false: p.raise2, true: p.ink }} thumbColor={value ? p.bg : p.dim} ios_backgroundColor={p.raise2}
      style={disabled ? { opacity: 0.4 } : undefined} />
  );
}

type FieldProps = TextInputProps & { bare?: boolean; error?: string; helper?: string; big?: boolean; wrap?: StyleProp<ViewStyle>; trailing?: ReactNode };
/**
 * The one text field. Boxed (raised surface, hairline that brightens on focus) when it stands alone; `bare` inside a
 * card, where the card is the box. `big` for a title. Helper or error text sits under it.
 */
export function Field({ bare, error, helper, big, wrap, trailing, style, onFocus, onBlur, ...rest }: FieldProps) {
  const p = usePalette();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: S.s1 }, wrap]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', minHeight: big ? H.lg : H.md },
        !bare && { borderRadius: R.md, borderWidth: 1, backgroundColor: p.raise, paddingLeft: S.s3, paddingRight: trailing ? S.s1 : S.s3,
          borderColor: error ? p.redInk : focus ? p.dim : p.hairline }]}>
        <TextInput placeholderTextColor={p.dim} maxFontSizeMultiplier={2} selectionColor={p.ink}
          onFocus={e => { setFocus(true); onFocus?.(e); }} onBlur={e => { setFocus(false); onBlur?.(e); }}
          style={[{ flex: 1, color: p.ink, paddingVertical: S.s2,
            ...(big ? { fontFamily: F.uiSemi, fontSize: T.xl, lineHeight: 28, letterSpacing: -0.3 } : { fontFamily: F.uiMedium, fontSize: T.md, lineHeight: 20 }) }, style]}
          {...rest} />
        {trailing}
      </View>
      {error ? <Txt variant="small" color={p.redInk}>{error}</Txt> : helper ? <Txt variant="small" dim>{helper}</Txt> : null}
    </View>
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
      {label ? <Txt variant="label" color={st ? statusColor(p, st, true) : p.dim} style={{ marginBottom: S.s3 }}>
        {label}{count != null ? <Txt variant="label" dim>{`  ${count}`}</Txt> : null}
      </Txt> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: { minHeight: H.sm, paddingHorizontal: S.s3, borderRadius: R.full, borderWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toast: { position: 'absolute', left: 20, right: 20, bottom: 110, borderRadius: R.md, paddingHorizontal: 18, paddingVertical: 14 },
});
