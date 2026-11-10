// Today: what is left of the day, counting down to midnight in hours, minutes and seconds, in the same dot digits
// as the life countdown. Under it, the day as 24 boxes (one per hour), lived hours grey, like the life grid.
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Txt } from '../../components/ui';
import { hms, secondsLeftToday } from '../../lib/time';
import { F, S, T, usePalette } from '../../theme';

export default function Today() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());

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

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flex: 1, paddingHorizontal: S.page, justifyContent: 'center' }}>
        <Txt variant="label" dim style={{ marginBottom: S.s3 }}>Left today</Txt>
        <Txt allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
          accessibilityLabel={`${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'} left today`}
          style={{ fontFamily: F.dot, fontSize: size, lineHeight: Math.round(size * 1.12), fontVariant: ['tabular-nums'] }}>
          {hms(left)}
        </Txt>

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
    </SafeAreaView>
  );
}
