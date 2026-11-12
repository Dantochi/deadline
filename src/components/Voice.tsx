// Say (or type) a task: "Write chapter three by Friday, weekdays at 7am for 45 minutes". The phone's own speech
// recogniser turns speech into text, in the phone's language (e.g. English (Nigeria)); lib/parse picks out the
// deadline, days, time and length; the form shows what was understood so it can be checked before saving.
// Listening stays on until tapped off (up to a minute): pauses to think don't end it, and if the phone's
// recogniser stops on its own (older Android ends after a silence), it quietly starts again and keeps the words.
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Btn, Txt, haptic } from './ui';
import { useReduceMotion } from './Motion';
import { F, R, S, usePalette } from '../theme';

export const MicIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round">
    <Rect x={9} y={3} width={6} height={11} rx={3} /><Path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
  </Svg>
);

const MAX_RESTARTS = 30;
const SILENCE: string[] = ['no-speech', 'speech-timeout'];
const locale = () => { try { return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US'; } catch { return 'en-US'; } };

export function VoiceSheet({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (text: string) => void }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const pulse = useRef(new Animated.Value(1)).current;
  const kept = useRef(''); // words already final, across restarts
  const want = useRef(false); // the person wants it listening
  const restarts = useRef(0);
  const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const join = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' ');

  useSpeechRecognitionEvent('start', () => setListening(true));
  useSpeechRecognitionEvent('end', () => {
    // Ended by the phone, not by a tap: carry on listening. The one-minute safety stop bounds the restarts.
    // A short gap lets the recogniser release the microphone first, or the restart fails as "busy".
    if (want.current && restarts.current < MAX_RESTARTS) { restarts.current++; setTimeout(() => { if (want.current) listen(); }, 150); return; }
    want.current = false; setListening(false);
  });
  useSpeechRecognitionEvent('result', e => {
    const said = e.results[0]?.transcript ?? '';
    if (e.isFinal) { kept.current = join(kept.current, said); setText(kept.current); }
    else setText(join(kept.current, said));
  });
  useSpeechRecognitionEvent('error', e => {
    // A pause in speech: Android reports it as an error ("speech-timeout" or "no-speech") and ends.
    // That is not a failure here; 'end' follows and listening starts again.
    if (want.current && SILENCE.includes(e.error) && restarts.current < MAX_RESTARTS) return;
    want.current = false;
    setListening(false);
    setError(e.error === 'not-allowed' ? 'Microphone access is off. You can type it instead.'
      : e.error === 'no-speech' ? "Didn't catch that. Try again, or type it." : 'Speech recognition stopped. You can type it instead.');
  });

  const listen = () => {
    try {
      ExpoSpeechRecognitionModule.start({
        lang: locale(), interimResults: true, continuous: true,
        // Android: wait longer before deciding the sentence is over (the default is about a second and a half).
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 5000,
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,
        },
      });
    } catch {
      want.current = false; setListening(false);
      setError('Speech recognition is not available on this phone. You can type it instead.');
    }
  };
  const start = async () => {
    setError('');
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) { setError('Microphone access is off. You can type it instead.'); return; }
      haptic.tick();
      want.current = true; restarts.current = 0;
      clearTimeout(limit.current);
      limit.current = setTimeout(() => stop(), 60000); // a safety stop after a minute
      listen();
    } catch {
      setError('Speech recognition is not available on this phone. You can type it instead.');
    }
  };
  const stop = () => {
    want.current = false; clearTimeout(limit.current);
    try { ExpoSpeechRecognitionModule.stop(); } catch { /* already stopped */ }
  };

  // Start listening as soon as the sheet opens.
  useEffect(() => {
    if (open) { setText(''); kept.current = ''; setError(''); start(); } else stop();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!listening || reduce) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [listening, reduce, pulse]);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => { stop(); onClose(); }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg, paddingHorizontal: S.page }}>
        <View style={{ height: 64, flexDirection: 'row', alignItems: 'center' }}>
          <Txt variant="h2" style={{ flex: 1 }}>Say the task</Txt>
          <Btn kind="ghost" size="sm" label="Cancel" onPress={() => { stop(); onClose(); }} />
        </View>
        <Txt dim>For example: “Write chapter three by Friday, weekdays at 7am for 45 minutes.”</Txt>

        <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop listening' : 'Start listening'} onPress={() => (listening ? stop() : start())}
              style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: listening ? p.redInk : p.ink }}>
              <MicIcon color={p.bg} size={36} />
            </Pressable>
          </Animated.View>
          <Txt variant="small" dim style={{ marginTop: S.s3 }}>{listening ? 'Listening… tap to stop' : 'Tap to speak'}</Txt>
        </View>

        <Txt variant="label" dim style={{ marginBottom: S.s2 }}>{error || 'What I heard (you can edit it)'}</Txt>
        <TextInput value={text} onChangeText={v => { setText(v); kept.current = v; }} multiline placeholder="Or type it here" placeholderTextColor={p.dim} maxFontSizeMultiplier={2}
          style={{ height: 120, padding: S.s4, backgroundColor: p.raise, borderRadius: R.md, borderWidth: 1, borderColor: p.hairline, color: p.ink, fontFamily: F.uiMedium, fontSize: 19, lineHeight: 26, textAlignVertical: 'top' }} />

        <Btn kind="primary" label="Fill in the task" disabled={!text.trim()} style={{ marginTop: S.s5 }}
          onPress={() => { stop(); haptic.ok(); onResult(text.trim()); onClose(); }} />
      </SafeAreaView>
    </Modal>
  );
}
