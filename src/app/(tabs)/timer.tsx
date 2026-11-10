// Today: what is left of the day, counting down to midnight in hours, minutes and seconds, in the same dot digits
// as the life countdown. Under it, the day as 24 boxes (one per hour), lived hours grey, like the life grid.
// The rotate button turns it into a display piece: the countdown on its side, full screen, beside a pixel
// hourglass whose sand runs down through the day.
import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateIcon } from '../../components/icons';
import { RollingNumber } from '../../components/RollingNumber';
import { SandGlass } from '../../components/SandGlass';
import { Txt, haptic } from '../../components/ui';
import { hms, secondsLeftToday } from '../../lib/time';
import { S, T, palettes, usePalette } from '../../theme';

const DAY_SECONDS = 24 * 3600;

/** The countdown as a display piece: drawn on its side (the app itself stays in portrait), always dark, with the
 *  screen kept awake. Tap anywhere, or press back, to close. */
function LandscapeClock({ left, label, onClose }: { left: number; label: string; onClose: () => void }) {
  useKeepAwake();
  const d = palettes.dark;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const hint = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.timing(hint, { toValue: 0, duration: 600, delay: 3000, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [hint]);
  const { w, h } = box; // the screen in portrait: w short, h long
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Tap to close`} onPress={onClose}
      onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ flex: 1, backgroundColor: d.bg }}>
      <StatusBar hidden />
      {w && h ? (
        // A landscape canvas (h wide, w tall) centred on the screen and turned a quarter. The countdown has the
        // stage; the hourglass is a small detail in the bottom right corner.
        <View style={{ position: 'absolute', left: (w - h) / 2, top: (h - w) / 2, width: h, height: w, transform: [{ rotate: '90deg' }],
          justifyContent: 'center', paddingHorizontal: S.s7, paddingBottom: S.s6 }}>
          <RollingNumber value={left} text={hms(left)} fontSize={Math.floor(w * 0.42)} color={d.ink} accessibilityLabel={label} />
          <Txt variant="label" color={d.dim} allowFontScaling={false} style={{ marginTop: S.s3 }}>Left today</Txt>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: S.s5, right: S.s7, opacity: hint }}>
            <Txt variant="label" color={d.dim} allowFontScaling={false}>Tap to close</Txt>
          </Animated.View>
          <View pointerEvents="none" style={{ position: 'absolute', right: S.s7, bottom: S.s5 }}>
            <SandGlass fraction={1 - left / DAY_SECONDS} height={Math.round(w * 0.18)} p={d} />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Today() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  const [wide, setWide] = useState(false);

  // Tick once a second, on the second, only while this tab is showing.
  useFocusEffect(useCallback(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => { const d = new Date(); setNow(d); id = setTimeout(tick, 1000 - d.getMilliseconds() + 5); };
    tick();
    return () => clearTimeout(id);
  }, []));

  const left = secondsLeftToday(now), hour = now.getHours();
  const inner = width - S.page * 2;
  // Eight dot-matrix characters across the page width.
  const size = Math.floor(inner / 5.2);
  const box = (inner - 23 * S.s1) / 24;
  const hrs = Math.floor(left / 3600), mins = Math.floor((left % 3600) / 60);
  const label = `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'} left today`;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: S.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show the countdown in landscape" onPress={() => { haptic.tick(); setWide(true); }}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <RotateIcon color={p.dim} />
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingHorizontal: S.page, justifyContent: 'center' }}>
        <Txt variant="label" dim style={{ marginBottom: S.s3 }}>Left today</Txt>
        {/* The digits roll into place each second, like the life countdown. */}
        <RollingNumber value={left} text={hms(left)} fontSize={size} color={p.ink}
          accessibilityLabel={label} />

        {/* The day in hours: lived ones grey, this hour outlined, the rest still ahead. */}
        <View style={{ flexDirection: 'row', gap: S.s1, marginTop: S.s6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} style={{ width: box, height: box, backgroundColor: h < hour ? p.lived : p.ahead, borderWidth: h === hour ? 1 : 0, borderColor: p.ink }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.s2 }}>
          {['00', '06', '12', '18', '24'].map(l => <Txt key={l} variant="num" dim allowFontScaling={false} style={{ fontSize: T.xs, lineHeight: 16 }}>{l}</Txt>)}
        </View>
      </View>

      <Modal visible={wide} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setWide(false)}>
        {wide ? <LandscapeClock left={left} label={label} onClose={() => setWide(false)} /> : null}
      </Modal>
    </SafeAreaView>
  );
}
