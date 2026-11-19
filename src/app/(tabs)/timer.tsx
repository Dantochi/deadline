// Today: what is left of the day, counting down to midnight in hours, minutes and seconds, in the same dot digits
// as the life countdown. Under it, the day as 24 boxes (one per hour), lived hours grey, like the life grid.
// The rotate button turns it into a display piece: the countdown on its side, full screen, centred.
import { useKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronIcon, RotateIcon } from '../../components/icons';
import { RollingNumber } from '../../components/RollingNumber';
import { Txt, haptic } from '../../components/ui';
import { sessionsOn, toHM, fromHM } from '../../lib/schedule';
import { useStore } from '../../lib/store';
import { pad, hms, secondsLeftToday } from '../../lib/time';
import { urgency } from '../../lib/calendar';
import { F, R, S, T, palettes, statusColor, tint, usePalette } from '../../theme';

/** The countdown as a display piece: drawn on its side (the app itself stays in portrait), always dark, with the
 *  screen kept awake. Tap anywhere, or press back, to close. */
function LandscapeClock({ left, label, onClose }: { left: number; label: string; onClose: () => void }) {
  useKeepAwake();
  const d = palettes.dark;
  const [box, setBox] = useState({ w: 0, h: 0 });
  const hint = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.timing(hint, { toValue: 0, duration: 600, delay: 3000, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [hint]);
  const { w, h } = box; // the screen in portrait: w short, h long
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Tap to close`} onPress={onClose}
      onLayout={e => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ flex: 1, backgroundColor: d.bg }}>
      <StatusBar hidden />
      {w && h ? (
        // A landscape canvas (h wide, w tall) centred on the screen and turned a quarter, the countdown in the middle.
        <View style={{ position: 'absolute', left: (w - h) / 2, top: (h - w) / 2, width: h, height: w, transform: [{ rotate: '90deg' }],
          justifyContent: 'center', alignItems: 'center', paddingHorizontal: S.s7 }}>
          <RollingNumber value={left} text={hms(left)} fontSize={Math.floor(w * 0.42)} color={d.ink} accessibilityLabel={label} />
          <Txt variant="label" color={d.dim} allowFontScaling={false} style={{ marginTop: S.s3 }}>Left today</Txt>
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: S.s5, right: S.s7, opacity: hint }}>
            <Txt variant="label" color={d.dim} allowFontScaling={false}>Tap to close</Txt>
          </Animated.View>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function Today() {
  const p = usePalette();
  const { width } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  const [wide, setWide] = useState(false);

  // Tick once a second, on the second, only while this tab is showing.
  useFocusEffect(useCallback(() => {
    let id: ReturnType<typeof setTimeout>;
    const tick = () => { const d = new Date(); setNow(d); id = setTimeout(tick, 1000 - d.getMilliseconds() + 5); };
    tick();
    return () => clearTimeout(id);
  }, []));

  const left = secondsLeftToday(now), hour = now.getHours();
  const inner = width - S.page * 2;
  // Eight dot-matrix characters across the page width.
  const size = Math.floor(inner / 5.2);
  const box = (inner - 23 * S.s1) / 24;
  const hrs = Math.floor(left / 3600), mins = Math.floor((left % 3600) / 60);
  // The session happening now, or the next one today (refreshed each minute, not each second).
  const { state } = useStore();
  const minute = Math.floor(+now / 6e4);
  const next = useMemo(() => sessionsOn(state, +now).find(b => b.state === 'planned' && !b.t.pausedAt && !b.t.done && b.start + b.minutes * 6e4 > +now) ?? null,
    [state.tasks, minute]); // eslint-disable-line react-hooks/exhaustive-deps
  const label = `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'minute' : 'minutes'} left today`;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: S.page }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Show the countdown in landscape" onPress={() => { haptic.tick(); setWide(true); }}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <RotateIcon color={p.dim} />
        </Pressable>
      </View>
      <View style={{ flex: 1, paddingHorizontal: S.page, justifyContent: 'center' }}>
        <Txt variant="label" dim style={{ marginBottom: S.s3 }}>Left today</Txt>
        {/* The digits roll into place each second, like the life countdown. */}
        <RollingNumber value={left} text={hms(left)} fontSize={size} color={p.ink}
          accessibilityLabel={label} />

        {/* The day in hours: lived ones grey, this hour outlined, the rest still ahead. */}
        <View style={{ flexDirection: 'row', gap: S.s1, marginTop: S.s6 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length: 24 }, (_, h) => (
            <View key={h} style={{ width: box, height: box, backgroundColor: h < hour ? p.lived : p.ahead, borderWidth: h === hour ? 1 : 0, borderColor: p.ink }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.s2 }}>
          {['00', '06', '12', '18', '24'].map(l => <Txt key={l} variant="num" dim allowFontScaling={false} style={{ fontSize: T.xs, lineHeight: 16 }}>{l}</Txt>)}
        </View>

        {/* What's next today, so the screen answers "what now?" as well as "how long?". */}
        <NextSession next={next} now={+now} />
      </View>

      <Modal visible={wide} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setWide(false)}>
        {wide ? <LandscapeClock left={left} label={label} onClose={() => setWide(false)} /> : null}
      </Modal>
    </SafeAreaView>
  );
}

function NextSession({ next, now }: { next: ReturnType<typeof sessionsOn>[number] | null; now: number }) {
  const p = usePalette();
  if (!next) return <Txt variant="small" dim style={{ marginTop: S.s6 }}>No more sessions planned today.</Txt>;
  const c = next.t.color ?? statusColor(p, urgency(next.t));
  const s = new Date(next.start), hm = `${pad(s.getHours())}:${pad(s.getMinutes())}`;
  const range = `${hm} – ${toHM(fromHM(hm) + next.minutes)}`;
  const on = next.start <= now;
  const mins = Math.max(1, Math.round(((on ? next.start + next.minutes * 6e4 : next.start) - now) / 6e4));
  const away = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ''}`;
  const when = on ? `Now · ends in ${away}` : `Next · in ${away}`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${when}. ${next.t.title}, ${range}. Open task`}
      onPress={() => { haptic.tick(); router.push({ pathname: '/task', params: { id: next.t.id } }); }}
      style={({ pressed }) => ({ marginTop: S.s6, flexDirection: 'row', alignItems: 'center', gap: S.s3, minHeight: 72, paddingHorizontal: S.s4, paddingVertical: S.s3,
        borderRadius: R.md, borderLeftWidth: 3, borderLeftColor: c, backgroundColor: pressed ? tint(c, 0.24) : tint(c, 0.16) })}>
      <View style={{ flex: 1 }}>
        <Txt variant="small" style={{ fontFamily: F.uiSemi }}>{when}</Txt>
        <Txt style={{ fontFamily: F.uiSemi }} numberOfLines={1}>{next.t.title}</Txt>
        <Txt variant="small" style={{ fontVariant: ['tabular-nums'] }}>{range}</Txt>
      </View>
      <ChevronIcon size={18} color={p.ink} />
    </Pressable>
  );
}
