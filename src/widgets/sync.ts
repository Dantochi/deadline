// Redraw every placed widget after the app's state changes (Android only).
import { Platform } from 'react-native';
import type { State } from '../lib/store';

export async function refreshWidgets(state: State) {
  if (Platform.OS !== 'android') return;
  const { requestWidgetUpdate } = await import('react-native-android-widget');
  const { WIDGETS, renderWidget } = await import('./LifeWidgets');
  await Promise.all(Object.keys(WIDGETS).map(widgetName =>
    requestWidgetUpdate({ widgetName, renderWidget: info => renderWidget(widgetName, state, info.width) }).catch(() => {})));
}
