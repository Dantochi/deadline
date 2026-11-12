// Setting up Wisdom for your work: the career (or, for a student, the career they're heading towards), then a pick
// of well-known creators in that field, plus any names typed in. Used in onboarding and in Settings → Wisdom.
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GlassSegment } from './Glass';
import { CloseIcon } from './icons';
import { Btn, Chip, Field, IconButton, Txt, haptic } from './ui';
import { suggestCreators, type Career, type Creator } from '../lib/career';
import { H, S, T, usePalette } from '../theme';

const WHO = ['I work in it', 'I’m studying for it'] as const;

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

  const find = async () => {
    const t = title.trim();
    if (t.length < 2) return;
    haptic.tick(); setStage('loading'); setOffline(false);
    const r = await suggestCreators(t, student);
    if (r.status === 'refused') { haptic.warn(); setStage('refused'); return; }
    if (r.status === 'offline') { setOffline(true); setStage('pick'); return; }
    setField(t.replace(/^studying\s+/i, '').toLowerCase());
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
        <Field value={title} onChangeText={t => { setTitle(t); if (stage === 'refused') setStage('ask'); }} onSubmitEditing={find}
          placeholder={student ? 'e.g. Medicine, Law, Software engineering' : 'e.g. Nurse, Designer, Teacher'}
          maxLength={80} returnKeyType="search" />
        <GlassSegment options={WHO} height={H.md} fontSize={T.sm} value={student ? WHO[1] : WHO[0]} onChange={v => setStudent(v === WHO[1])} />
        <Btn label={stage === 'pick' ? 'Suggest again' : 'Find creators'} disabled={title.trim().length < 2 || stage === 'loading'}
          style={{ alignSelf: 'flex-start' }} onPress={find} />
      </View>

      {stage === 'loading' ? (
        <View style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={p.dim} /></View>
      ) : null}

      {stage === 'refused' ? (
        <Txt dim>We can't tailor Wisdom to that. You'll see the general collection.</Txt>
      ) : null}

      {stage === 'pick' ? (
        <View style={{ gap: S.s3 }}>
          <Txt variant="label" dim>Creators{field ? ` in ${field}` : ''}</Txt>
          {offline ? <Txt variant="small" dim>Suggestions aren't available right now. Add the people you follow by name, or try again later.</Txt> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.s2 }}>
            {options.map(c => <Chip key={c.name} label={c.name} on={picked.includes(c.name)} onPress={() => toggle(c.name)} />)}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2 }}>
            <Field wrap={{ flex: 1 }} value={extra} onChangeText={setExtra} onSubmitEditing={add} placeholder="Add someone not listed"
              maxLength={60} returnKeyType="done"
              trailing={extra ? <IconButton accessibilityLabel="Clear" size={H.sm} onPress={() => setExtra('')}><CloseIcon color={p.dim} size={16} /></IconButton> : null} />
            <Btn label="Add" disabled={extra.trim().length < 2} onPress={add} />
          </View>
        </View>
      ) : null}

      {stage === 'pick' ? <Btn kind="primary" label={doneLabel} disabled={!title.trim()} onPress={save} /> : null}
    </View>
  );
}
