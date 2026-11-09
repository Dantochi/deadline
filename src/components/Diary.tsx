// A task's diary, after Google Keep: a "Take a note…" bar, then notes as cards in a two-column staggered grid.
// Pinned notes come first; the rest are grouped by the month each was first written, newest first, so the diary
// reads like the life calendar, one box per entry. Tap a card to open it full screen (title, text, autosave);
// press and hold for Pin and Delete (with Undo). An empty new note is discarded when closed, as in Keep.
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Glass } from './Glass';
import { ChevronIcon } from './icons';
import { Txt, haptic, useToast } from './ui';
import { uid, useStore, type Note, type Task } from '../lib/store';
import { pad } from '../lib/time';
import { F, R, S, usePalette } from '../theme';

const PinIcon = ({ color, on }: { color: string; on?: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill={on ? color : 'none'} stroke={color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round">
    <Path d="M9 3.5h6l-1 6 3.5 3.5h-11L10 9.5zM12 13v7.5" />
  </Svg>
);
const TrashIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"><Path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Svg>
);

const MONTH = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const stamp = (ms: number) => { const d = new Date(ms); return `${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })} ${d.getFullYear()}`; };
const SHOW = 12;

/** Splits notes into two columns, each card going to the shorter one (heights estimated from the text). */
export function masonry(notes: Note[]): [Note[], Note[]] {
  const cols: [Note[], Note[]] = [[], []], h = [0, 0];
  for (const n of notes) {
    const lines = Math.min(10, n.text.split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 20)), 0));
    const c = h[0] <= h[1] ? 0 : 1;
    cols[c].push(n); h[c] += 44 + (n.title ? 26 : 0) + lines * 20;
  }
  return cols;
}

export function Diary({ t, writeSignal }: { t: Task; writeSignal?: number }) {
  const { updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [open, setOpen] = useState<Note | 'new' | null>(null);
  const [menuFor, setMenuFor] = useState<Note | null>(null);
  const [all, setAll] = useState(false);
  // The action bar's Notes button asks for a new note.
  useEffect(() => { if (writeSignal) setOpen('new'); }, [writeSignal]);

  const log = t.log ?? [];
  const pinned = log.filter(n => n.pinned).sort((a, b) => b.at - a.at);
  const rest = log.filter(n => !n.pinned).sort((a, b) => b.at - a.at);
  const visible = all ? rest : rest.slice(0, Math.max(0, SHOW - pinned.length));
  const months: { label: string; notes: Note[] }[] = [];
  for (const n of visible) {
    const label = MONTH(n.at), last = months[months.length - 1];
    if (last?.label === label) last.notes.push(n); else months.push({ label, notes: [n] });
  }

  const setLog = (fn: (l: Note[]) => Note[]) => updateTask(t.id, x => ({ ...x, log: fn(x.log ?? []) }));
  const remove = (n: Note) => {
    setLog(l => l.filter(x => x.id !== n.id));
    haptic.warn();
    toast('Note deleted', 6000, { label: 'Undo', onPress: () => setLog(l => [...l, n]) });
  };

  const card = (n: Note) => (
    <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`${n.title ? `${n.title}. ` : ''}${n.text.slice(0, 80)}. Written ${stamp(n.at)}`}
      accessibilityHint="Opens the note. Press and hold to pin or delete."
      onPress={() => { haptic.tick(); setOpen(n); }} onLongPress={() => { haptic.ok(); setMenuFor(n); }} delayLongPress={380}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Glass radius={R.sm - 2} style={{ padding: S.s3, gap: S.s1 }}>
        {n.title ? <Txt numberOfLines={2} style={{ fontFamily: F.uiBold, fontSize: 16, lineHeight: 22 }}>{n.title}</Txt> : null}
        {n.text ? <Txt variant="meta" numberOfLines={10}>{n.text}</Txt> : null}
        <Txt variant="num" dim style={{ fontSize: 12, lineHeight: 16, marginTop: S.s1 }}>{stamp(n.at)}</Txt>
      </Glass>
    </Pressable>
  );
  const grid = (notes: Note[]) => {
    const [a, b] = masonry(notes);
    return (
      <View style={{ flexDirection: 'row', gap: S.s2 }}>
        <View style={{ flex: 1, gap: S.s2 }}>{a.map(card)}</View>
        <View style={{ flex: 1, gap: S.s2 }}>{b.map(card)}</View>
      </View>
    );
  };

  return (
    <View>
      <Txt variant="label" dim style={{ marginBottom: S.s2 }}>Diary</Txt>
      <Pressable accessibilityRole="button" onPress={() => { haptic.tick(); setOpen('new'); }}>
        <Glass radius={R.sm - 2} style={{ height: 48, paddingHorizontal: S.s4, justifyContent: 'center' }}>
          <Txt dim>Take a note…</Txt>
        </Glass>
      </Pressable>

      {pinned.length ? <><Txt variant="small" dim style={{ marginTop: S.s4, marginBottom: S.s2, fontFamily: F.uiSemi }}>Pinned</Txt>{grid(pinned)}</> : null}
      {months.map(m => (
        <View key={m.label}>
          <Txt variant="small" dim style={{ marginTop: S.s4, marginBottom: S.s2, fontFamily: F.uiSemi }}>{m.label}</Txt>
          {grid(m.notes)}
        </View>
      ))}
      {!all && visible.length < rest.length ? (
        <Pressable accessibilityRole="button" onPress={() => setAll(true)} style={{ height: 48, justifyContent: 'center' }}>
          <Txt style={{ fontFamily: F.uiSemi }}>See all {log.length} notes</Txt>
        </Pressable>
      ) : null}

      <NoteEditor t={t} note={open} onClose={() => setOpen(null)} />

      {/* Press and hold a note: pin or delete. */}
      <Modal transparent visible={!!menuFor} animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={{ flex: 1, backgroundColor: p.scrim, justifyContent: 'flex-end' }} onPress={() => setMenuFor(null)}>
          <View style={{ backgroundColor: p.raise, paddingHorizontal: S.s5, paddingTop: S.s4, paddingBottom: S.s7 }}>
            {menuFor ? <>
              <Pressable accessibilityRole="button" style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: S.s3 }}
                onPress={() => { const n = menuFor; setLog(l => l.map(x => (x.id === n.id ? { ...x, pinned: !x.pinned } : x))); haptic.tick(); setMenuFor(null); }}>
                <PinIcon color={p.ink} on={menuFor.pinned} /><Txt style={{ fontFamily: F.uiSemi }}>{menuFor.pinned ? 'Unpin' : 'Pin'}</Txt>
              </Pressable>
              <Pressable accessibilityRole="button" style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: S.s3 }}
                onPress={() => { const n = menuFor; setMenuFor(null); remove(n); }}>
                <TrashIcon color={p.redInk} /><Txt style={{ fontFamily: F.uiSemi }} color={p.redInk}>Delete</Txt>
              </Pressable>
            </> : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** One note, full screen: title and text, saved as you type. */
function NoteEditor({ t, note, onClose }: { t: Task; note: Note | 'new' | null; onClose: () => void }) {
  const { updateTask } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [edited, setEdited] = useState(Date.now());
  const id = useRef('');
  const at = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!note) return;
    const n = note === 'new' ? null : note;
    id.current = n?.id ?? uid(); at.current = n?.at ?? Date.now();
    setTitle(n?.title ?? ''); setText(n?.text ?? ''); setPinned(!!n?.pinned); setEdited(n?.edited ?? Date.now());
  }, [note]);

  const save = (v: { title: string; text: string; pinned: boolean }) => {
    clearTimeout(timer.current);
    const empty = !v.title.trim() && !v.text.trim(), now = Date.now();
    updateTask(t.id, x => {
      const log = (x.log ?? []).filter(n => n.id !== id.current);
      if (empty) return { ...x, log };
      return { ...x, log: [...log, { id: id.current, at: at.current, edited: now, title: v.title.trim() || undefined, text: v.text, pinned: v.pinned || undefined }] };
    });
    setEdited(now);
  };
  const later = (v: { title: string; text: string; pinned: boolean }) => { clearTimeout(timer.current); timer.current = setTimeout(() => save(v), 500); };
  const close = () => { save({ title, text, pinned }); onClose(); };
  const e = new Date(edited);

  return (
    <Modal visible={!!note} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: '4.5%' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={close} style={{ width: 48, height: 48, justifyContent: 'center', marginLeft: -12, alignItems: 'center' }}>
              <ChevronIcon left color={p.ink} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable accessibilityRole="button" accessibilityLabel={pinned ? 'Unpin' : 'Pin'} onPress={() => { haptic.tick(); const v = !pinned; setPinned(v); save({ title, text, pinned: v }); }}
              style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <PinIcon color={p.ink} on={pinned} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete note" style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}
              onPress={() => {
                clearTimeout(timer.current);
                const before = t.log ?? [];
                updateTask(t.id, x => ({ ...x, log: (x.log ?? []).filter(n => n.id !== id.current) }));
                haptic.warn(); onClose();
                if (title.trim() || text.trim()) toast('Note deleted', 6000, { label: 'Undo', onPress: () => updateTask(t.id, x => ({ ...x, log: before })) });
              }}>
              <TrashIcon color={p.dim} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: '4.5%' }}>
            <TextInput value={title} onChangeText={v => { setTitle(v); later({ title: v, text, pinned }); }} placeholder="Title" placeholderTextColor={p.dim}
              maxFontSizeMultiplier={2} style={{ color: p.ink, fontFamily: F.uiBold, fontSize: 22, lineHeight: 28, paddingVertical: S.s2 }} />
            <TextInput value={text} onChangeText={v => { setText(v); later({ title, text: v, pinned }); }} placeholder="Note" placeholderTextColor={p.dim}
              multiline autoFocus={note === 'new'} textAlignVertical="top" maxFontSizeMultiplier={2}
              style={{ flex: 1, minHeight: 240, color: p.ink, fontFamily: F.ui, fontSize: 17, lineHeight: 24, paddingVertical: S.s2 }} />
          </ScrollView>
          <View style={{ height: 44, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: p.line }}>
            <Txt variant="small" dim>Edited <Txt variant="num" dim style={{ fontSize: 13, lineHeight: 18 }}>{pad(e.getHours())}:{pad(e.getMinutes())}</Txt> · {t.title}</Txt>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
