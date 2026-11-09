// Two round buttons of the same size stacked at the bottom right: + (new task) and, above it, a flag (mark an
// important date).
// Their labels appear as a tooltip while pressed and held, so the screen itself carries no instruction text.
import { useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PlusIcon } from './icons';
import { Txt, haptic } from './ui';
import { F, S, usePalette } from '../theme';

const FlagIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 21V4M6 4h11l-2 4 2 4H6" /></Svg>
);

function Fab({ size, label, icon, onPress, solid }: { size: number; label: string; icon: React.ReactNode; onPress: () => void; solid?: boolean }) {
  const p = usePalette();
  const [tip, setTip] = useState(false);
  const shown = useRef(false);
  const o = useRef(new Animated.Value(0)).current;
  const show = (v: boolean) => { shown.current = v; setTip(v); Animated.timing(o, { toValue: v ? 1 : 0, duration: 140, useNativeDriver: true }).start(); };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
      {tip ? (
        <Animated.View pointerEvents="none" style={{ opacity: o, backgroundColor: p.ink, paddingHorizontal: S.s3, height: 36, justifyContent: 'center' }}>
          <Txt variant="small" style={{ fontFamily: F.uiSemi }} color={p.bg}>{label}</Txt>
        </Animated.View>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { if (shown.current) return; haptic.tick(); onPress(); }}
        onLongPress={() => { haptic.tick(); show(true); }} onPressOut={() => { if (shown.current) setTimeout(() => show(false), 900); }} delayLongPress={350}
        style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
          backgroundColor: solid ? p.ink : p.bar, borderWidth: solid ? 0 : 1, borderColor: p.glassEdge, borderTopColor: solid ? undefined : p.glassHi, transform: [{ scale: pressed ? 0.94 : 1 }],
          shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 })}>
        {icon}
      </Pressable>
    </View>
  );
}

export function TaskFabs({ onTask, onDate }: { onTask?: () => void; onDate: () => void }) {
  const p = usePalette();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 20, bottom: 28, alignItems: 'flex-end', gap: S.s3 }}>
      <Fab size={56} label="Mark as an important date" icon={<FlagIcon color={p.ink} />} onPress={onDate} />
      {onTask ? <Fab size={56} solid label="New task" icon={<PlusIcon color={p.bg} />} onPress={onTask} /> : null}
    </View>
  );
}
