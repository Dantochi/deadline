// A row of colour swatches (44pt targets). `auto` adds an "Auto" choice that clears the colour.
import { Pressable, View } from 'react-native';
import { EVENT_COLORS } from '../lib/events';
import { F, S, usePalette } from '../theme';
import { Txt, haptic } from './ui';

export const TASK_COLORS = [
  ...EVENT_COLORS,
  { name: 'Red', hex: '#FF6B3D' }, { name: 'Amber', hex: '#FFCB47' }, { name: 'Green', hex: '#3CCFB0' },
];

export function ColorSwatches({ value, onChange, auto, colors = TASK_COLORS }: {
  value?: string | null; onChange: (hex: string | null) => void; auto?: boolean; colors?: { name: string; hex: string }[];
}) {
  const p = usePalette();
  const ring = (on: boolean) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 2, borderColor: on ? p.ink : 'transparent' });
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1 }}>
      {auto ? (
        <Pressable accessibilityRole="radio" accessibilityLabel="Auto: status colour" accessibilityState={{ selected: !value }}
          onPress={() => { haptic.tick(); onChange(null); }} style={ring(!value)}>
          <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: p.line, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={{ fontFamily: F.uiBold, fontSize: 11 }}>Auto</Txt>
          </View>
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
