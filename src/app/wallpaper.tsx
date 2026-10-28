// Lock screen wallpaper of the life grid. The image is drawn at full screen size, previewed scaled down,
// and saved to the photo library; people then set it as wallpaper from Photos or the gallery.
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { Dimensions, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { CloseIcon } from '../components/icons';
import { LifeGrid } from '../components/LifeGrid';
import { Btn, Chip, Txt, haptic, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { ageYears, fmt, parseBirth, weekNow } from '../lib/time';
import { F, R, S, palettes, usePalette } from '../theme';

export default function Wallpaper() {
  const { state } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [look, setLook] = useState<'dark' | 'light'>(p === palettes.light ? 'light' : 'dark');
  const [saving, setSaving] = useState(false);
  const shot = useRef<ComponentRef<typeof View>>(null);

  const { width: W, height: H } = Dimensions.get('screen');
  const w = palettes[look];
  const birth = parseBirth(state.birth);
  const weeksLeft = state.life * 52 - weekNow(birth, state.life);
  const scale = Math.min(0.56, (W * 0.8) / W);

  const save = async () => {
    if (!shot.current || saving) return;
    setSaving(true);
    try {
      const perm = await requestPermissionsAsync(true, ['photo']);
      if (!perm.granted) { toast('Allow photo access to save the wallpaper'); return; }
      const uri = await captureRef(shot, { format: 'png', quality: 1, result: 'tmpfile' });
      await Asset.create(uri);
      haptic.ok();
      toast('Saved to your photos');
    } catch {
      toast('Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Wallpaper</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingBottom: S.s7, gap: S.s5, alignItems: 'center' }}>
        <View accessible accessibilityRole="image" accessibilityLabel="Wallpaper preview"
          style={{ width: W * scale, height: H * scale, borderRadius: R.xl, overflow: 'hidden', borderWidth: 1, borderColor: p.line, marginTop: S.s4 }}>
          <View style={{ width: W, height: H, transform: [{ scale }], transformOrigin: 'top left' }}>
            {/* Captured at full size: the scale above only affects the preview. */}
            <View ref={shot} collapsable={false} style={{ width: W, height: H, backgroundColor: w.bg, alignItems: 'center' }}>
              {/* Top third stays clear for the lock screen clock. */}
              <View style={{ height: H * 0.34 }} />
              <View style={{ width: W * 0.78 }}>
                <LifeGrid state={state} palette={w} maxHeight={H * 0.4} />
                <Text allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: W * 0.11, lineHeight: W * 0.12, color: w.ink, marginTop: W * 0.06 }}>{fmt(weeksLeft)}</Text>
                <Text allowFontScaling={false} style={{ fontFamily: F.ui, fontSize: W * 0.036, color: w.dim, marginTop: W * 0.01 }}>
                  <Text style={{ fontFamily: F.uiSemi, color: w.ink }}>weeks left</Text> · {fmt(ageYears(birth))} years lived
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: S.s1, alignSelf: 'stretch' }}>
          <View style={{ flex: 1 }}><Chip label="Dark" on={look === 'dark'} onPress={() => setLook('dark')} /></View>
          <View style={{ flex: 1 }}><Chip label="Light" on={look === 'light'} onPress={() => setLook('light')} /></View>
        </View>

        <Btn kind="primary" label={saving ? 'Saving…' : 'Save to photos'} onPress={save} style={{ alignSelf: 'stretch' }} />
        <Txt variant="meta" dim style={{ alignSelf: 'stretch' }}>
          {Platform.OS === 'ios'
            ? 'Then open it in Photos, tap Share and choose Use as Wallpaper.'
            : 'Then open it in your gallery or Google Photos, tap ⋮ and choose Set as wallpaper (or Use as).'}
          {' '}The bright square is this week, so save a fresh one now and then.
        </Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
