// Voice dictation for a text field: tap to start and tap again to stop, or hold to talk and let go. The recording
// (16 kHz mono AAC in an .m4a) goes to our API, which transcribes it (AssemblyAI) and tidies it (Gemini); the
// cleaned text comes back through onTranscript. States: idle, recording (pulsing ring), processing (spinner).
import { AudioQuality, IOSOutputFormat, getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type RecordingOptions } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReduceMotion } from './Motion';
import { MicIcon } from './Voice';
import { haptic } from './ui';
import { DictationError, dictate, dictationAvailable } from '../lib/dictate';
import { usePalette } from '../theme';

/** Small files for speech: one channel, 16 kHz, AAC at 32 kbps in an MPEG-4 (.m4a) container. */
const SPEECH: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 32000,
  android: { extension: '.m4a', outputFormat: 'mpeg4', audioEncoder: 'aac', sampleRate: 16000 },
  ios: { extension: '.m4a', outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.MEDIUM, sampleRate: 16000 },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};
const HOLD_MS = 400; // a press longer than this is hold-to-talk: letting go stops it
const MIN_MS = 500; // shorter than this is a mis-tap, not speech
const MAX_MS = 5 * 60_000; // a dictation, not a meeting

type Phase = 'idle' | 'recording' | 'processing';

/** Asks for the microphone when needed, and explains what to do if the answer was no. */
async function micAllowed(): Promise<boolean> {
  let perm = await getRecordingPermissionsAsync();
  if (!perm.granted && perm.canAskAgain) perm = await requestRecordingPermissionsAsync();
  if (perm.granted) return true;
  Alert.alert(
    'Microphone is off for Deadline',
    perm.canAskAgain
      ? 'Dictation needs the microphone to hear you. Tap the mic again and choose Allow.'
      : 'Dictation needs the microphone to hear you. Turn it on for Deadline in your phone’s settings.',
    perm.canAskAgain ? [{ text: 'OK' }] : [{ text: 'Not now', style: 'cancel' }, { text: 'Open settings', onPress: () => Linking.openSettings() }],
  );
  return false;
}

export function DictationButton({ onTranscript, size = 44, style }: { onTranscript: (text: string) => void; size?: number; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  const reduce = useReduceMotion();
  const recorder = useAudioRecorder(SPEECH);
  const [phase, setPhaseState] = useState<Phase>('idle');
  // The phase is mirrored in a ref: press handlers and timers read it after awaits, when a render's copy is stale.
  const now = useRef<Phase>('idle');
  const setPhase = (v: Phase) => { now.current = v; setPhaseState(v); };
  const started = useRef(0), pressedAt = useRef(0), fromIdle = useRef(false), stopWhenReady = useRef(false);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ring] = useState(() => new Animated.Value(0));
  const latest = useRef(onTranscript);
  useEffect(() => { latest.current = onTranscript; }, [onTranscript]);

  // Pulsing ring while recording.
  useEffect(() => {
    if (phase !== 'recording' || reduce) { ring.setValue(0); return; }
    const a = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1100, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [phase, reduce, ring]);

  // Never leave the microphone on if the screen closes mid-recording.
  useEffect(() => () => {
    if (limit.current) clearTimeout(limit.current);
    recorder.stop().catch(() => {});
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [recorder]);

  const starting = useRef(false);
  const start = async () => {
    if (starting.current) return;
    starting.current = true;
    try { await begin(); } finally { starting.current = false; }
  };
  const begin = async () => {
    if (!dictationAvailable) { Alert.alert('Dictation isn’t set up', 'This build has no dictation server (EXPO_PUBLIC_API_URL).'); return; }
    if (!(await micAllowed())) return;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      started.current = Date.now();
      haptic.tick();
      setPhase('recording');
      limit.current = setTimeout(() => { finish(); }, MAX_MS);
      // Released (hold-to-talk) while the microphone was still being asked for or set up: nothing to send yet.
      if (stopWhenReady.current) { stopWhenReady.current = false; finish(); }
    } catch {
      setPhase('idle');
      Alert.alert('Couldn’t start recording', 'Another app may be using the microphone. Try again in a moment.');
    }
  };

  const finish = async () => {
    if (now.current !== 'recording') return;
    if (limit.current) { clearTimeout(limit.current); limit.current = null; }
    const long = Date.now() - started.current;
    setPhase('processing');
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
      const uri = recorder.uri;
      if (!uri || long < MIN_MS) { setPhase('idle'); return; }
      const text = await dictate(uri);
      if (text) { haptic.ok(); latest.current(text); }
      else Alert.alert('Didn’t catch that', 'No speech was heard. Try again a little closer to the phone.');
    } catch (e) {
      haptic.warn();
      Alert.alert('Couldn’t transcribe', e instanceof DictationError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setPhase('idle');
    }
  };

  // Tap toggles; a press held past HOLD_MS is hold-to-talk and stops when released.
  const onPressIn = () => {
    pressedAt.current = Date.now();
    fromIdle.current = now.current === 'idle';
    stopWhenReady.current = false;
    if (fromIdle.current) start();
  };
  const onPressOut = () => {
    const held = Date.now() - pressedAt.current;
    if (fromIdle.current && held < HOLD_MS) return; // a tap: keep recording until the next tap
    if (now.current === 'recording') finish(); // second tap, or the end of a hold
    else if (fromIdle.current && now.current === 'idle') stopWhenReady.current = true; // held, but not started yet
  };

  const recording = phase === 'recording', busy = phase === 'processing';
  const label = busy ? 'Transcribing' : recording ? 'Stop dictation' : 'Dictate';
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {recording ? (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: p.redInk,
          opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }),
          transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        }} />
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={recording ? 'Tap or let go to stop and transcribe' : 'Tap to start, or hold to talk'}
        accessibilityState={{ busy, disabled: busy }} disabled={busy} hitSlop={6} onPressIn={onPressIn} onPressOut={onPressOut}
        style={({ pressed }) => ({
          width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
          backgroundColor: recording ? p.redInk : p.raise2, transform: [{ scale: pressed ? 0.94 : 1 }],
        })}>
        {busy ? <ActivityIndicator size="small" color={p.ink} /> : <MicIcon color={recording ? p.bg : p.ink} size={Math.round(size * 0.48)} />}
      </Pressable>
    </View>
  );
}
