import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorSwatches } from '../../components/ColorSwatches';
import { CheckIcon, CloseIcon, PauseIcon, PlayIcon, PlusIcon, UndoIcon } from '../../components/icons';
import { BoxStrip, Btn, Chip, Section, StatusDot, Txt, haptic, useToast } from '../../components/ui';
import { taskColor } from '../../lib/calendar';
import { mondayOf, otherSide, usePartner } from '../../lib/partner';
import { reviewDue, weekKey, weekReview } from '../../lib/review';
import { activeTasks, useStore, type Task } from '../../lib/store';
import { DAY, ymd, boxesAt, endOfDay, fdate, fshort, info, lastSlot, leftShort, pad, slotLabel, whenLine } from '../../lib/time';
import { BTN, F, R, S, statusColor, usePalette, type Status } from '../../theme';

const GROUP: Record<'red' | 'amber' | 'green', string> = { red: 'Act now', amber: 'Pay attention', green: 'On track' };

export default function Tasks() {
  const { state } = useStore();
  const p = usePalette();
  const [openId, setOpenId] = useState<string | null>(null);
  const act = activeTasks(state);
  const over = act.filter(t => info(t).left < 0), live = act.filter(t => info(t).left >= 0);
  const paused = state.tasks.filter(t => t.pausedAt && !t.done), done = state.tasks.filter(t => t.done);
  const red = live.filter(t => info(t).st === 'red').length;
  const need = (n: number) => `${n} ${n === 1 ? 'needs' : 'need'} you now`;
  const sub = !act.length ? (paused.length ? 'Everything is paused.' : 'Nothing on the clock yet.')
    : over.length ? `${over.length} past the deadline · ${need(red)}.` : red ? `${need(red)}. ${live.length - red} more running.` : `${live.length} running. All on time.`;

  const group = (label: string, st: Status, list: Task[]) => list.length ? (
    <Section key={label} label={label} st={st} count={list.length}>
      {list.map(t => <Row key={t.id} t={t} open={openId === t.id} onToggle={() => { haptic.tick(); setOpenId(openId === t.id ? null : t.id); }} />)}
    </Section>
  ) : null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s6, paddingBottom: 140 }}>
        <Txt variant="h1">Tasks</Txt>
        <Txt dim style={{ marginTop: S.s2 }}>{sub}</Txt>
        <ReviewCard />
        <PartnerCard />
        {group('Past deadline', 'red', over)}
        {(['red', 'amber', 'green'] as const).map(st => group(GROUP[st], st, live.filter(t => info(t).st === st)))}
        {!act.length && !paused.length ? (
          <View style={{ paddingVertical: S.s8, alignItems: 'center', gap: S.s2 }}>
            <Txt variant="h2">No deadlines yet</Txt>
            <Txt dim style={{ textAlign: 'center' }}>Give a goal an end date and it gets its own boxes.</Txt>
          </View>
        ) : null}
        {group('Paused', 'paused', paused)}
        {group('Done', 'done', done)}
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityLabel="New task" onPress={() => { haptic.tick(); router.push('/new-task'); }}
        style={({ pressed }) => ({ position: 'absolute', right: 20, bottom: 24, height: BTN.l, paddingLeft: 16, paddingRight: 20, borderRadius: R.lg, backgroundColor: p.ink, flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ scale: pressed ? 0.97 : 1 }] })}>
        <PlusIcon color={p.bg} />
        <Txt style={{ fontFamily: F.uiBold, fontSize: 19, lineHeight: 24 }} color={p.bg}>New task</Txt>
      </Pressable>
    </SafeAreaView>
  );
}

// On Sunday and Monday, until opened or dismissed: a door into the weekly review.
function ReviewCard() {
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

function PartnerCard() {
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

function Row({ t, open, onToggle }: { t: Task; open: boolean; onToggle: () => void }) {
  const { state, update, updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [armDelete, setArmDelete] = useState(false);
  const [pickColor, setPickColor] = useState(false);
  const [notes, setNotes] = useState(t.notes ?? '');
  // Notes save a moment after typing stops (and on blur), with a visible "Saved" so people trust it.
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pendingNotes = useRef<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveNotes = () => {
    clearTimeout(noteTimer.current);
    const v = pendingNotes.current;
    if (v == null) return;
    pendingNotes.current = null;
    updateTask(t.id, x => ({ ...x, notes: v }));
    setNoteState('saved');
  };
  const editNotes = (v: string) => {
    setNotes(v); pendingNotes.current = v; setNoteState('saving');
    clearTimeout(noteTimer.current); noteTimer.current = setTimeout(saveNotes, 700);
  };
  const saveRef = useRef(saveNotes);
  saveRef.current = saveNotes;
  useEffect(() => () => saveRef.current(), []);
  const { left, st } = info(t);
  const over = !t.done && !t.pausedAt && left < 0, paused = !!t.pausedAt && !t.done;
  const ls = !t.done && !paused && !over ? lastSlot(t) : null;
  const ask = ls != null && !(t.checks ?? []).includes(ls);
  const [rescheduling, setRescheduling] = useState(false);
  const label = t.done ? (t.letGo ? 'Let go' : 'Done') : paused ? 'Paused' : leftShort(left);
  const sb = boxesAt(t, Date.now());

  const complete = () => {
    updateTask(t.id, x => ({ ...x, done: true, doneAt: Date.now() }));
    haptic.ok();
    const d = Math.round((t.deadline - Date.now()) / DAY);
    toast(d > 0 ? `Done, ${d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} day${d === 1 ? '' : 's'}`} early.` : 'Done.', 3200);
  };
  const extend = (days: number) => {
    const nd = endOfDay(Date.now() + days * DAY);
    // A new deadline is a fresh start: the clock restarts from today.
    updateTask(t.id, x => ({ ...x, deadline: nd, start: Date.now() }));
    haptic.ok(); toast(`New deadline ${fdate(nd)}. A fresh start.`);
  };
  const checkIn = (yes: boolean) => {
    if (ls == null) return;
    if (yes) {
      const back = t.missedAt != null && t.missedAt < ls;
      updateTask(t.id, x => ({ ...x, checks: [...(x.checks ?? []), ls], sessions: [...(x.sessions ?? []), ls], missedAt: null }));
      haptic.ok();
      // Coming back after a miss is the moment worth rewarding.
      toast(back ? 'Welcome back. Returning after a miss is what builds the habit.' : 'Session logged. That is how it gets done.', back ? 3800 : 2600);
    } else {
      updateTask(t.id, x => ({ ...x, checks: [...(x.checks ?? []), ls], missedAt: ls }));
      setRescheduling(true);
    }
  };
  const reserveAt = (ms: number) => { updateTask(t.id, x => ({ ...x, oneOff: ms })); setRescheduling(false); haptic.ok(); toast(`${slotLabel(ms)} is reserved for this.`); };
  const at = (dayOff: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() + dayOff); d.setHours(h, m, 0, 0); return +d; };
  const [uh, um] = (t.slot?.time ?? '07:00').split(':').map(Number);

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: p.line }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${t.title}, ${label}`} onPress={onToggle}
        style={{ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: S.s4, paddingVertical: S.s3 }}>
        <View style={{ width: 12, alignItems: 'center' }}><StatusDot st={st} shapes={state.shapes} /></View>
        <Txt style={[{ flex: 1 }, t.done && { color: p.dim, textDecorationLine: 'line-through' }]}>{t.title}</Txt>
        <Txt variant="meta" dim>{label}</Txt>
      </Pressable>

      {open ? (
        <View style={{ paddingLeft: 28, paddingBottom: S.s5, gap: S.s4 }}>
          {over ? (
            <View style={{ backgroundColor: p.raise, borderRadius: R.lg, padding: S.s4, gap: S.s3 }}>
              <Txt style={{ fontFamily: F.uiSemi }}>The deadline passed {leftShort(left).replace(' over', '')} ago.</Txt>
              <Txt variant="meta" dim>That happens. Choose what is true now.</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
                <Chip label="+3 days" onPress={() => extend(3)} /><Chip label="+1 week" onPress={() => extend(7)} /><Chip label="+2 weeks" onPress={() => extend(14)} />
              </View>
            </View>
          ) : null}

          {!t.done && !paused && !over ? (
            <>
              <BoxStrip n={sb.n} gone={sb.gone} st={st} />
              <Txt variant="meta" dim style={{ marginTop: -S.s2 }}>{sb.n - sb.gone} of {sb.n} {sb.unit}s left · due {fdate(t.deadline)}</Txt>
            </>
          ) : null}

          {ask && !rescheduling ? (
            <View style={{ backgroundColor: p.raise, borderRadius: R.md, padding: S.s3, paddingLeft: S.s4, gap: S.s3 }}>
              <Txt variant="meta">Did your {pad(new Date(ls!).getHours())}:{pad(new Date(ls!).getMinutes())} session happen?</Txt>
              <View style={{ flexDirection: 'row', gap: S.s2 }}><Chip label="Yes" onPress={() => checkIn(true)} /><Chip label="Not today" onPress={() => checkIn(false)} /></View>
            </View>
          ) : null}
          {rescheduling ? (
            <View style={{ backgroundColor: p.raise, borderRadius: R.md, padding: S.s4, gap: S.s3 }}>
              <Txt variant="meta">No problem. Missing one session does not undo the others. Find another time:</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
                {new Date().getHours() < 18 ? <Chip label="This evening" onPress={() => reserveAt(at(0, 19, 0))} /> : null}
                <Chip label="Tomorrow, usual time" onPress={() => reserveAt(at(1, uh, um))} />
                <Chip label="Tomorrow evening" onPress={() => reserveAt(at(1, 19, 0))} />
              </View>
            </View>
          ) : null}

          {paused ? <Txt variant="meta" dim>Paused since {fdate(t.pausedAt!)}. The clock is stopped. When you resume, the deadline moves by the time you were away.</Txt> : null}
          {whenLine(t) && !t.done && !paused ? <Txt variant="meta"><Txt variant="meta" dim>Reserved · </Txt>{whenLine(t)}</Txt> : null}
          {t.ifthen && !t.done ? <Txt variant="meta" style={{ marginTop: -S.s3 }}><Txt variant="meta" dim>Backup · </Txt>{t.ifthen}</Txt> : null}
          {t.cue && !t.done ? <Txt variant="meta" style={{ marginTop: -S.s3 }}><Txt variant="meta" dim>Cue · </Txt>{t.cue}</Txt> : null}

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: pickColor }} onPress={() => setPickColor(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, minHeight: 44, marginTop: -S.s2 }}>
            <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: taskColor(p, t) }} />
            <Txt variant="meta"><Txt variant="meta" dim>Calendar colour · </Txt>{t.color ? 'Your colour' : 'Auto (status)'}</Txt>
          </Pressable>
          {pickColor ? <ColorSwatches value={t.color} auto onChange={c => { updateTask(t.id, x => ({ ...x, color: c })); setPickColor(false); }} /> : null}

          {!t.done ? (
            <View style={{ gap: S.s1 }}>
            <TextInput value={notes} onChangeText={editNotes} onBlur={saveNotes} multiline
              placeholder="Notes: progress, links, what is in the way" placeholderTextColor={p.dim} maxFontSizeMultiplier={2}
              style={{ minHeight: 56, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, padding: S.s3, color: p.ink, fontFamily: F.ui, fontSize: 17, lineHeight: 24 }} />
            <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: S.s1, minHeight: 20 }}>
              {noteState === 'saved' ? <CheckIcon size={16} color={statusColor(p, 'green', true)} /> : null}
              <Txt variant="small" dim>{noteState === 'saved' ? 'Saved' : noteState === 'saving' ? 'Saving…' : 'Saves as you type'}</Txt>
            </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {t.done ? (
              <>
                <Btn style={{ flex: 1 }} label="Restore" icon={<UndoIcon color={p.dim} />} onPress={() => updateTask(t.id, x => ({ ...x, done: false, letGo: false, doneAt: undefined }))} />
                <Btn style={{ flex: 1 }} label={armDelete ? 'Tap again' : 'Delete'} onPress={() => {
                  if (!armDelete) { setArmDelete(true); haptic.warn(); return; }
                  update(s => ({ ...s, tasks: s.tasks.filter(x => x.id !== t.id) })); toast('Deleted');
                }} />
              </>
            ) : paused ? (
              <Btn style={{ flex: 1 }} label="Resume" icon={<PlayIcon color={p.dim} />} onPress={() => {
                const away = Date.now() - (t.pausedAt ?? Date.now());
                updateTask(t.id, x => ({ ...x, pausedAt: null, deadline: x.deadline + away, start: x.start + away }));
                toast(`Welcome back. Deadline moved to ${fdate(t.deadline + away)}.`);
              }} />
            ) : (
              <>
                <Btn style={{ flex: 1 }} label="Done" icon={<CheckIcon color={p.dim} />} onPress={complete} />
                <Btn style={{ flex: 1 }} label="Pause" icon={<PauseIcon color={p.dim} />} onPress={() => { updateTask(t.id, x => ({ ...x, pausedAt: Date.now() })); toast('Paused. The clock is stopped.'); }} />
                {over ? <Btn style={{ flex: 1 }} label="Let go" onPress={() => { updateTask(t.id, x => ({ ...x, done: true, letGo: true, doneAt: Date.now() })); toast('Let go. That time is yours again.'); }} /> : null}
              </>
            )}
          </View>
          {t.done && t.doneAt ? <Txt variant="small" dim>Finished {fshort(t.doneAt)}</Txt> : null}
        </View>
      ) : null}
    </View>
  );
}
