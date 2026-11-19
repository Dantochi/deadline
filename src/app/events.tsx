// Important dates: add, edit and remove events shown on the life grid. Opened from Settings, or from a tapped
// week on the Life screen (?week=N fills in that week's date).
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassSegment } from '../components/Glass';
import { CloseIcon, PlusIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Toggle, Txt, haptic, useToast } from '../components/ui';
import { EVENT_COLORS, eventDistance, type LifeEvent } from '../lib/events';
import { uid, useStore } from '../lib/store';
import { addYears, ageYears, fdate, parseBirth, weekStart, ymd } from '../lib/time';
import { F, R, S, T, usePalette } from '../theme';

const at = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

function Editor({ initial, onDone }: { initial: LifeEvent; onDone: () => void }) {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [ev, setEv] = useState(initial);
  const [armDelete, setArmDelete] = useState(false);
  const birth = parseBirth(state.birth), last = addYears(birth, state.life);
  const exists = (state.events ?? []).some(e => e.id === ev.id);

  const save = () => {
    if (!ev.title.trim()) return toast('Give it a name');
    if (ev.end && ev.end < ev.date) return toast('The end is before the start');
    const clean = { ...ev, title: ev.title.trim().slice(0, 60) };
    update(s => ({ ...s, events: exists ? (s.events ?? []).map(e => (e.id === ev.id ? clean : e)) : [...(s.events ?? []), clean] }));
    haptic.ok();
    toast(at(ev.date) < new Date() && !state.showLived && !ev.yearly
      ? 'Saved. Turn on Show weeks already lived to see past dates.' : 'Saved to your life grid');
    onDone();
  };

  // Settings-style rows: what it is on the left, the control on the right, 56 tall, hairline between them.
  const row = (label: string, control: ReactNode, sub?: string, last = false) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, minHeight: 56, paddingVertical: S.s2, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: p.line }}>
      <View style={{ flex: 1 }}>
        <Txt>{label}</Txt>
        {sub ? <Txt variant="small" dim>{sub}</Txt> : null}
      </View>
      {control}
    </View>
  );
  const sw = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
  );
  const dateField = (label: string, value: Date, onChange: (d: Date) => void, min?: Date) => (
    <View style={{ width: 168 }}><DateTimeField label={label} mode="date" value={value} minimumDate={min} maximumDate={last} onChange={onChange} /></View>
  );

  return (
    // One raised panel, set apart from the list: what the date is called (largest), when it is, its colour, then
    // a single main action. Groups are 32 apart; things inside a group sit close together.
    <View style={{ padding: S.s4, borderRadius: R.md, borderCurve: 'continuous', backgroundColor: p.raise, borderWidth: 1, borderColor: p.line, gap: S.s6 }}>
      <View style={{ gap: S.s2 }}>
        <Txt variant="label" dim>{exists ? 'Edit date' : 'New date'}</Txt>
        <TextInput value={ev.title} onChangeText={title => setEv({ ...ev, title })} placeholder="e.g. Graduated"
          placeholderTextColor={p.dim} maxLength={60} maxFontSizeMultiplier={2} autoFocus={!exists} accessibilityLabel="Name"
          style={{ fontFamily: F.uiSemi, fontSize: T.xl, lineHeight: 28, color: p.ink, paddingVertical: S.s2, borderBottomWidth: 1, borderBottomColor: p.line }} />
      </View>

      <View>
        <Txt variant="label" dim style={{ marginBottom: S.s1 }}>When</Txt>
        {row(ev.end ? 'From' : 'Date', dateField('Date', at(ev.date), d => setEv({ ...ev, date: ymd(d), end: ev.end && ev.end < ymd(d) ? ymd(d) : ev.end }), ev.yearly ? undefined : birth))}
        {row('Lasts longer than a day', sw(!!ev.end, v => setEv({ ...ev, end: v ? ymd(new Date(+at(ev.date) + 30 * 864e5)) : null }), 'Lasts longer than a day'))}
        {ev.end ? row('Until', dateField('End date', at(ev.end), d => setEv({ ...ev, end: ymd(d) }), at(ev.date))) : null}
        {row('Every year', sw(!!ev.yearly, yearly => setEv({ ...ev, yearly }), 'Every year'), 'Birthdays and anniversaries', true)}
      </View>

      <View>
        <Txt variant="label" dim style={{ marginBottom: S.s2 }}>Colour</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s1, marginLeft: -6 }}>
          {EVENT_COLORS.map(c => {
            const on = ev.color === c.hex;
            return (
              <Pressable key={c.hex} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ selected: on }}
                onPress={() => { haptic.tick(); setEv({ ...ev, color: c.hex }); }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? p.ink : 'transparent' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.hex }} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* One main action; the way out (or delete, in red) is quieter, under it. */}
      <View style={{ gap: S.s1 }}>
        <Btn kind="primary" label={exists ? 'Save changes' : 'Add to my life grid'} onPress={save} />
        {exists ? (
          <Btn kind="ghost" label={armDelete ? 'Tap again to delete' : 'Delete this date'} style={{ minHeight: 44 }} onPress={() => {
            if (!armDelete) { setArmDelete(true); haptic.warn(); return; }
            update(s => ({ ...s, events: (s.events ?? []).filter(e => e.id !== ev.id) }));
            onDone();
          }} />
        ) : <Btn kind="ghost" label="Cancel" style={{ minHeight: 44 }} onPress={onDone} />}
      </View>
    </View>
  );
}

export default function Events() {
  const { state, update } = useStore();
  const p = usePalette();
  const params = useLocalSearchParams<{ week?: string; date?: string }>();
  const birth = parseBirth(state.birth);
  const fresh = (date: string): LifeEvent => ({ id: uid(), title: '', date, color: EVENT_COLORS[0].hex });
  const [editing, setEditing] = useState<LifeEvent | null>(() =>
    params.date ? fresh(params.date) : params.week != null ? fresh(ymd(new Date(weekStart(birth, Number(params.week))))) : null);

  const events = [...(state.events ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const today = ymd(new Date());
  // How far each date is, which is what people come here to check. Next: soonest first; Past: most recent first.
  const dist = new Map(events.map(e => [e.id, eventDistance(e)]));
  const ahead = events.filter(e => !dist.get(e.id)!.past).sort((a, b) => dist.get(a.id)!.days - dist.get(b.id)!.days);
  const past = events.filter(e => dist.get(e.id)!.past).sort((a, b) => dist.get(b.id)!.days - dist.get(a.id)!.days);
  const [view, setView] = useState<'Next' | 'Past'>('Next');
  const shown = view === 'Next' ? ahead : past;

  const row = (e: LifeEvent) => (
    <Pressable key={e.id} accessibilityRole="button" onPress={() => { haptic.tick(); setEditing(e); }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.s3, minHeight: 64, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: e.color }} />
      <View style={{ flex: 1 }}>
        <Txt style={{ fontFamily: F.uiSemi }} numberOfLines={1}>{e.title}</Txt>
        <Txt variant="small" dim>
          {e.yearly ? `Every year · ${at(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
            : `${fdate(+at(e.date))}${e.end ? ` – ${fdate(+at(e.end))}` : ''} · age ${ageYears(birth, at(e.date))}`}
        </Txt>
      </View>
      <Txt variant="meta" style={{ fontFamily: F.uiSemi, fontVariant: ['tabular-nums'] }} color={dist.get(e.id)!.days === 0 ? p.ink : p.dim}>{dist.get(e.id)!.label}</Txt>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Important dates</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingTop: S.s4, paddingBottom: S.s8, gap: S.s6 }} keyboardShouldPersistTaps="handled">
        {editing ? <Editor key={editing.id} initial={editing} onDone={() => setEditing(null)} />
          : <Btn label="Add a date" icon={<PlusIcon color={p.ink} size={18} />} style={{ alignSelf: 'flex-start' }} onPress={() => setEditing(fresh(today))} />}

        {!state.showLived && past.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, minHeight: 56 }}>
            <Txt variant="meta" style={{ flex: 1 }}>Past dates show on the grid when lived weeks are shown.</Txt>
            <Toggle value={false} onValueChange={v => update(s => ({ ...s, showLived: v }))} />
          </View>
        ) : null}

        {events.length ? (
          <View style={{ gap: S.s2 }}>
            <GlassSegment options={['Next', 'Past'] as const} value={view} onChange={setView} style={{ width: 180 }}
              labels={{ Next: `Next, ${ahead.length}`, Past: `Past, ${past.length}` }} />
            {shown.length ? <View>{shown.map(row)}</View>
              : <Txt dim style={{ marginTop: S.s3 }}>{view === 'Next' ? 'Nothing coming up. Birthdays and anniversaries set to every year always show here.' : 'No past dates yet.'}</Txt>}
          </View>
        ) : null}
        {!events.length && !editing ? <Txt dim style={{ textAlign: 'center', marginTop: S.s6 }}>No dates yet. Birthdays, graduations, the day you moved: anything you want to see in your weeks.</Txt> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
