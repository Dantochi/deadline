// Setting up Wisdom for your work: the career (or, for a student, the career they're heading towards), then a pick
// of well-known creators in that field, plus any names typed in. Used in onboarding and in Settings → Wisdom.
import { useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { CloseIcon } from './icons';
import { Btn, Chip, Txt, haptic } from './ui';
import { suggestCreators, type Career, type Creator } from '../lib/career';
import { F, R, S, usePalette } from '../theme';

type Stage = 'ask' | 'loading' | 'pick' | 'refused';

export function CareerSetup({ initial, onDone, doneLabel = 'Save' }: {
  initial?: Career | null; onDone: (career: Career) => void; doneLabel?: string;
}) {
  const p = usePalette();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [student, setStudent] = useState(initial?.student ?? false);
  const [stage, setStage] = useState<Stage>(initial ? 'pick' : 'ask');
  const [offline, setOffline] = useState(false);
  const [field, setField] = useState('');
  const [options, setOptions] = useState<Creator[]>(initial?.suggested ?? initial?.creators ?? []);
  const [picked, setPicked] = useState<string[]>((initial?.creators ?? []).map(c => c.name));
  const [extra, setExtra] = useState('');

  const input = { minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.bg, paddingHorizontal: S.s4, color: p.ink, fontFamily: F.uiMedium, fontSize: 17 } as const;

  const find = async () => {
    const t = title.trim();
    if (t.length < 2) return;
    haptic.tick(); setStage('loading'); setOffline(false);
    const r = await suggestCreators(t, student);
    if (r.status === 'refused') { haptic.warn(); setStage('refused'); return; }
    if (r.status === 'offline') { setOffline(true); setStage('pick'); return; }
    setField(r.field);
    // Keep anyone already picked or typed in, then the new suggestions.
    setOptions(o => [...o.filter(c => picked.includes(c.name)), ...r.creators.filter(c => !o.some(x => x.name === c.name && picked.includes(x.name)))]);
    setStage('pick');
  };
  const add = () => {
    const name = extra.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (name.length < 2 || options.some(c => c.name.toLowerCase() === name.toLowerCase())) { setExtra(''); return; }
    haptic.tick();
    setOptions(o => [...o, { name, kind: 'author', works: [] }]);
    setPicked(x => [...x, name]);
    setExtra('');
  };
  const toggle = (name: string) => { haptic.tick(); setPicked(x => (x.includes(name) ? x.filter(n => n !== name) : [...x, name])); };
  const save = () => onDone({
    title: title.trim(), student,
    creators: options.filter(c => picked.includes(c.name)),
    suggested: options,
  });

  return (
    <View style={{ gap: S.s5 }}>
      <View style={{ gap: S.s3 }}>
        <Txt variant="label" dim>{student ? 'The career you’re studying for' : 'Your career'}</Txt>
        <TextInput value={title} onChangeText={t => { setTitle(t); if (stage === 'refused') setStage('ask'); }} onSubmitEditing={find}
          placeholder={student ? 'e.g. Medicine, Law, Software engineering' : 'e.g. Nurse, Designer, Teacher'} placeholderTextColor={p.dim}
          maxLength={80} returnKeyType="search" maxFontSizeMultiplier={2} style={input} />
        <View style={{ flexDirection: 'row', gap: S.s1 }}>
          <View style={{ flex: 1 }}><Chip label="I work in it" on={!student} onPress={() => setStudent(false)} /></View>
          <View style={{ flex: 1 }}><Chip label="I'm studying for it" on={student} onPress={() => setStudent(true)} /></View>
        </View>
        <Btn label={stage === 'pick' ? 'Suggest again' : 'Find creators'} disabled={title.trim().length < 2 || stage === 'loading'}
          style={title.trim().length < 2 ? { opacity: 0.45 } : undefined} onPress={find} />
      </View>

      {stage === 'loading' ? (
        <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={p.dim} /></View>
      ) : null}

      {stage === 'refused' ? (
        <Txt dim>We can't tailor Wisdom to that. You'll see the general collection.</Txt>
      ) : null}

      {stage === 'pick' ? (
        <View style={{ gap: S.s3 }}>
          <Txt variant="label" dim>Creators{field ? ` in ${field.toLowerCase()}` : ''}</Txt>
          {offline ? <Txt variant="small" dim>Suggestions aren't available right now. Add the people you follow by name, or try again later.</Txt> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
            {options.map(c => <Chip key={c.name} label={c.name} on={picked.includes(c.name)} onPress={() => toggle(c.name)} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
            <TextInput value={extra} onChangeText={setExtra} onSubmitEditing={add} placeholder="Add someone not listed" placeholderTextColor={p.dim}
              maxLength={60} returnKeyType="done" maxFontSizeMultiplier={2} style={[input, { flex: 1 }]} />
            {extra ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear" onPress={() => setExtra('')} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <CloseIcon color={p.dim} />
              </Pressable>
            ) : null}
            <Btn label="Add" onPress={add} />
          </View>
        </View>
      ) : null}

      {stage === 'pick' ? <Btn kind="primary" label={doneLabel} disabled={!title.trim()} onPress={save} /> : null}
    </View>
  );
}
