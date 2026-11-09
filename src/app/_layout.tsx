import { Doto_800ExtraBold } from '@expo-google-fonts/doto/800ExtraBold';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
// Each weight by its own path, so only these five Inter files are bundled (the package index pulls in all 18).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, Appearance, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../components/ui';
import { reschedule } from '../lib/notifications';
import { PartnerProvider } from '../lib/partner';
import { refreshWidgets } from '../widgets/sync';
import { StoreProvider, useStore } from '../lib/store';
import { usePalette } from '../theme';

function ReminderSync() {
  const { state, ready } = useStore();
  const latest = useRef(state);
  latest.current = state;
  // Reschedule reminders and redraw widgets only when something they show changes (not on scrolling, opening the
  // review, etc.), debounced, and whenever the app comes back.
  const notifKey = JSON.stringify([state.onboarded, state.tasks, state.digest, state.partner, state.shapes]);
  const widgetKey = JSON.stringify([state.tasks, state.events, state.birth, state.life, state.shapes, state.appearance]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { reschedule(latest.current).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [notifKey, ready]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => { refreshWidgets(latest.current).catch(() => {}); }, 1200);
    return () => clearTimeout(t);
  }, [widgetKey, ready]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => { if (s === 'active') { reschedule(latest.current).catch(() => {}); refreshWidgets(latest.current).catch(() => {}); } });
    return () => sub.remove();
  }, []);
  return null;
}

// Tapping a notification opens the screen it is about (tasks for reminders and digests, the weekly review on Sunday).
function NotificationLinks() {
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      const url = r?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    // On a cold start, wait a moment so the navigator is mounted before pushing.
    Notifications.getLastNotificationResponseAsync().then(r => setTimeout(() => open(r), 400)).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
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
      <NotificationLinks />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="new-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="wallpaper" options={{ presentation: 'modal' }} />
        <Stack.Screen name="partner" options={{ presentation: 'modal' }} />
        <Stack.Screen name="events" options={{ presentation: 'modal' }} />
        <Stack.Screen name="widgets" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ presentation: 'modal' }} />
        <Stack.Screen name="day" />
        <Stack.Screen name="task" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Doto_800ExtraBold,
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
