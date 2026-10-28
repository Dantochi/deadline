import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { GridIcon, ListIcon, QuoteIcon } from '../../components/icons';
import { useStore } from '../../lib/store';
import { F, usePalette } from '../../theme';

export default function TabsLayout() {
  const { state } = useStore();
  const p = usePalette();
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.ink,
        tabBarInactiveTintColor: p.dim,
        tabBarStyle: { backgroundColor: p.bg, borderTopColor: p.line, height: 72, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.uiSemi, fontSize: 13 },
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Life', tabBarIcon: ({ color }) => <GridIcon color={String(color ?? p.dim)} /> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <ListIcon color={String(color ?? p.dim)} /> }} />
      <Tabs.Screen name="wisdom" options={{ title: 'Wisdom', tabBarIcon: ({ color }) => <QuoteIcon color={String(color ?? p.dim)} /> }} />
    </Tabs>
  );
}
