// A bottom sheet: a dimmed backdrop (tap to close), a raised panel with a title, the content, and Done.
// Used for the short choices on New task (deadline, schedule) so the form itself stays three rows.
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Txt } from './ui';
import { R, S, usePalette } from '../theme';

export function Sheet({ open, title, onClose, children, doneLabel = 'Done' }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; doneLabel?: string;
}) {
  const p = usePalette();
  const inset = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: p.scrim }} />
        {/* Outer radius 28 with 24 inside, so controls inside use small radii (8–12) or full pills; lifted by a
            soft wide shadow rather than an outline. */}
        <View accessibilityViewIsModal style={{ backgroundColor: p.raise, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, paddingHorizontal: S.page, paddingTop: S.s3, paddingBottom: S.s5 + inset.bottom, gap: S.s4,
          shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 32, shadowOffset: { width: 0, height: -8 }, elevation: 16 }}>
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: p.hair }} />
          <Txt variant="h2" accessibilityRole="header">{title}</Txt>
          {children}
          <Btn kind="primary" label={doneLabel} onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
