// Widgets: previews of each home-screen widget, with "Add to home screen" (Android launchers that support pinning).
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { Btn, Chip, Txt, haptic, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { palettes, R, S, usePalette } from '../theme';
// Type-only import: the widget code (and its Android-only native module) loads only on Android, below.
import type { WidgetName } from '../widgets/LifeWidgets';

const SIZES: { name: WidgetName; label: string; cells: [number, number]; note: string }[] = [
  { name: 'LifeSmall', label: 'Small', cells: [2, 1], note: 'Weeks left' },
  { name: 'LifeMedium', label: 'Medium', cells: [2, 2], note: 'Weeks left and your life in years' },
  { name: 'LifeLarge', label: 'Large', cells: [4, 2], note: 'Weeks left, your next deadline and the next ten years in weeks' },
  { name: 'Tasks', label: 'Deadlines', cells: [4, 2], note: 'Your most urgent deadlines, with their status' },
];

export default function Widgets() {
  const { state } = useStore();
  const toast = useToast();
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [pick, setPick] = useState<WidgetName>('LifeMedium');
  const s = SIZES.find(x => x.name === pick)!;
  const cell = Math.min(84, (width * 0.91 - 24) / 4);
  const w = s.cells[0] * cell, h = s.cells[1] * cell;

  const pin = async () => {
    if (Platform.OS !== 'android') return;
    const { requestPinWidget } = await import('react-native-android-widget');
    const ok = await requestPinWidget({ widgetName: pick }).catch(() => false);
    haptic.ok();
    toast(ok ? 'Your phone will ask where to place it' : 'Long-press your home screen, tap Widgets, then find Deadline');
  };

  const Preview = () => {
    if (Platform.OS !== 'android') return null;
    // Loaded only on Android: the widget library is Android-only.
    const { WidgetPreview } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { WIDGETS } = require('../widgets/LifeWidgets') as typeof import('../widgets/LifeWidgets');
    const C = WIDGETS[pick];
    const look = p === palettes.light ? palettes.light : palettes.dark;
    return <WidgetPreview width={w} height={h} renderWidget={() => <C state={state} p={look} width={w} />} />;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Widgets</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingBottom: S.s7, gap: S.s5 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1, marginTop: S.s3 }}>
          {SIZES.map(x => <Chip key={x.name} label={x.label} on={pick === x.name} onPress={() => setPick(x.name)} />)}
        </View>
        {Platform.OS === 'android' ? (
          <>
            <View style={{ alignItems: 'center', justifyContent: 'center', padding: S.s5, borderRadius: R.xl, backgroundColor: p.bg, minHeight: 2 * cell + 48 }}>
              <Preview />
            </View>
            <Txt variant="meta" dim>{s.note}. Follows your phone's light or dark mode, opens Deadline when tapped, and updates when a task changes or a week ends.</Txt>
            <Btn kind="primary" label="Add to home screen" onPress={pin} />
            <Txt variant="small" dim>On Android 16 and later, the Small widget can also go on the lock screen.</Txt>
          </>
        ) : (
          <Txt dim>Home-screen widgets are on Android in this test build. iPhone widgets come in a later build.</Txt>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
