// Settings → Wisdom for your work: change the career (or the one being studied for), pick creators, or turn it off.
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CareerSetup } from '../components/CareerSetup';
import { CloseIcon } from '../components/icons';
import { Btn, IconButton, Txt, haptic, useToast } from '../components/ui';
import { useStore } from '../lib/store';
import { S, usePalette } from '../theme';

export default function CareerScreen() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
          <Txt variant="h2" style={{ flex: 1 }}>Wisdom for your work</Txt>
          <IconButton accessibilityLabel="Close" onPress={() => router.back()} style={{ marginRight: -8 }}>
            <CloseIcon color={p.dim} />
          </IconButton>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s4, paddingBottom: S.s8, gap: S.s7 }} keyboardShouldPersistTaps="handled">
          <Txt dim>Articles and videos from people in your field, on the Wisdom tab. Only your career and the names you pick are sent to Google to find them.</Txt>
          <CareerSetup initial={state.career} onDone={c => { update(s => ({ ...s, career: c })); haptic.ok(); toast('Saved'); router.back(); }} />
          {state.career ? (
            <Btn kind="ghost" label="Turn off" onPress={() => { update(s => ({ ...s, career: null })); toast('Wisdom is back to the general collection'); router.back(); }} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
