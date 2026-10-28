import { Doto_800ExtraBold } from '@expo-google-fonts/doto';
import {
  SchibstedGrotesk_400Regular, SchibstedGrotesk_500Medium, SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold, useFonts,
} from '@expo-google-fonts/schibsted-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Appearance, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/ui';
import { reschedule } from '../lib/notifications';
import { PartnerProvider } from '../lib/partner';
import { StoreProvider, useStore } from '../lib/store';
import { usePalette } from '../theme';

function ReminderSync() {
  const { state, ready } = useStore();
  const latest = useRef(state);
  latest.current = state;
  // Reschedule (debounced) whenever tasks or settings change, and whenever the app comes back.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { reschedule(state).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [state, ready]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') reschedule(latest.current).catch(() => {}); });
    return () => sub.remove();
  }, []);
  return null;
}

function Shell() {
  const { ready, state } = useStore();
  // Light text on dark costs legibility in bright light, especially for older eyes, while dark helps at night,
  // so the default follows the phone (which can switch at sunset) and people can override it.
  useEffect(() => {
    Appearance.setColorScheme(state.appearance === 'light' || state.appearance === 'dark' ? state.appearance : 'unspecified');
  }, [state.appearance]);
  const p = usePalette();
  const scheme = useColorScheme();
  if (!ready) return <View style={{ flex: 1, backgroundColor: p.bg }} />;
  return (
    <>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <ReminderSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="wallpaper" options={{ presentation: 'modal' }} />
        <Stack.Screen name="partner" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SchibstedGrotesk_400Regular, SchibstedGrotesk_500Medium, SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold, SchibstedGrotesk_800ExtraBold, Doto_800ExtraBold,
  });
  const p = usePalette();
  if (!loaded) return <View style={{ flex: 1, backgroundColor: p.bg }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ToastProvider>
          <PartnerProvider>
            <Shell />
          </PartnerProvider>
        </ToastProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
