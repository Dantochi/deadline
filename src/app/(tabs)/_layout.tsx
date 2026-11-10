import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { CalendarIcon, ClockIcon, GridIcon, HourglassIcon, QuoteIcon } from '../../components/icons';
import { TabBar } from '../../components/TabBar';
import { useState } from 'react';
import { TAB_TITLES, fixTabOrder, useStore } from '../../lib/store';
import { usePalette } from '../../theme';

const ICONS = { index: GridIcon, year: CalendarIcon, hours: ClockIcon, timer: HourglassIcon, wisdom: QuoteIcon };

export default function TabsLayout() {
  const { state } = useStore();
  const p = usePalette();
  // The screens keep the order they had at launch (so the app opens on the first tab); the bar follows changes live.
  const [order] = useState(() => fixTabOrder(state.tabOrder));
  if (!state.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      // Screens are declared in the saved order, so the first one is where the app opens. The bar itself (TabBar)
      // follows the order live, so reordering never reloads the tabs or loses your place.
      // Back returns to the tab you were on before, step by step, not straight to the first tab.
      backBehavior="history"
      tabBar={props => <TabBar {...props} icons={ICONS} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
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
