import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowOutIcon, BookIcon, ChevronIcon, HeartIcon, PlayIcon } from '../../components/icons';
import { Chip, Txt, haptic, useToast } from '../../components/ui';
import { useStore } from '../../lib/store';
import { QUOTES, READ, WATCH, quoteKey, quoteOfTheDay, type Link } from '../../lib/wisdom';
import { F, R, S, usePalette } from '../../theme';

export default function Wisdom() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const saved = state.saved ?? [];
  const [onlySaved, setOnlySaved] = useState(false);
  const list = useMemo(() => (onlySaved ? QUOTES.filter(q => saved.includes(quoteKey(q))) : QUOTES), [onlySaved, saved]);
  const [i, setI] = useState(quoteOfTheDay());
  const idx = list.length ? ((i % list.length) + list.length) % list.length : 0;
  const q = list[idx];
  const isSaved = q ? saved.includes(quoteKey(q)) : false;

  // A short cross-fade between quotes so the card never jumps.
  const fade = useRef(new Animated.Value(1)).current;
  const go = (n: number) => {
    if (list.length < 2) return;
    haptic.tick();
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setI(x => x + n);
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };
  const goRef = useRef(go);
  goRef.current = go;
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => { if (Math.abs(g.dx) > 50) goRef.current(g.dx < 0 ? 1 : -1); },
  })).current;

  useEffect(() => { if (onlySaved && !list.length) setOnlySaved(false); }, [onlySaved, list.length]);

  const toggleSave = () => {
    if (!q) return;
    const k = quoteKey(q), on = !saved.includes(k);
    haptic.tick();
    update(s => ({ ...s, saved: on ? [...(s.saved ?? []), k] : (s.saved ?? []).filter(x => x !== k) }));
    toast(on ? 'Saved' : 'Removed from saved');
  };

  const iconBtn = (label: string, onPress: () => void, icon: React.ReactNode, pressed?: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={pressed != null ? { selected: pressed } : undefined}
      onPress={onPress} hitSlop={4} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Pressable>
  );

  const shelf = (title: string, links: Link[], video: boolean) => (
    <View style={{ marginTop: S.s7 }}>
      <Txt variant="label" dim style={{ marginBottom: S.s1 }}>{title}</Txt>
      {links.map(l => (
        <Pressable key={l.url} accessibilityRole="link" accessibilityLabel={`${l.title}. ${l.by}`} onPress={() => { haptic.tick(); Linking.openURL(l.url).catch(() => toast('Could not open the link')); }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ width: 44, height: 44, borderRadius: R.sm, backgroundColor: p.raise2, alignItems: 'center', justifyContent: 'center' }}>
            {video ? <PlayIcon color={p.dim} /> : <BookIcon color={p.dim} />}
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: F.uiSemi }}>{l.title}</Txt>
            <Txt variant="small" dim>{l.by}</Txt>
          </View>
          <ArrowOutIcon color={p.dim} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s6, paddingBottom: S.s7 }}>
        <Txt variant="h1">Wisdom</Txt>
        <Txt dim style={{ marginTop: S.s2 }}>From people who spent their time well.</Txt>

        {saved.length ? (
          <View style={{ flexDirection: 'row', gap: S.s1, marginTop: S.s5 }}>
            <View style={{ flex: 1 }}><Chip label="All" on={!onlySaved} onPress={() => { setOnlySaved(false); setI(quoteOfTheDay()); }} /></View>
            <View style={{ flex: 1 }}><Chip label={`Saved ${saved.length}`} on={onlySaved} onPress={() => { setOnlySaved(true); setI(0); }} /></View>
          </View>
        ) : null}

        {q ? (
          <View {...swipe.panHandlers} style={{ marginTop: S.s5, paddingTop: S.s6, paddingHorizontal: S.s5, paddingBottom: S.s2, backgroundColor: p.raise, borderRadius: R.xl, gap: 18 }}>
            <Txt aria-hidden style={{ fontFamily: F.dot, fontSize: 64, lineHeight: 40, height: 34, color: p.dim }}>“</Txt>
            <Animated.View style={{ opacity: fade, gap: 18 }} accessibilityLiveRegion="polite">
              <Txt style={{ fontFamily: F.uiMedium, fontSize: 23, lineHeight: 30, letterSpacing: -0.3, minHeight: 30 * 4 }}>{q.q}</Txt>
              <View>
                <Txt style={{ fontFamily: F.uiBold }}>{q.who}</Txt>
                <Txt variant="small" dim>{q.src}</Txt>
              </View>
            </Animated.View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -12 }}>
              {iconBtn('Previous quote', () => go(-1), <ChevronIcon left color={p.ink} />)}
              <Txt variant="small" dim style={{ flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{idx + 1} / {list.length}</Txt>
              {iconBtn(isSaved ? 'Remove from saved' : 'Save quote', toggleSave, <HeartIcon filled={isSaved} color={isSaved ? p.redInk : p.ink} />, isSaved)}
              {iconBtn('Next quote', () => go(1), <ChevronIcon color={p.ink} />)}
            </View>
          </View>
        ) : null}

        {shelf('Read', READ, false)}
        {shelf('Watch', WATCH, true)}
      </ScrollView>
    </SafeAreaView>
  );
}
