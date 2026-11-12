// Date and time fields. Android opens the system dialog; iOS shows the compact native picker.
import RNDateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { fdate, pad } from '../lib/time';
import { F, H, R, S, T, usePalette } from '../theme';
import { DateTitle, Txt } from './ui';

type Props = { value: Date; onChange: (d: Date) => void; mode: 'date' | 'time'; minimumDate?: Date; maximumDate?: Date; label: string };

export function DateTimeField({ value, onChange, mode, minimumDate, maximumDate, label }: Props) {
  const p = usePalette();
  if (Platform.OS === 'ios') {
    return (
      <View style={[styles.field, { borderColor: p.hairline, backgroundColor: p.raise2, alignItems: 'flex-start' }]}>
        <RNDateTimePicker value={value} mode={mode} display="compact" minimumDate={minimumDate} maximumDate={maximumDate}
          accessibilityLabel={label} onValueChange={(_, d) => onChange(d)} />
      </View>
    );
  }
  const text = mode === 'date' ? fdate(+value) : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${text}`}
      onPress={() => DateTimePickerAndroid.open({ value, mode, is24Hour: true, minimumDate, maximumDate, onValueChange: (_, d) => onChange(d) })}
      style={({ pressed }) => [styles.field, { borderColor: p.hairline, backgroundColor: p.raise2, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {mode === 'date'
        ? <DateTitle date={value} month="short" size={T.md} style={{ fontFamily: F.uiMedium }} />
        : <Txt style={{ fontFamily: F.dot, fontSize: T.lg, lineHeight: 24 }}>{text}</Txt>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: H.lg, borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: S.s4, justifyContent: 'center' },
});
