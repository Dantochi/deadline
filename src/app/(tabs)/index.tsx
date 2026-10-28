import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SlidersIcon } from '../../components/icons';
import { LifeGrid } from '../../components/LifeGrid';
import { RollingNumber } from '../../components/RollingNumber';
import { Chip, StatusDot, Txt } from '../../components/ui';
import { activeTasks, useStore } from '../../lib/store';
import { DAY, YEAR, addYears, ageYears, fdate, fmt, fshort, info, leftShort, parseBirth, weekEnd, weekNow, weekStart } from '../../lib/time';
import { F, S, usePalette } from '../../theme';

type Unit = 'weeks' | 'months' | 'years';

export default function Life() {
  const { state } = useStore();
  const p = usePalette();
  const { height } = useWindowDimensions();
  const [unit, setUnit] = useState<Unit>('weeks');
  const [sel, setSel] = useState<number | null>(null);
  const birth = parseBirth(state.birth);
  const wNow = weekNow(birth, state.life);

  useEffect(() => { if (sel == null) return; const t = setTimeout(() => setSel(null), 5000); return () => clearTimeout(t); }, [sel]);

  const left = useMemo(() => {
    const now = Date.now(), end = +addYears(birth, state.life);
    if (unit === 'weeks') return state.life * 52 - wNow;
    if (unit === 'years') return Math.max(0, Math.floor((end - now) / YEAR));
    return Math.max(0, Math.floor((end - now) / (YEAR / 12)));
  }, [unit, state.birth, state.life, wNow]);

  const today = new Date(), bday = birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate();
  const next = activeTasks(state)[0];

  const detail = sel != null ? (() => {
    const s = weekStart(birth, sel), e = weekEnd(birth, sel), age = Math.floor((s - +birth) / YEAR);
    const head = sel === wNow ? 'This week' : e <= Date.now() ? 'Lived' : `In ${fmt(sel - wNow)} weeks`;
    const hit = activeTasks(state).find(t => Math.max(t.start, Date.now()) < e && t.deadline > s);
    return { line: `${head} · age ${age} · ${fshort(s)} – ${fdate(e - DAY)}`, hit };
  })() : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      {/* The gutter sits on an inner View: percentage padding on SafeAreaView is dropped on Android. */}
      <View style={{ flex: 1, paddingHorizontal: '4.5%' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push('/settings')}
          style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <SlidersIcon color={p.dim} />
        </Pressable>
      </View>

      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {bday ? <Txt variant="label" dim>Happy birthday. A new row begins.</Txt> : null}
        <RollingNumber value={left} fontSize={120} color={p.ink} accessibilityLabel={`${fmt(left)} ${unit} left until ${state.life}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: S.s3, marginTop: S.s2, marginBottom: S.s5 }}>
          <Txt dim><Txt style={{ fontFamily: F.uiSemi }}>{unit} left</Txt> until {state.life}</Txt>
          <Txt dim><Txt style={{ fontFamily: F.uiSemi }}>{fmt(ageYears(birth))} years</Txt> lived</Txt>
        </View>
        {state.showGrid ? <LifeGrid state={state} maxHeight={height * 0.5} selected={sel} onSelect={setSel} /> : null}
      </View>

      <View style={{ minHeight: 52, justifyContent: 'center', marginTop: S.s3 }} accessibilityLiveRegion="polite">
        {detail ? (
          <>
            <Txt variant="meta" style={{ fontFamily: F.uiSemi }}>{detail.line}</Txt>
            {detail.hit ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><StatusDot st={info(detail.hit).st} shapes={state.shapes} size={8} /><Txt variant="meta" dim numberOfLines={1}>{detail.hit.title}</Txt></View> : null}
          </>
        ) : !state.showGrid && next ? (
          <Txt variant="meta" dim>Next deadline · {next.title} · {leftShort(info(next).left)}</Txt>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: S.s1, marginBottom: S.s3 }}>
        {(['weeks', 'months', 'years'] as Unit[]).map(u => (
          <View key={u} style={{ flex: 1 }}><Chip label={u[0].toUpperCase() + u.slice(1)} on={unit === u} onPress={() => setUnit(u)} /></View>
        ))}
      </View>
      </View>
    </SafeAreaView>
  );
}
