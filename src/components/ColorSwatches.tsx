// A row of colour swatches (44pt targets). `auto` adds a "Theme" choice that clears the colour, so the task
// follows the app's light or dark theme.
import { Pressable, View } from 'react-native';
import { EVENT_COLORS } from '../lib/events';
import { S, usePalette } from '../theme';
import { haptic } from './ui';

// Eight colours, the same set as important dates: beyond about eight, colours get hard to tell apart
// (Tseng et al. 2023).
export const TASK_COLORS = EVENT_COLORS;

export function ColorSwatches({ value, onChange, auto, colors = TASK_COLORS }: {
  value?: string | null; onChange: (hex: string | null) => void; auto?: boolean; colors?: { name: string; hex: string }[];
}) {
  const p = usePalette();
  const ring = (on: boolean) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 2, borderColor: on ? p.ink : 'transparent' });
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1 }}>
      {auto ? (
        <Pressable accessibilityRole="radio" accessibilityLabel="Theme colour, follows light or dark mode" accessibilityState={{ selected: !value }}
          onPress={() => { haptic.tick(); onChange(null); }} style={ring(!value)}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.ink, borderWidth: 1, borderColor: p.line }} />
        </Pressable>
      ) : null}
      {colors.map(c => (
        <Pressable key={c.hex} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ selected: value === c.hex }}
          onPress={() => { haptic.tick(); onChange(c.hex); }} style={ring(value === c.hex)}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.hex }} />
        </Pressable>
      ))}
    </View>
  );
}
