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

type Planned = { at: number; title: string; body: string };

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
      if (+eve > now) out.push({ at: +eve, title: `Tomorrow ${time} is reserved for this`, body: `${t.title}${t.place ? ` · ${t.place}` : ''}` });
      if (n - 15 * 6e4 > now) out.push({ at: n - 15 * 6e4, title: `In 15 minutes: ${t.title}`, body: t.ifthen ? `Backup plan: ${t.ifthen}` : t.cue ? `Cue: ${t.cue}` : 'Your reserved session is about to start.' });
      // Check-in one hour after the session starts.
      out.push({ at: n + 60 * 6e4, title: `Did your ${time} session happen?`, body: `Open Deadline to log ${t.title}.` });
      from = n + 60 * 1000;
    }
  }

  // Three digests a day (Fitz et al., 2019): everything together, most urgent first.
  const red = act.filter(t => info(t).st === 'red');
  const body = act.slice(0, 3).map(t => `${t.title} · ${leftShort(info(t).left)}`).join('\n') || 'Add a deadline to start a clock.';
  for (let k = 0; k < WINDOW_DAYS; k++) {
    for (const tm of state.digest) {
      const [h, m] = tm.split(':').map(Number), d = new Date(now); d.setDate(d.getDate() + k); d.setHours(h, m, 0, 0);
      if (+d > now) out.push({ at: +d, title: red.length ? `${red.length} ${red.length === 1 ? 'task needs' : 'tasks need'} you` : 'Everything is on track', body });
    }
  }
  // Sunday check-in with the accountability partner.
  if (state.partner) {
    for (let k = 0; k < WINDOW_DAYS; k++) {
      const d = new Date(now); d.setDate(d.getDate() + k); d.setHours(18, 0, 0, 0);
      if (d.getDay() === 0 && +d > now) out.push({ at: +d, title: 'Sunday check-in', body: `See how ${state.partner}'s week went. They can see yours too.` });
    }
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
      content: { title: p.title, body: p.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL },
    });
  }
}

export const nextReminderLabel = (state: State) => {
  const p = plan(state)[0];
  return p ? `${slotLabel(p.at)} · ${p.title}` : null;
};
