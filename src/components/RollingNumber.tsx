// A number whose digits roll into place, like a bank balance (Revolut-style).
//
// How it stays steady: every glyph is measured once at the base size (digits and the thousands comma), the size
// that fits the width is worked out from those numbers, and nothing is shown until then, so it never draws at one
// size and jumps to another. Each digit sits in a fixed-width column (centred, so narrow digits don't wobble), in
// a window exactly one cell tall; the column of 0–9 slides inside that window. The roll is an ease-out glide on
// the native driver (no overshoot that would let the next digit peek in), staggered right to left.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View, type TextStyle } from 'react-native';
import { fmt } from '../lib/time';
import { F } from '../theme';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const EASE = Easing.bezier(0.2, 0.9, 0.1, 1);

function Column({ d, w, h, style, reduce, delay }: { d: number; w: number; h: number; style: TextStyle; reduce: boolean; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const shown = useRef<{ d: number; h: number } | null>(null);
  useEffect(() => {
    const to = -d * h, prev = shown.current;
    shown.current = { d, h };
    // Same digit at a new size (rotation, resize): move without animating.
    if (reduce || (prev && prev.d === d)) { y.setValue(to); return; }
    if (prev && prev.h !== h) y.setValue(-prev.d * h); // keep the old digit in place at the new size, then roll
    const a = Animated.timing(y, { toValue: to, duration: 650, delay, easing: EASE, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [d, h, reduce, delay, y]);
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {DIGITS.map(n => (
          <View key={n} style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
            <Text allowFontScaling={false} style={style}>{n}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function RollingNumber({ value, text: given, fontSize, color, accessibilityLabel }: {
  value: number; fontSize: number; color: string; accessibilityLabel?: string;
  /** Show this instead of the formatted number, e.g. "02:15:30"; its separators are measured like the comma. */
  text?: string;
}) {
  const text = given ?? fmt(value), chars = text.split('');
  const sep = chars.find(c => !/\d/.test(c)) ?? ',';
  const [avail, setAvail] = useState(0);
  const [digitW, setDigitW] = useState<number[]>([]);
  const [sepW, setSepW] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);

  const measured = digitW.filter(Boolean).length === 10 && sepW > 0 && avail > 0;
  const dw = measured ? Math.max(...digitW) : 0;
  const nDigits = chars.filter(c => /\d/.test(c)).length, nSeps = chars.length - nDigits;
  const natural = nDigits * dw + nSeps * sepW;
  const scale = measured && natural > avail ? avail / natural : 1;
  const size = Math.floor(fontSize * scale);
  const h = Math.round(size * 1.12), w = dw * scale, sw = sepW * scale;
  const style: TextStyle = { fontFamily: F.dot, fontSize: size, lineHeight: h, color, includeFontPadding: false, textAlignVertical: 'center' };
  const baseStyle: TextStyle = { fontFamily: F.dot, fontSize, includeFontPadding: false };

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? text}
      onLayout={e => setAvail(e.nativeEvent.layout.width)}
      style={{ height: measured ? h : Math.round(fontSize * 1.12), alignSelf: 'stretch' }}>
      {/* One-time measurement of every glyph at the base size, off screen. */}
      {!measured ? (
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', opacity: 0, flexDirection: 'row', width: 4000 }}>
          {DIGITS.map((n, i) => (
            <Text key={n} allowFontScaling={false} style={baseStyle}
              onLayout={e => { const v = e.nativeEvent.layout.width; setDigitW(ws => { const c = ws.slice(); c[i] = v; return c; }); }}>{n}</Text>
          ))}
          <Text allowFontScaling={false} style={baseStyle} onLayout={e => setSepW(e.nativeEvent.layout.width)}>{sep}</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
          {chars.map((c, i) => {
            const fromRight = chars.length - i; // keyed from the right so the ones stay the ones when the length changes
            return /\d/.test(c)
              ? <Column key={`d${fromRight}`} d={+c} w={w} h={h} style={style} reduce={reduce} delay={(chars.length - 1 - i) * 45} />
              : <View key={`s${fromRight}`} style={{ width: sw, height: h, alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={false} style={style}>{c}</Text></View>;
          })}
        </View>
      )}
    </View>
  );
}
