// A bottom sheet for one property of a form (deadline, schedule): a scrim, a raised card with a grab handle and a
// title, then the controls. Tap the scrim, drag the handle down, or press Done to close.
import { useMemo, useState, type ReactNode } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Txt } from './ui';
import { R, S, usePalette } from '../theme';

export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(0));
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80 || g.vy > 0.8) { onClose(); y.setValue(0); }
      else Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
    },
  }), [y, onClose]);
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: p.scrim }} />
        <Animated.View style={{
          transform: [{ translateY: y }], backgroundColor: p.raise, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
          borderWidth: 1, borderBottomWidth: 0, borderColor: p.hairline,
          paddingHorizontal: S.page, paddingBottom: insets.bottom + S.s4,
        }}>
          <View {...pan.panHandlers} style={{ paddingTop: S.s2, paddingBottom: S.s3 }}>
            <View style={{ alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: p.line }} />
            <Txt variant="h2" style={{ marginTop: S.s3 }}>{title}</Txt>
          </View>
          <View style={{ gap: S.s4 }}>{children}</View>
          <Btn kind="primary" label="Done" onPress={onClose} style={{ marginTop: S.s5 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}
