import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimeField } from '../components/pickers';
import { GlassSegment } from '../components/Glass';
import { Btn, IconButton, StatusDot, Toggle, Txt, useToast } from '../components/ui';
import { askPermission, digestContent, nextDigestAt, nextReminderLabel, permissionStatus } from '../lib/notifications';
import { aiAvailable } from '../lib/ai';
import { usePartner } from '../lib/partner';
import { ChevronIcon, CloseIcon } from '../components/icons';
import { DEFAULT_STATE, TAB_TITLES, fixTabOrder, useStore } from '../lib/store';
import { addYears, pad, parseBirth, slotLabel, ymd } from '../lib/time';
import { F, H, R, S, T, usePalette } from '../theme';

// What the next digest notification will say: built by the same code that schedules it.
function DigestPreview() {
  const { state } = useStore();
  const p = usePalette();
  const at = nextDigestAt(state), c = digestContent(state, at), d = new Date(at);
  return (
    <View style={{ marginTop: S.s3, gap: S.s2 }}>
      <Txt variant="small" dim>Arrives {slotLabel(at)}. One notification, most urgent first.</Txt>
      <View style={{ padding: S.s4, borderRadius: R.sm, backgroundColor: p.raise2, gap: S.s1 }}>
        <Txt variant="small" dim><Txt variant="small" style={{ fontFamily: F.uiSemi }}>Deadline</Txt> · {pad(d.getHours())}:{pad(d.getMinutes())}</Txt>
        <Txt style={{ fontFamily: F.uiBold }}>{c.title}</Txt>
        {/* Fixed rows (two reserved times, four tasks) so the preview keeps one size whatever it holds. */}
        {[0, 1].map(i => <Txt key={`s${i}`} variant="meta" dim numberOfLines={1} style={{ height: 22 }}>{c.slots[i] ?? ''}</Txt>)}
        {[0, 1, 2, 3].map(i => {
          const t = c.tasks[i];
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: S.s2, height: 28 }}>
              {t ? <><StatusDot st={t.st} shapes={state.shapes} size={8} /><Txt variant="meta" numberOfLines={1} style={{ flex: 1 }}>{t.title}</Txt><Txt variant="small" dim>{t.left}</Txt></>
                : i === 0 ? <Txt variant="meta" dim>Add a deadline to start a clock.</Txt> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function Settings() {
  const { state, update } = useStore();
  const toast = useToast();
  const p = usePalette();
  const [perm, setPerm] = useState<string>('…');
  const [armReset, setArmReset] = useState(false);
  const [showDigest, setShowDigest] = useState(false);
  const partner = usePartner();
  const partnerSub = partner.active ? `${state.partner}. Sunday check-ins are on.`
    : partner.incoming.length ? `${partner.incoming[0].fromName || `@${partner.incoming[0].fromUsername}`} asked to be your partner`
      : partner.outgoing ? `Waiting for @${partner.outgoing.toUsername}`
        : 'One person who sees your week every Sunday';
  useEffect(() => { permissionStatus().then(setPerm).catch(() => setPerm('unknown')); }, []);

  const row = (title: string, sub: string | undefined, right: ReactNode) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: S.s3, minHeight: 56, paddingVertical: S.s3 }}>
      <View style={{ flex: 1, minWidth: 160 }}><Txt style={{ fontFamily: F.uiSemi }}>{title}</Txt>{sub ? <Txt variant="small" dim>{sub}</Txt> : null}</View>
      {right}
    </View>
  );
  const group = (label: string, children: ReactNode) => (
    // Groups set apart by space (48), rows inside them close together, no rule under every row.
    // Each group is one raised card on the page, like the task form.
    <View style={{ marginTop: S.s6 }}>
      <Txt variant="label" dim style={{ marginBottom: S.s2, marginLeft: S.s1 }}>{label}</Txt>
      <View style={{ backgroundColor: p.raise, borderRadius: R.lg, borderWidth: 1, borderColor: p.hairline, paddingHorizontal: S.s4, paddingVertical: S.s1 }}>{children}</View>
    </View>
  );
  const toDate = (hm: string) => { const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.page, paddingTop: S.s3 }}>
        <Txt variant="h2" style={{ flex: 1 }}>Settings</Txt>
        <IconButton accessibilityLabel="Close" onPress={() => router.back()} style={{ marginRight: -8 }}>
          <CloseIcon color={p.dim} />
        </IconButton>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.page, paddingBottom: S.s8 }}>
        {group('You', <>
          {row('Date of birth', undefined, <View style={{ minWidth: 160 }}><DateTimeField label="Date of birth" mode="date" value={parseBirth(state.birth)} maximumDate={new Date()}
            onChange={d => { if (+addYears(d, state.life) <= Date.now()) return toast('Check the year of birth'); update(s => ({ ...s, birth: ymd(d) })); }} /></View>)}
          {row('Reference age', 'A point to count towards, not a prediction', (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.s1 }}>
              <Btn size="sm" label="−" accessibilityLabel="Younger" style={{ width: H.sm }} onPress={() => update(s => (+addYears(parseBirth(s.birth), s.life - 1) <= Date.now() ? s : { ...s, life: Math.max(50, s.life - 1) }))} />
              <Txt style={{ fontFamily: F.uiBold, minWidth: 32, textAlign: 'center' }}>{state.life}</Txt>
              <Btn size="sm" label="+" accessibilityLabel="Older" style={{ width: H.sm }} onPress={() => update(s => ({ ...s, life: Math.min(110, s.life + 1) }))} />
            </View>
          ))}
          {row('Accountability partner', partnerSub, <Btn size="sm" label={partner.active || partner.incoming.length ? 'Open' : 'Set up'} onPress={() => router.push('/partner')} />)}
        </>)}

        {group('Display', <>
          {row('Appearance', 'Light reads best in bright places; dark is easier at night', (
            <GlassSegment options={['Auto', 'Light', 'Dark'] as const} height={H.sm} fontSize={T.sm} style={{ width: 180 }}
              value={({ system: 'Auto', light: 'Light', dark: 'Dark' } as const)[state.appearance ?? 'system']}
              onChange={v => update(s => ({ ...s, appearance: ({ Auto: 'system', Light: 'light', Dark: 'dark' } as const)[v] }))} />
          ))}
          {row('Show life grid', 'Turn off to see only the number', <Toggle value={state.showGrid} onValueChange={v => update(s => ({ ...s, showGrid: v }))} />)}
          {state.showGrid ? row('Show weeks already lived', 'Every week since you were born, filled in. The grid scrolls.', <Toggle value={!!state.showLived} onValueChange={v => update(s => ({ ...s, showLived: v }))} />) : null}
          {row('Important dates', `${(state.events ?? []).length || 'No'} dates on your life grid`, <Btn size="sm" label="Open" onPress={() => router.push('/events')} />)}
          {row('Widgets', 'Your weeks and deadlines on the home screen', <Btn size="sm" label="Open" onPress={() => router.push('/widgets')} />)}
          {row('Lock screen wallpaper', 'Your weeks and years lived, as an image', <Btn size="sm" label="Make" onPress={() => router.push('/wallpaper')} />)}
          {/* Tab order: move a tab up or down; the first one is where the app opens. */}
          <View style={{ marginTop: S.s4 }}>
            <Txt style={{ fontFamily: F.uiSemi }}>Tab order</Txt>
            <Txt variant="small" dim>The first tab is where the app opens</Txt>
            {fixTabOrder(state.tabOrder).map((name, i, all) => {
              const move = (d: number) => update(s => {
                const o = fixTabOrder(s.tabOrder), j = i + d;
                if (j < 0 || j >= o.length) return s;
                [o[i], o[j]] = [o[j], o[i]];
                return { ...s, tabOrder: o };
              });
              return (
                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', height: 48 }}>
                  <Txt variant="meta" dim style={{ width: 28 }}>{i + 1}</Txt>
                  <Txt style={{ flex: 1 }}>{TAB_TITLES[name]}</Txt>
                  <IconButton accessibilityLabel={`Move ${TAB_TITLES[name]} up`} disabled={i === 0} onPress={() => move(-1)} style={{ opacity: i === 0 ? 0.25 : 1, transform: [{ rotate: '90deg' }] }}>
                    <ChevronIcon left color={p.ink} />
                  </IconButton>
                  <IconButton accessibilityLabel={`Move ${TAB_TITLES[name]} down`} disabled={i === all.length - 1} onPress={() => move(1)} style={{ marginRight: -8, opacity: i === all.length - 1 ? 0.25 : 1, transform: [{ rotate: '90deg' }] }}>
                    <ChevronIcon color={p.ink} />
                  </IconButton>
                </View>
              );
            })}
          </View>
          {row('Shapes on status colours', '● on track  ◆ pay attention  ▲ act now', <Toggle value={state.shapes} onValueChange={v => update(s => ({ ...s, shapes: v }))} />)}
        </>)}

        {group('Wisdom', <>
          {row('Wisdom for your work', state.career ? `${state.career.student ? 'Studying for' : 'Based on'} ${state.career.title} · ${state.career.creators.length} ${state.career.creators.length === 1 ? 'creator' : 'creators'}` : 'Articles and videos from people in your field', (
            <Btn size="sm" label={state.career ? 'Edit' : 'Set up'} onPress={() => router.push('/career')} />
          ))}
        </>)}

        {group('Voice', <>
          {row('Understand with Gemini', aiAvailable
            ? 'Better at long sentences and spoken lists. Sends what you say or type for a task (not your other data) to Google. Off: everything is read on your phone.'
            : 'Needs Firebase set up in this build', (
            <Toggle disabled={!aiAvailable} value={!!state.aiParse && aiAvailable} onValueChange={v => update(s => ({ ...s, aiParse: v }))} />
          ))}
        </>)}

        {group('Reminders', <>
          {row('Notifications', perm === 'granted' ? (nextReminderLabel(state) ?? 'Allowed') : perm === 'denied' ? 'Turned off in phone settings' : 'Not allowed yet', (
            perm === 'granted' ? <Txt variant="meta" dim>On</Txt>
              : <Btn size="sm" label={perm === 'denied' ? 'Open settings' : 'Allow'} onPress={async () => {
                if (perm === 'denied') return Linking.openSettings();
                setPerm((await askPermission()) ? 'granted' : 'denied');
              }} />
          ))}
          <Txt variant="small" dim style={{ marginTop: S.s3, marginBottom: S.s2 }}>Digest times: everything arrives together three times a day.</Txt>
          <View style={{ flexDirection: 'row', gap: S.s2 }}>
            {state.digest.map((hm, i) => (
              <View key={i} style={{ flex: 1 }}>
                <DateTimeField label={`Digest ${i + 1}`} mode="time" value={toDate(hm)}
                  onChange={d => update(s => ({ ...s, digest: s.digest.map((x, j) => (j === i ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : x)) }))} />
              </View>
            ))}
          </View>
          <Btn size="sm" style={{ marginTop: S.s3, alignSelf: 'flex-start' }} label={showDigest ? 'Hide preview' : 'Preview next digest'} onPress={() => setShowDigest(!showDigest)} />
          {showDigest ? <DigestPreview /> : null}
        </>)}

        {group('More', <>
          {row('Weekly review', 'Arrives every Sunday at 18:00', <Btn size="sm" label="Open" onPress={() => router.push('/review')} />)}
          {row('Replay intro', undefined, <Btn size="sm" label="Replay" onPress={() => { update(s => ({ ...s, onboarded: false })); router.replace('/onboarding'); }} />)}
          {row('Erase everything', 'Removes all tasks and settings on this phone', <Btn size="sm" danger label={armReset ? 'Tap again' : 'Erase'} onPress={() => {
            if (!armReset) return setArmReset(true);
            update(() => DEFAULT_STATE); router.replace('/onboarding');
          }} />)}
          <Txt variant="small" dim style={{ marginTop: S.s4 }}>Deadline {Constants.expoConfig?.version ?? ''} · test build. Your data stays on this phone.</Txt>
        </>)}
      </ScrollView>
    </SafeAreaView>
  );
}
