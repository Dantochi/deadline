// Runs in the background when Android asks a widget to draw (added, resized, periodic update) or when the app
// requests an update. Reads the same saved state the app uses.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { DEFAULT_STATE, KEY, type State } from '../lib/store';
import { renderWidget } from './LifeWidgets';

export async function loadState(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget: render }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const state = await loadState();
  render(renderWidget(widgetInfo.widgetName, state, widgetInfo.width));
}
