// The weekly review: what happened in the last seven days, what needs attention, and the focus for next week.
import { eventWeeks } from './events';
import { activeTasks, type State } from './store';
import { DAY, info, parseBirth, weekNow, ymd } from './time';

/** Monday of the current week, as YYYY-MM-DD: one review per week. */
export const weekKey = (now = new Date()) => {
  const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d);
};

/** The review shows up on Sunday and Monday, until opened or dismissed that week. */
export const reviewDue = (state: State, now = new Date()) =>
  (now.getDay() === 0 || now.getDay() === 1) && state.reviewSeen !== weekKey(now) && state.tasks.length > 0;

export function weekReview(state: State, now = Date.now()) {
  const from = now - 7 * DAY, inWeek = (ms?: number | null) => ms != null && ms >= from && ms <= now;
  let sessions = 0, missed = 0;
  for (const t of state.tasks) {
    const yes = (t.sessions ?? []).filter(inWeek);
    sessions += yes.length;
    missed += (t.checks ?? []).filter(c => inWeek(c) && !yes.includes(c)).length;
  }
  const finished = state.tasks.filter(t => t.done && !t.letGo && inWeek(t.doneAt));
  const act = activeTasks(state);
  const needYou = act.filter(t => info(t).st === 'red' || info(t).left < 0);
  const focus = needYou[0] ?? act[0] ?? null;
  // Important dates in the coming week.
  const birth = parseBirth(state.birth), w = weekNow(birth, state.life, now);
  const comingUp = (state.events ?? []).filter(e => eventWeeks(e, state).includes(w + 1) || eventWeeks(e, state).includes(w));
  return { from, sessions, missed, finished, needYou, focus, comingUp };
}
