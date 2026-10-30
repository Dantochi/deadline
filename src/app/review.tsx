// Your week: the weekly review. Opens from the Sunday notification, the card on the Tasks tab, or Settings.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon } from '../components/icons';
import { Btn, StatusDot, Txt } from '../components/ui';
import { otherSide, usePartner, weekSummary } from '../lib/partner';
import { weekKey, weekReview } from '../lib/review';
import { useStore } from '../lib/store';
import { fdate, fmt, fshort, info, leftShort, whenLine } from '../lib/time';
import { F, R, S, statusColor, usePalette } from '../theme';

export default function Review() {
  const { state, update } = useStore();
  const P = usePartner();
  const p = usePalette();
  const r = weekReview(state);
  useEffect(() => { if (state.reviewSeen !== weekKey()) update(s => ({ ...s, reviewSeen: weekKey() })); }, [state.reviewSeen, update]);

  const stat = (n: number, label: string, color?: string) => (
    <View style={{ flex: 1, padding: S.s3, borderRadius: R.md, backgroundColor: p.bg }}>
      <Txt style={{ fontFamily: F.dot, fontSize: 34, lineHeight: 40 }} color={color}>{fmt(n)}</Txt>
      <Txt variant="small" dim>{label}</Txt>
    </View>
  );
  const partner = P.active && P.user ? otherSide(P.active, P.user.uid) : null;
  const mine = P.profile ? weekSummary(state, P.profile) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <View style={{ flex: 1 }}>
          <Txt variant="h2">Your week</Txt>
          <Txt variant="small" dim>{fshort(r.from)} – {fdate(Date.now())}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s4, paddingBottom: S.s8, gap: S.s4 }}>
        <View style={{ flexDirection: 'row', gap: S.s2 }}>
          {stat(r.finished.length, 'finished', statusColor(p, 'green', true))}
          {stat(r.needYou.length, r.needYou.length === 1 ? 'needs you' : 'need you', r.needYou.length ? statusColor(p, 'red', true) : undefined)}
          {stat(r.sessions, r.sessions === 1 ? 'session done' : 'sessions done')}
        </View>
        {r.missed ? <Txt variant="meta" dim>{r.missed} {r.missed === 1 ? 'session' : 'sessions'} didn't happen. That's normal; the ones you kept still count.</Txt> : null}

        {r.focus ? (
          <View style={{ gap: S.s1, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
            <Txt variant="label" dim>Focus next week</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
              <StatusDot st={info(r.focus).st} shapes={state.shapes} />
              <Txt variant="h2" style={{ flex: 1 }} numberOfLines={2}>{r.focus.title}</Txt>
            </View>
            <Txt variant="meta" dim>{leftShort(info(r.focus).left)} left{whenLine(r.focus) ? ` · next session ${whenLine(r.focus)}` : ''}</Txt>
            {!whenLine(r.focus) ? <Txt variant="small" dim>Reserving a time makes it far more likely to happen. Open the task to add one.</Txt> : null}
          </View>
        ) : null}

        {r.finished.length ? (
          <View>
            <Txt variant="label" dim style={{ marginBottom: S.s1 }}>Finished</Txt>
            {r.finished.map(t => <Txt key={t.id} variant="meta" style={{ paddingVertical: 6 }}>✓ {t.title}</Txt>)}
          </View>
        ) : null}

        {r.comingUp.length ? (
          <View>
            <Txt variant="label" dim style={{ marginBottom: S.s1 }}>Important dates this week and next</Txt>
            {r.comingUp.map(e => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, paddingVertical: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: e.color }} />
                <Txt variant="meta">{e.title}</Txt>
              </View>
            ))}
          </View>
        ) : null}

        {partner && mine ? (
          <View style={{ gap: S.s1, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
            <Txt variant="label" dim>What {partner.name || `@${partner.username}`} sees</Txt>
            <Txt variant="meta">{mine.sessions} sessions kept{mine.missed ? ` · ${mine.missed} missed` : ''}{mine.done ? ` · ${mine.done} finished` : ''}. {state.shareTitles === false ? 'Counts only, no task titles.' : 'With your task titles.'} Never your notes.</Txt>
            <Btn kind="ghost" label={`See ${partner.name || 'their'} week`} onPress={() => router.push('/partner')} />
          </View>
        ) : (
          <Btn kind="ghost" label="Share your week with a partner" onPress={() => router.push('/partner')} />
        )}
        <Txt variant="small" dim>Your review arrives every Sunday at 18:00.</Txt>
      </ScrollView>
    </SafeAreaView>
  );
}
