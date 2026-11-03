// Steps inside a task (subtasks): tick them off, give any of them a date, press and hold to remove (with Undo).
// Dated steps also show on that day's page and on the Day tab.
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { CheckIcon, PlusIcon } from './icons';
import { DateTimeField } from './pickers';
import { Txt, haptic, useToast } from './ui';
import { uid, useStore, type Step, type Task } from '../lib/store';
import { fshort } from '../lib/time';
import { F, S, statusColor, usePalette } from '../theme';

export function Steps({ t }: { t: Task }) {
  const { updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [draft, setDraft] = useState('');
  const [dateFor, setDateFor] = useState<string | null>(null);
  const steps = t.steps ?? [];
  const done = steps.filter(s => s.done).length;
  const set = (fn: (s: Step[]) => Step[]) => updateTask(t.id, x => ({ ...x, steps: fn(x.steps ?? []) }));

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    haptic.tick();
    set(s => [...s, { id: uid(), title: title.slice(0, 80), done: false, date: null }]);
    setDraft('');
  };

  return (
    <View style={{ gap: S.s2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="label" dim style={{ flex: 1 }}>Steps</Txt>
        {steps.length ? <Txt variant="small" dim>{done} of {steps.length} done</Txt> : null}
      </View>
      {steps.length ? (
        <View style={{ height: 3, backgroundColor: p.ahead }}>
          <View style={{ height: 3, width: `${(done / steps.length) * 100}%`, backgroundColor: statusColor(p, 'green', true) }} />
        </View>
      ) : null}

      {steps.map(s => (
        <View key={s.id}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: s.done }} accessibilityLabel={s.title}
            accessibilityHint="Press and hold to remove"
            onPress={() => { haptic.tick(); set(x => x.map(y => (y.id === s.id ? { ...y, done: !y.done } : y))); }}
            onLongPress={() => {
              haptic.warn();
              const before = t.steps ?? [];
              set(x => x.filter(y => y.id !== s.id));
              toast(`Removed “${s.title}”`, 6000, { label: 'Undo', onPress: () => updateTask(t.id, x => ({ ...x, steps: before })) });
            }}
            style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
            <View style={{ width: 22, height: 22, borderWidth: 2, borderColor: s.done ? statusColor(p, 'green', true) : p.dim, backgroundColor: s.done ? statusColor(p, 'green', true) : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {s.done ? <CheckIcon size={16} color={p.bg} /> : null}
            </View>
            <Txt numberOfLines={1} style={[{ flex: 1 }, s.done && { color: p.dim, textDecorationLine: 'line-through' }]}>{s.title}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={s.date ? `Due ${fshort(s.date)}, change date` : 'Add a date'} hitSlop={8}
              onPress={() => setDateFor(dateFor === s.id ? null : s.id)}>
              <Txt variant="small" dim style={{ fontFamily: F.uiSemi }}>{s.date ? fshort(s.date) : '+ date'}</Txt>
            </Pressable>
          </Pressable>
          {dateFor === s.id ? (
            <View style={{ marginBottom: S.s2 }}>
              <DateTimeField label="Step date" mode="date" value={new Date(s.date ?? Date.now())} minimumDate={new Date(t.start)} maximumDate={new Date(t.deadline)}
                onChange={d => { d.setHours(12, 0, 0, 0); set(x => x.map(y => (y.id === s.id ? { ...y, date: +d } : y))); setDateFor(null); }} />
            </View>
          ) : null}
        </View>
      ))}

      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', gap: S.s3 }}>
        <PlusIcon size={22} color={p.dim} />
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={add} returnKeyType="done" blurOnSubmit={false}
          placeholder={steps.length ? 'Add another step' : 'Break it into steps'} placeholderTextColor={p.dim} maxFontSizeMultiplier={2}
          style={{ flex: 1, height: 48, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 }} />
        {draft.trim() ? <Pressable accessibilityRole="button" onPress={add} hitSlop={8}><Txt style={{ fontFamily: F.uiBold }}>Add</Txt></Pressable> : null}
      </View>
    </View>
  );
}
