// Task building blocks shared by the date screens: the task row (tap to open, swipe to finish or delete), the
// delete-with-undo hook, and the weekly review and partner cards.
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import { Glass } from './Glass';
import { CheckIcon, CloseIcon } from './icons';
import { StatusDot, Txt, haptic, useToast } from './ui';
import { mondayOf, otherSide, usePartner } from '../lib/partner';
import { reviewDue, weekKey, weekReview } from '../lib/review';
import { useStore, type Task } from '../lib/store';
import { info, leftShort, ymd } from '../lib/time';
import { F, R, S, statusColor, usePalette } from '../theme';

// On Sunday and Monday, until opened or dismissed: a door into the weekly review.
export function ReviewCard() {
  const { state, update } = useStore();
  const p = usePalette();
  if (!reviewDue(state)) return null;
  const r = weekReview(state);
  return (
    <View style={{ marginTop: S.s5, flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, backgroundColor: p.raise }}>
      <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/review'); }} style={{ flex: 1, padding: S.s4, gap: 2 }}>
        <Txt style={{ fontFamily: F.uiBold }}>Your week is ready</Txt>
        <Txt variant="meta" dim>{r.finished.length} finished · {r.needYou.length} {r.needYou.length === 1 ? 'needs' : 'need'} you · {r.sessions} sessions</Txt>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={() => update(s => ({ ...s, reviewSeen: weekKey() }))}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: S.s1 }}>
        <CloseIcon color={p.dim} />
      </Pressable>
    </View>
  );
}

export function PartnerCard() {
  const P = usePartner();
  const p = usePalette();
  const pending = P.incoming[0];
  if (!P.active && !pending) return null;
  const o = P.active ? otherSide(P.active, P.user!.uid) : null, pr = P.progress;
  const line = pending ? `${pending.fromName || `@${pending.fromUsername}`} wants you as their accountability partner`
    : !pr || pr.week !== ymd(mondayOf()) ? 'No update this week yet'
      : `${pr.sessions} ${pr.sessions === 1 ? 'session' : 'sessions'} kept${pr.missed ? ` · ${pr.missed} missed` : ''}${pr.red + pr.over ? ` · ${pr.red + pr.over} need attention` : ''}`;
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); router.push('/partner'); }}
      style={({ pressed }) => ({ marginTop: S.s5, padding: S.s4, borderRadius: R.lg, backgroundColor: p.raise, gap: 2, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
      <Txt variant="label" dim>{pending ? 'Partner request' : `${o!.name || `@${o!.username}`}'s week`}</Txt>
      <Txt variant="meta">{line}</Txt>
    </Pressable>
  );
}

/** Deletes a task with an Undo toast. Shared by the task screen and swipe-to-delete on rows. */
export function useDeleteTask() {
  const { update } = useStore();
  const toast = useToast();
  return (t: Task) => {
    update(s => ({ ...s, tasks: s.tasks.filter(x => x.id !== t.id) }));
    haptic.warn();
    toast(`Deleted “${t.title}”`, 6000, { label: 'Undo', onPress: () => update(s => ({ ...s, tasks: [...s.tasks, t] })) });
  };
}

/** A task in a list: tap to open its screen; swipe right to mark it done, left to delete (both with Undo);
 *  press and hold for a "View on timeline" button that opens the Day tab on `date` (default today). */
export function TaskRow({ t, date }: { t: Task; date?: string }) {
  const { state, updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const del = useDeleteTask();
  const { left, st } = info(t);
  const paused = !!t.pausedAt && !t.done;
  const label = t.done ? (t.letGo ? 'Let go' : 'Done') : paused ? 'Paused' : leftShort(left);
  const x = useRef(new Animated.Value(0)).current;
  const tRef = useRef(t);
  tRef.current = t;
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => x.setValue(g.dx),
    onPanResponderRelease: (_, g) => {
      const cur = tRef.current;
      if (g.dx < -110) {
        Animated.timing(x, { toValue: -500, duration: 160, useNativeDriver: true }).start(() => { del(cur); x.setValue(0); });
      } else if (g.dx > 110 && !cur.done) {
        Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
        updateTask(cur.id, y => ({ ...y, done: true, doneAt: Date.now() }));
        haptic.ok();
        toast(`Done: ${cur.title}`, 6000, { label: 'Undo', onPress: () => updateTask(cur.id, y => ({ ...y, done: false, doneAt: undefined })) });
      } else {
        Animated.spring(x, { toValue: 0, useNativeDriver: true }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, useNativeDriver: true }).start(),
  })).current;
  const [menu, setMenu] = useState(false);
  useEffect(() => { if (!menu) return; const id = setTimeout(() => setMenu(false), 4000); return () => clearTimeout(id); }, [menu]);
  const showDone = x.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: 'clamp' });
  const showDel = x.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: p.line, overflow: 'hidden' }}>
      {/* What a swipe will do, revealed underneath. */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.s4, backgroundColor: p.raise }}>
        <Animated.View style={{ opacity: showDone, flexDirection: 'row', alignItems: 'center', gap: S.s2 }}><CheckIcon color={statusColor(p, 'green', true)} /><Txt style={{ fontFamily: F.uiSemi }} color={statusColor(p, 'green', true)}>{t.done ? '' : 'Done'}</Txt></Animated.View>
        <Animated.View style={{ opacity: showDel }}><Txt style={{ fontFamily: F.uiSemi }} color={p.redInk}>Delete</Txt></Animated.View>
      </Animated.View>
      <Animated.View {...swipe.panHandlers} style={{ transform: [{ translateX: x }], backgroundColor: p.bg }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t.title}, ${label}`} accessibilityHint="Opens the task. Swipe right for done, left to delete."
          onPress={() => { if (menu) return setMenu(false); haptic.tick(); router.push({ pathname: '/task', params: { id: t.id } }); }}
          onLongPress={() => { haptic.ok(); setMenu(true); }} delayLongPress={380}
          style={({ pressed }) => ({ height: 64, flexDirection: 'row', alignItems: 'center', gap: S.s4, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ width: 12, alignItems: 'center' }}><StatusDot st={st} shapes={state.shapes} /></View>
          <Txt numberOfLines={1} style={[{ flex: 1 }, t.done && { color: p.dim, textDecorationLine: 'line-through' }]}>{t.title}</Txt>
          <Txt variant="meta" dim>{label}</Txt>
        </Pressable>
        {menu ? (
          <View style={{ paddingBottom: S.s3, paddingLeft: 12 + S.s4, flexDirection: 'row' }}>
            <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setMenu(false); router.push({ pathname: '/hours', params: { date: date ?? ymd(new Date()) } }); }}>
              <Glass radius={22} style={{ height: 44, paddingHorizontal: S.s4, justifyContent: 'center' }}>
                <Txt style={{ fontFamily: F.uiSemi }}>View on timeline</Txt>
              </Glass>
            </Pressable>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
