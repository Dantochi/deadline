// Local reminders. Everything is rescheduled from scratch whenever state changes or the app opens.
// iOS keeps at most 64 pending local notifications per app, so we only schedule a few days ahead
// and stay under that cap; Android has no such tight limit but the same window keeps things simple.
// Delivery is 'bestEffort' (inexact) on Android, which needs no exact-alarm permission.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { activeTasks, type State } from './store';
import { DAY, info, leftShort, nextSlot, pad, slotLabel } from './time';

const CHANNEL = 'reminders';
const MAX = 60;
const WINDOW_DAYS = 4;

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Reminders and digests',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function permissionStatus() {
  const p = await Notifications.getPermissionsAsync();
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

export async function askPermission() {
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}

type Planned = { at: number; title: string; body: string; url?: string };

const shape = (st: string) => (st === 'red' ? '▲' : st === 'amber' ? '◆' : '●');

/** One digest: most urgent first, with the next reserved times (within 36 hours of when it arrives). */
export function digestContent(state: State, at: number) {
  const act = activeTasks(state), red = act.filter(t => info(t).st === 'red' || info(t).left < 0);
  const slots = act.map(t => ({ t, n: nextSlot(t, at) })).filter(x => x.n != null && x.n - at < 36 * 36e5)
    .sort((a, b) => a.n! - b.n!).slice(0, 2).map(x => `${slotLabel(x.n!)} is reserved for \u201c${x.t.title}\u201d.`);
  const tasks = act.slice(0, 4).map(t => ({ title: t.title, st: info(t).st, left: leftShort(info(t).left) }));
  const title = red.length ? `${red.length} ${red.length === 1 ? 'task needs' : 'tasks need'} you` : 'Everything is on track';
  const lines = [...slots, ...tasks.map(x => `${state.shapes === false ? '' : shape(x.st) + ' '}${x.title} \u00b7 ${x.left}`)];
  return { title, slots, tasks, body: lines.join('\n') || 'Add a deadline to start a clock.' };
}

export function nextDigestAt(state: State, from = Date.now()) {
  const times = [...state.digest].sort();
  for (let k = 0; k < 2; k++) for (const tm of times) {
    const [h, m] = tm.split(':').map(Number), d = new Date(from); d.setDate(d.getDate() + k); d.setHours(h, m, 0, 0);
    if (+d > from) return +d;
  }
  return from;
}

function plan(state: State, now = Date.now()): Planned[] {
  const out: Planned[] = [];
  const horizon = now + WINDOW_DAYS * DAY;
  const act = activeTasks(state);

  for (const t of act) {
    let from = now;
    for (let k = 0; k < 7; k++) {
      const n = nextSlot(t, from);
      if (!n || n > horizon) break;
      const d = new Date(n), time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      // Evening before (20:00) and 15 minutes before: "reserved for you" framing.
      const eve = new Date(n); eve.setDate(eve.getDate() - 1); eve.setHours(20, 0, 0, 0);
      if (+eve > now) out.push({ at: +eve, title: `Tomorrow ${time} is reserved for this`, body: `${t.title}${t.place ? ` · ${t.place}` : ''}`, url: '/tasks' });
      if (n - 15 * 6e4 > now) out.push({ at: n - 15 * 6e4, title: `In 15 minutes: ${t.title}`, body: t.ifthen ? `Backup plan: ${t.ifthen}` : t.cue ? `Cue: ${t.cue}` : 'Your reserved session is about to start.', url: '/tasks' });
      // Check-in one hour after the session starts.
      out.push({ at: n + 60 * 6e4, title: `Did your ${time} session happen?`, body: `Open Deadline to log ${t.title}.`, url: '/tasks' });
      from = n + 60 * 1000;
    }
  }

  // Three digests a day (Fitz et al., 2019): everything together, most urgent first.
  for (let k = 0; k < WINDOW_DAYS; k++) {
    for (const tm of state.digest) {
      const [h, m] = tm.split(':').map(Number), d = new Date(now); d.setDate(d.getDate() + k); d.setHours(h, m, 0, 0);
      if (+d > now) { const c = digestContent(state, +d); out.push({ at: +d, title: c.title, body: c.body, url: '/tasks' }); }
    }
  }
  // Weekly review every Sunday at 18:00 (with the partner's week too, when there is a partner).
  for (let k = 0; k < WINDOW_DAYS; k++) {
    const d = new Date(now); d.setDate(d.getDate() + k); d.setHours(18, 0, 0, 0);
    if (d.getDay() === 0 && +d > now) out.push({
      at: +d, title: 'Your week is ready', url: '/review',
      body: state.partner ? `What you finished, what needs you next, and how ${state.partner}'s week went.` : 'What you finished, and what needs you next week.',
    });
  }
  return out.filter(p => p.at > now + 30 * 1000).sort((a, b) => a.at - b.at).slice(0, MAX);
}

export async function reschedule(state: State) {
  if (!state.onboarded) return;
  if ((await permissionStatus()) !== 'granted') return;
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const p of plan(state)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: p.title, body: p.body, data: p.url ? { url: p.url } : undefined },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
    });
  }
}

export const nextReminderLabel = (state: State) => {
  const p = plan(state)[0];
  return p ? `${slotLabel(p.at)} · ${p.title}` : null;
};
