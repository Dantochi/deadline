// When a session runs: start on top, end below, both in large digits, typed on a number pad. Typing fills HH:MM
// from the left ("730" is 07:30); a finished start moves on to the end. The length is worked out from the two,
// and an end earlier than the start is read as after midnight. Digits that can't make a time are refused with a
// shake, so a wrong time can't be entered.
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { CloseIcon } from './icons';
import { Txt, haptic } from './ui';
import { bufTime, fromHM, keyTime, lengthBetween, toHM } from '../lib/schedule';
import { F, R, S, usePalette } from '../theme';

export const lenText = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} h`);

type Props = {
  open: boolean; start: string; minutes: number;
  onDone: (start: string, minutes: number) => void; onClose: () => void;
  /** A note about the chosen time (e.g. a clash with another session), or null. */
  note?: (start: string, minutes: number) => string | null;
};

export function TimeSheet({ open, start, minutes, onDone, onClose, note }: Props) {
  const p = usePalette();
  const [active, setActive] = useState<'start' | 'end'>('start');
  const [s, setS] = useState(start);
  const [e, setE] = useState(toHM(fromHM(start) + minutes));
  const [buf, setBuf] = useState('');
  const [endTyped, setEndTyped] = useState(false);
  const [err, setErr] = useState('');
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!open) return;
    setS(start); setE(toHM(fromHM(start) + minutes)); setActive('start'); setBuf(''); setEndTyped(false); setErr('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const nope = (why = '') => {
    haptic.warn(); setErr(why);
    Animated.sequence([10, -10, 6, -6, 0].map(v => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }))).start();
  };
  // The times as they stand, including what is being typed.
  const curS = active === 'start' && buf ? bufTime(buf)! : s;
  const curE = active === 'end' && buf ? bufTime(buf)! : e;
  const len = lengthBetween(curS, curE);

  const commit = (v: string, which = active) => {
    if (which === 'start') {
      // Until an end has been typed, keep the length and move the end with the start.
      const keep = lengthBetween(s, e) ?? minutes;
      setS(v); if (!endTyped) setE(toHM(fromHM(v) + keep));
      setActive('end');
    } else { setE(v); setEndTyped(true); }
    setBuf('');
  };
  const digit = (d: string) => {
    const nb = keyTime(buf, d);
    if (nb == null) return nope();
    haptic.tick(); setErr('');
    if (nb.length === 4) commit(bufTime(nb)!); else setBuf(nb);
  };
  const done = () => {
    const fs = active === 'start' && buf ? bufTime(buf)! : s, fe = active === 'end' && buf ? bufTime(buf)! : e;
    const n = lengthBetween(fs, fe);
    if (n == null) return nope('The end has to be after the start, within 16 hours.');
    haptic.ok(); onDone(fs, n); onClose();
  };
  const next = () => {
    if (active === 'start') { commit(buf ? bufTime(buf)! : s, 'start'); haptic.tick(); } else done();
  };

  const row = (which: 'start' | 'end', label: string, value: string) => {
    const on = active === which, typing = on && !!buf;
    // While typing: typed digits in ink, the rest as dim placeholders.
    const shown = typing ? (buf.length >= 2 ? `${buf.slice(0, 2)}:${buf.slice(2)}` : buf) : value;
    const rest = typing ? '--:--'.slice(shown.length) : '';
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value}`} accessibilityState={{ selected: on }}
        onPress={() => { haptic.tick(); setActive(which); setBuf(''); setErr(''); }} style={{ paddingVertical: S.s2 }}>
        <Txt variant="label" color={on ? p.ink : p.dim}>{label}</Txt>
        <Animated.View style={{ transform: [{ translateX: on ? shake : 0 }], flexDirection: 'row' }}>
          <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 76, lineHeight: 84 }} color={on && (typing || !buf) ? p.ink : p.dim}>{shown}</Txt>
          {rest ? <Txt allowFontScaling={false} style={{ fontFamily: F.dot, fontSize: 76, lineHeight: 84 }} color={p.glassHi}>{rest}</Txt> : null}
        </Animated.View>
      </Pressable>
    );
  };

  const key = (k: string, label: string, onPress: () => void, a11y?: string) => (
    <Pressable key={k} accessibilityRole="button" accessibilityLabel={a11y ?? label} onPress={onPress} style={{ flex: 1 }}>
      {({ pressed }) => (
        <Glass radius={R.lg} style={{ height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? p.glassOn : p.glass }}>
          <Txt allowFontScaling={false} style={{ fontFamily: /\d/.test(label) ? F.dot : F.uiSemi, fontSize: /\d/.test(label) ? 30 : 17, lineHeight: 36 }}>{label}</Txt>
        </Glass>
      )}
    </Pressable>
  );
  const warn = len != null && note ? note(curS, len) : null;

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg, paddingHorizontal: S.page }}>
        <View style={{ height: 64, flexDirection: 'row', alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={onClose} style={{ width: 48, height: 48, justifyContent: 'center', marginLeft: -12, alignItems: 'center' }}>
            <CloseIcon color={p.dim} />
          </Pressable>
          <Txt variant="h2" style={{ flex: 1, textAlign: 'center' }}>Session time</Txt>
          <Pressable accessibilityRole="button" onPress={done} hitSlop={8} style={{ height: 48, justifyContent: 'center', marginRight: -4 }}>
            <Txt style={{ fontFamily: F.uiSemi }}>Done</Txt>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          {row('start', 'Start', s)}
          <View style={{ height: 56, justifyContent: 'center' }}>
            <Txt dim>{err || (len != null ? `${lenText(len)}${fromHM(curE) <= fromHM(curS) ? ' · ends after midnight' : ''}` : '')}</Txt>
            {!err && warn ? <Txt variant="small" color={p.amberInk} numberOfLines={1}>{warn}</Txt> : null}
          </View>
          {row('end', 'End', e)}
        </View>

        <View style={{ gap: S.s2, paddingBottom: S.s4 }}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map(r => (
            <View key={r[0]} style={{ flexDirection: 'row', gap: S.s2 }}>{r.map(d => key(d, d, () => digit(d)))}</View>
          ))}
          <View style={{ flexDirection: 'row', gap: S.s2 }}>
            {key('del', '⌫', () => { haptic.tick(); setBuf(b => b.slice(0, -1)); setErr(''); }, 'Delete')}
            {key('0', '0', () => digit('0'))}
            {key('next', active === 'start' ? 'Next' : 'Done', next)}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
