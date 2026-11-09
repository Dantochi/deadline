// Subtasks, as in TickTick: a checklist inside the task. Tick a round box to finish one (it sinks to the bottom,
// struck through); tap a title to rename it in place; the last row is always an input, and Enter adds the next
// one without leaving the keyboard. Press and hold a subtask to delete it (with Undo).
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { CheckIcon } from './icons';
import { Txt, haptic, useToast } from './ui';
import { uid, useStore, type Step, type Task } from '../lib/store';
import { F, S, statusColor, usePalette } from '../theme';

export function Subtasks({ t }: { t: Task }) {
  const { updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const steps = t.steps ?? [];
  const done = steps.filter(s => s.done).length;
  const set = (fn: (s: Step[]) => Step[]) => updateTask(t.id, x => ({ ...x, steps: fn(x.steps ?? []) }));
  // Open ones first, in the order added; finished ones after.
  const shown = [...steps.filter(s => !s.done), ...steps.filter(s => s.done)];

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    haptic.tick();
    set(s => [...s, { id: uid(), title: title.slice(0, 120), done: false }]);
    setDraft('');
  };
  const rename = (id: string) => {
    const title = editText.trim();
    set(s => (title ? s.map(x => (x.id === id ? { ...x, title: title.slice(0, 120) } : x)) : s));
    setEditing(null);
  };
  const remove = (st: Step) => {
    const before = t.steps ?? [];
    set(s => s.filter(x => x.id !== st.id));
    haptic.warn();
    toast(`Removed “${st.title}”`, 6000, { label: 'Undo', onPress: () => updateTask(t.id, x => ({ ...x, steps: before })) });
  };
  const green = statusColor(p, 'green', true);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, marginBottom: S.s2 }}>
        <Txt variant="label" dim style={{ flex: 1 }}>Subtasks</Txt>
        {steps.length ? <Txt variant="num" dim>{done}/{steps.length}</Txt> : null}
      </View>
      {steps.length ? (
        <View style={{ height: 3, borderRadius: 2, backgroundColor: p.glassEdge, marginBottom: S.s2, overflow: 'hidden' }}>
          <View style={{ width: `${(done / steps.length) * 100}%`, height: 3, backgroundColor: green }} />
        </View>
      ) : null}

      {shown.map(st => (
        <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: st.done }} accessibilityLabel={st.title} hitSlop={8}
            onPress={() => { haptic.tick(); set(s => s.map(x => (x.id === st.id ? { ...x, done: !x.done } : x))); }}
            style={{ width: 44, height: 48, justifyContent: 'center' }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: st.done ? green : p.dim, backgroundColor: st.done ? green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {st.done ? <CheckIcon color={p.bg} size={14} /> : null}
            </View>
          </Pressable>
          {editing === st.id ? (
            <TextInput value={editText} onChangeText={setEditText} autoFocus onSubmitEditing={() => rename(st.id)} onBlur={() => rename(st.id)}
              returnKeyType="done" maxFontSizeMultiplier={2}
              style={{ flex: 1, minHeight: 44, color: p.ink, fontFamily: F.uiMedium, fontSize: 17, paddingVertical: 0 }} />
          ) : (
            <Pressable style={{ flex: 1, minHeight: 48, justifyContent: 'center' }} accessibilityHint="Tap to rename, press and hold to delete"
              onPress={() => { setEditing(st.id); setEditText(st.title); }} onLongPress={() => remove(st)} delayLongPress={380}>
              <Txt style={st.done ? { color: p.dim, textDecorationLine: 'line-through' } : undefined}>{st.title}</Txt>
            </Pressable>
          )}
        </View>
      ))}

      {/* Always one empty row at the end: type and press Enter to add, the keyboard stays up for the next. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48 }}>
        <View style={{ width: 44, justifyContent: 'center' }}>
          <Txt style={{ fontFamily: F.uiBold, fontSize: 22, lineHeight: 24, width: 22, textAlign: 'center' }} dim>+</Txt>
        </View>
        <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={add} blurOnSubmit={false} returnKeyType="next"
          placeholder="Add subtask" placeholderTextColor={p.dim} maxFontSizeMultiplier={2} accessibilityLabel="Add subtask"
          style={{ flex: 1, minHeight: 44, color: p.ink, fontFamily: F.uiMedium, fontSize: 17, paddingVertical: 0 }} />
      </View>
    </View>
  );
}
