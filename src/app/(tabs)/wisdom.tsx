import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Animated, Linking, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowOutIcon, BookIcon, ChevronIcon, HeartIcon, PlayIcon } from '../../components/icons';
import { GlassSegment } from '../../components/Glass';
import { IconButton, Txt, haptic, useToast } from '../../components/ui';
import { creatorLink, workLink } from '../../lib/career';
import { useStore } from '../../lib/store';
import { QUOTES, READ, WATCH, quoteKey, quoteOfTheDay, type Link } from '../../lib/wisdom';
import { F, H, R, S, T, usePalette } from '../../theme';

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
    <IconButton accessibilityLabel={label} accessibilityState={pressed != null ? { selected: pressed } : undefined}
      onPress={onPress}>
      {icon}
    </IconButton>
  );

  // Wisdom for your work: the picked creators, each with up to two of their best-known works. Every link is a
  // search for a real name or title (YouTube for videos and talks, the web otherwise).
  const career = state.career;
  const field = career ? career.title.replace(/^studying\s+/i, '') : '';
  const work: Link[] = career ? career.creators.flatMap(c => [
    { title: c.name, by: c.why ?? (c.kind === 'youtube' ? 'YouTube' : c.kind === 'podcast' ? 'Podcast' : c.kind === 'blog' ? 'Writing' : 'Books and talks'), url: creatorLink(c, field) },
    ...c.works.slice(0, 2).map(w => ({ title: w.title, by: `${c.name} · ${w.type}`, url: workLink(w, c) })),
  ]).slice(0, 12) : [];

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s6, paddingBottom: S.s7 }}>
        <Txt variant="h1">Wisdom</Txt>
        <Txt dim style={{ marginTop: S.s2 }}>From people who spent their time well.</Txt>

        {saved.length ? (
          <GlassSegment options={['All', `Saved ${saved.length}`]} height={H.md} fontSize={T.sm} style={{ marginTop: S.s5 }}
            value={onlySaved ? `Saved ${saved.length}` : 'All'}
            onChange={v => { if (v === 'All') { setOnlySaved(false); setI(quoteOfTheDay()); } else { setOnlySaved(true); setI(0); } }} />
        ) : null}

        {q ? (
          <View {...swipe.panHandlers} style={{ marginTop: S.s5, paddingTop: S.s6, paddingHorizontal: S.s5, paddingBottom: S.s2, backgroundColor: p.raise, borderRadius: R.lg, borderWidth: 1, borderColor: p.hairline, gap: 18 }}>
            <Txt aria-hidden style={{ fontFamily: F.dot, fontSize: 64, lineHeight: 40, height: 34, color: p.dim }}>“</Txt>
            <Animated.View style={{ opacity: fade, gap: 18 }} accessibilityLiveRegion="polite">
              {/* Fixed size: five lines for every quote (long ones scale down to fit), so the card never changes height. */}
              <View style={{ height: 32 * 5, justifyContent: 'center' }}>
                <Txt numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.65} style={{ fontFamily: F.uiMedium, fontSize: 24, lineHeight: 32 }}>{q.q}</Txt>
              </View>
              <View style={{ height: 44, justifyContent: 'center' }}>
                <Txt numberOfLines={1} style={{ fontFamily: F.uiBold }}>{q.who}</Txt>
                <Txt numberOfLines={1} variant="small" dim>{q.src}</Txt>
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

        {career && work.length ? (
          <>
            {shelf('For your work', work, false)}
            <Pressable accessibilityRole="button" onPress={() => router.push('/career')} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Txt variant="small" dim>{career.student ? 'Studying for' : 'Based on'} {career.title} · <Txt variant="small" style={{ fontFamily: F.uiSemi }}>Edit</Txt></Txt>
            </Pressable>
          </>
        ) : null}
        {shelf('Read', READ, false)}
        {shelf('Watch', WATCH, true)}
      </ScrollView>
    </SafeAreaView>
  );
}
