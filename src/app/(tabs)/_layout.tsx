import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { CalendarIcon, ClockIcon, GridIcon, QuoteIcon } from '../../components/icons';
import { StyleSheet } from 'react-native';
import { TAB_TITLES, fixTabOrder, useStore } from '../../lib/store';
import { F, usePalette } from '../../theme';

const ICONS = { index: GridIcon, year: CalendarIcon, hours: ClockIcon, wisdom: QuoteIcon };

export default function TabsLayout() {
  const { state } = useStore();
  const p = usePalette();
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  const order = fixTabOrder(state.tabOrder);
  return (
    <Tabs
      // Screens are declared in the saved order, so the first one is where the app opens. Changing the order
      // remounts the navigator so it takes effect at once.
      key={order.join()}
      // Back returns to the tab you were on before, step by step, not straight to the first tab.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: p.ink,
        tabBarInactiveTintColor: p.dim,
        // Frosted bar: a lifted glass tint, a bright hairline on top, no shadow.
        tabBarStyle: { backgroundColor: p.bar, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.glassHi, elevation: 0, shadowOpacity: 0, height: 72, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: F.uiSemi, fontSize: 13 },
        sceneStyle: { backgroundColor: p.bg },
      }}
    >
      {order.map(name => {
        const Icon = ICONS[name];
        return <Tabs.Screen key={name} name={name} options={{ title: TAB_TITLES[name], tabBarIcon: ({ color }) => <Icon color={String(color ?? p.dim)} /> }} />;
      })}
    </Tabs>
  );
}
