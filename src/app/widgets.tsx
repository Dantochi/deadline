// Widgets: previews of each home-screen widget, with "Add to home screen" (Android launchers that support pinning).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { Btn, Chip, IconButton, Txt, haptic, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { hms, secondsLeftToday } from '../lib/time';
import { F, palettes, R, S, usePalette } from '../theme';
// Type-only import: the widget code (and its Android-only native module) loads only on Android, below.
import type { WidgetName } from '../widgets/LifeWidgets';

// 'Today' is the native live countdown (plugins/day-countdown), not drawn by the widget library.
type Pick = WidgetName | 'Today';
const SIZES: { name: Pick; label: string; cells: [number, number]; note: string }[] = [
  { name: 'LifeSmall', label: 'Small', cells: [2, 1], note: 'Weeks left' },
  { name: 'LifeMedium', label: 'Medium', cells: [2, 2], note: 'Weeks left and your life in years' },
  { name: 'LifeLarge', label: 'Large', cells: [4, 2], note: 'Weeks left, your next deadline and the next ten years in weeks' },
  { name: 'Tasks', label: 'Deadlines', cells: [4, 2], note: 'Your most urgent deadlines, with their status' },
  { name: 'Today', label: 'Left today', cells: [2, 1], note: 'The time left today, ticking down to midnight every second' },
];

/** The live countdown widget's look, ticking here the way it ticks on the home screen. */
function TodayPreview({ w, h }: { w: number; h: number }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const d = palettes.dark;
  return (
    <View style={{ width: w, height: h, borderRadius: R.lg, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt variant="label" color={d.dim} allowFontScaling={false}>Left today</Txt>
      <Txt allowFontScaling={false} color={d.ink} style={{ fontFamily: F.dot, fontSize: Math.min(34, w / 6), lineHeight: Math.min(40, w / 5), marginTop: S.s1 }}>
        {hms(secondsLeftToday(now)).replace(/^0/, '')}
      </Txt>
    </View>
  );
}

export default function Widgets() {
  const { state } = useStore();
  const toast = useToast();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [pick, setPick] = useState<Pick>('LifeMedium');
  const s = SIZES.find(x => x.name === pick)!;
  const cell = Math.min(84, ((width - S.page * 2) - 24) / 4);
  const w = s.cells[0] * cell, h = s.cells[1] * cell;

  const pin = async () => {
    if (Platform.OS !== 'android' || pick === 'Today') return;
    const { requestPinWidget } = await import('react-native-android-widget');
    const ok = await requestPinWidget({ widgetName: pick }).catch(() => false);
    haptic.ok();
    toast(ok ? 'Your phone will ask where to place it' : 'Long-press your home screen, tap Widgets, then find Deadline');
  };

  const Preview = () => {
    if (Platform.OS !== 'android') return null;
    if (pick === 'Today') return <TodayPreview w={w} h={h} />;
    // Loaded only on Android: the widget library is Android-only.
    const { WidgetPreview } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { WIDGETS } = require('../widgets/LifeWidgets') as typeof import('../widgets/LifeWidgets');
    const C = WIDGETS[pick];
    const look = p === palettes.light ? palettes.light : palettes.dark;
    return <WidgetPreview width={w} height={h} renderWidget={() => <C state={state} p={look} width={w} />} />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Widgets</Txt>
        <IconButton accessibilityLabel="Close" onPress={() => router.back()} style={{ marginRight: -8 }}>
          <CloseIcon color={p.dim} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingBottom: S.s7, gap: S.s5 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1, marginTop: S.s3 }}>
          {SIZES.map(x => <Chip key={x.name} label={x.label} on={pick === x.name} onPress={() => setPick(x.name)} />)}
        </View>
        {Platform.OS === 'android' ? (
          <>
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: S.s5, borderRadius: R.lg, backgroundColor: p.raise, borderWidth: 1, borderColor: p.hairline, height: 2 * cell + 48 }}>
              <Preview />
            </View>
            {pick === 'Today' ? <>
              <Txt variant="meta" dim>{s.note}, even with the app closed. Opens the Today tab when tapped.</Txt>
              <Txt variant="meta">To add it: press and hold an empty spot on your home screen, tap Widgets, find Deadline and drag “Left today” onto the screen.</Txt>
            </> : <>
              <Txt variant="meta" dim>{s.note}. Follows your phone's light or dark mode, opens Deadline when tapped, and updates when a task changes or a week ends.</Txt>
              <Btn kind="primary" label="Add to home screen" onPress={pin} />
            </>}
            <Txt variant="small" dim>On Android 16 and later, the Small widget can also go on the lock screen.</Txt>
          </>
        ) : (
          <Txt dim>Home-screen widgets are on Android in this test build. iPhone widgets come in a later build.</Txt>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
