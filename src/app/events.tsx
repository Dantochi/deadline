// Important dates: add, edit and remove events shown on the life grid. Opened from Settings, or from a tapped
// week on the Life screen (?week=N fills in that week's date).
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloseIcon, PlusIcon } from '../components/icons';
import { DateTimeField } from '../components/pickers';
import { Btn, Txt, haptic, useToast } from '../components/ui';
import { EVENT_COLORS, type LifeEvent } from '../lib/events';
import { uid, useStore } from '../lib/store';
import { addYears, ageYears, fdate, parseBirth, weekStart, ymd } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

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

  return (
    <View style={{ gap: S.s4, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
      <TextInput value={ev.title} onChangeText={title => setEv({ ...ev, title })} placeholder="e.g. Graduated, Met Ada, Mum's birthday"
        placeholderTextColor={p.dim} maxLength={60} maxFontSizeMultiplier={2} autoFocus={!exists}
        style={{ fontFamily: F.uiSemi, fontSize: 21, color: p.ink, borderBottomWidth: 1, borderBottomColor: p.line, paddingVertical: S.s3 }} />

      <View style={{ gap: S.s1 }}>
        <Txt variant="small" dim>{ev.end ? 'From' : 'Date'}</Txt>
        <DateTimeField label="Date" mode="date" value={at(ev.date)} minimumDate={ev.yearly ? undefined : birth} maximumDate={last}
          onChange={d => setEv({ ...ev, date: ymd(d), end: ev.end && ev.end < ymd(d) ? ymd(d) : ev.end })} />
      </View>
      {ev.end ? (
        <View style={{ gap: S.s1 }}>
          <Txt variant="small" dim>Until</Txt>
          <DateTimeField label="End date" mode="date" value={at(ev.end)} minimumDate={at(ev.date)} maximumDate={last}
            onChange={d => setEv({ ...ev, end: ymd(d) })} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
        <Txt style={{ flex: 1 }}>Lasts longer than a day</Txt>
        <Switch value={!!ev.end} onValueChange={v => setEv({ ...ev, end: v ? ymd(new Date(+at(ev.date) + 30 * 864e5)) : null })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
        <View style={{ flex: 1 }}><Txt>Every year</Txt><Txt variant="small" dim>Birthdays and anniversaries, on every row</Txt></View>
        <Switch value={!!ev.yearly} onValueChange={yearly => setEv({ ...ev, yearly })} />
      </View>

      <View style={{ gap: S.s2 }}>
        <Txt variant="small" dim>Colour</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
          {EVENT_COLORS.map(c => {
            const on = ev.color === c.hex;
            return (
              <Pressable key={c.hex} accessibilityRole="radio" accessibilityLabel={c.name} accessibilityState={{ selected: on }}
                onPress={() => { haptic.tick(); setEv({ ...ev, color: c.hex }); }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: on ? p.ink : 'transparent' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.hex }} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: S.s2 }}>
        <Btn kind="primary" style={{ flex: 1 }} label="Save" onPress={save} />
        {exists ? (
          <Btn style={{ flex: 1 }} label={armDelete ? 'Tap again' : 'Delete'} onPress={() => {
            if (!armDelete) { setArmDelete(true); haptic.warn(); return; }
            update(s => ({ ...s, events: (s.events ?? []).filter(e => e.id !== ev.id) }));
            onDone();
          }} />
        ) : <Btn style={{ flex: 1 }} label="Cancel" onPress={onDone} />}
      </View>
    </View>
  );
}

export default function Events() {
  const { state, update } = useStore();
  const p = usePalette();
  const params = useLocalSearchParams<{ week?: string }>();
  const birth = parseBirth(state.birth);
  const fresh = (date: string): LifeEvent => ({ id: uid(), title: '', date, color: EVENT_COLORS[0].hex });
  const [editing, setEditing] = useState<LifeEvent | null>(() =>
    params.week != null ? fresh(ymd(new Date(weekStart(birth, Number(params.week))))) : null);

  const events = [...(state.events ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const today = ymd(new Date());
  const past = events.filter(e => !e.yearly && (e.end ?? e.date) < today);
  const ahead = events.filter(e => e.yearly || (e.end ?? e.date) >= today);

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
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.raise }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%', paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Important dates</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
          <CloseIcon color={p.dim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: '4.5%', paddingTop: S.s3, paddingBottom: S.s8, gap: S.s4 }} keyboardShouldPersistTaps="handled">
        <Txt dim>Mark the weeks that matter, lived or still ahead. They show in your colour on the life grid and the wallpaper.</Txt>

        {editing ? <Editor key={editing.id} initial={editing} onDone={() => setEditing(null)} />
          : <Btn kind="primary" label="Add a date" icon={<PlusIcon color={p.bg} />} onPress={() => setEditing(fresh(today))} />}

        {!state.showLived && past.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s3, padding: S.s4, borderRadius: R.lg, backgroundColor: p.bg }}>
            <Txt variant="meta" style={{ flex: 1 }}>Past dates show on the grid when lived weeks are shown.</Txt>
            <Switch value={false} onValueChange={v => update(s => ({ ...s, showLived: v }))} />
          </View>
        ) : null}

        {ahead.length ? <View><Txt variant="label" dim>Ahead and every year</Txt>{ahead.map(row)}</View> : null}
        {past.length ? <View><Txt variant="label" dim>Lived</Txt>{past.map(row)}</View> : null}
        {!events.length && !editing ? <Txt dim style={{ textAlign: 'center', marginTop: S.s6 }}>No dates yet. Birthdays, graduations, the day you moved: anything you want to see in your weeks.</Txt> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
