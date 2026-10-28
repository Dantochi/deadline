// A number whose digits roll into place, like a bank balance (Revolut-style). Each digit is a column of 0–9
// clipped to one line, so changing units or values never shifts the layout mid-animation.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View, type TextStyle } from 'react-native';
import { fmt } from '../lib/time';
import { F } from '../theme';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digit({ d, h, style, reduce, delay }: { d: number; h: number; style: TextStyle; reduce: boolean; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const lastH = useRef(h);
  useEffect(() => {
    const to = -d * h;
    if (reduce || lastH.current !== h) { lastH.current = h; y.setValue(to); return; }
    const a = Animated.spring(y, { toValue: to, delay, stiffness: 160, damping: 17, mass: 1, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [d, h, reduce, delay, y]);
  return (
    <View style={{ height: h, overflow: 'hidden' }}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {DIGITS.map(n => <Text key={n} allowFontScaling={false} style={[style, { height: h }]}>{n}</Text>)}
      </Animated.View>
    </View>
  );
}

export function RollingNumber({ value, fontSize, color, accessibilityLabel }: {
  value: number; fontSize: number; color: string; accessibilityLabel?: string;
}) {
  const text = fmt(value);
  const [avail, setAvail] = useState(0);
  const [natural, setNatural] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);

  // Shrink to fit the width (what adjustsFontSizeToFit did), measured from an invisible copy at full size.
  const size = natural > avail && avail > 0 ? Math.floor(fontSize * (avail / natural) * 0.98) : fontSize;
  const h = Math.round(size * 1.04);
  const style: TextStyle = { fontFamily: F.dot, fontSize: size, lineHeight: h, color, textAlign: 'center', includeFontPadding: false };
  const chars = text.split('');

  return (
    <View accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel ?? text}
      onLayout={e => setAvail(e.nativeEvent.layout.width)} style={{ height: h, alignSelf: 'stretch' }}>
      <View pointerEvents="none" style={{ position: 'absolute', opacity: 0, width: 4000, flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
        <Text allowFontScaling={false} numberOfLines={1} onLayout={e => setNatural(e.nativeEvent.layout.width)}
          style={{ fontFamily: F.dot, fontSize, lineHeight: Math.round(fontSize * 1.04) }}>{text}</Text>
      </View>
      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
        {chars.map((c, i) => {
          const fromRight = chars.length - i; // keyed from the right so ones stay ones when the length changes
          return /\d/.test(c)
            ? <Digit key={`d${fromRight}`} d={+c} h={h} style={style} reduce={reduce} delay={(chars.length - 1 - i) * 35} />
            : <Text key={`s${fromRight}`} allowFontScaling={false} style={style}>{c}</Text>;
        })}
      </View>
    </View>
  );
}
