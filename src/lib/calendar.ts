// The Year view: every day of a year, marked by the most urgent task on it, and what one day holds.
import type { LifeEvent } from './events';
import { type State, type Task } from './store';
import { DAY, info, nextSlot, ymd } from './time';
import type { Palette, Status } from '../theme';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A task's colour on the Year calendar and Timeline: the colour the person chose, or the app's own ink, which is
 *  light in dark mode and dark in light mode, so unpicked tasks match the theme. */
export const taskColor = (p: Palette, t: Task) => t.color ?? p.ink;

const dayStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return +d; };

export type DayCell = {
  urgent?: Status; // status of the most urgent task running or due that day
  event?: string; // colour of an important date, when no task is on the day
};

// Overdue and red first, then amber, then green. A task's own colour never reaches the calendar.
const RANK: Partial<Record<Status, number>> = { red: 3, amber: 2, green: 1 };
export const urgency = (t: Task): Status => (info(t).left < 0 ? 'red' : info(t).st);

/** For every day of `year` (keyed by YYYY-MM-DD): the most urgent task on it, and important dates. */
export function yearCells(state: State, year: number) {
  const cells = new Map<string, DayCell>();
  const from = +new Date(year, 0, 1), to = +new Date(year + 1, 0, 1);
  const get = (k: string) => cells.get(k) ?? (cells.set(k, {}), cells.get(k)!);

  for (const t of state.tasks) {
    if (t.letGo || t.done || t.pausedAt || t.deadline < from || t.start >= to) continue;
    const st = urgency(t), r = RANK[st] ?? 0;
    for (let d = dayStart(Math.max(t.start, from)); d < Math.min(t.deadline + 1, to); d += DAY) {
      const cell = get(ymd(new Date(d)));
      if (!cell.urgent || (RANK[cell.urgent] ?? 0) < r) cell.urgent = st;
    }
  }
  for (const ev of state.events ?? []) for (const d of eventDays(ev, year)) { const cell = get(d); cell.event ??= ev.color; }
  return cells;
}

/** The YYYY-MM-DD days an event covers in a given year. */
export function eventDays(ev: LifeEvent, year: number): string[] {
  const [y, m, d] = ev.date.split('-').map(Number);
  const start = new Date(ev.yearly ? year : y, m - 1, d);
  let end = start;
  if (ev.end) { const [ey, em, ed] = ev.end.split('-').map(Number); end = new Date(ev.yearly ? year + (ey - y) : ey, em - 1, ed); }
  const out: string[] = [];
  for (let t = +start; t <= +end; t += DAY) { const day = new Date(t); if (day.getFullYear() === year) out.push(ymd(day)); }
  return out;
}

/** What is on one day: tasks running (and due), sessions reserved, important dates. Due tasks come first. */
export function dayDetail(state: State, ms: number) {
  const s = dayStart(ms), e = s + DAY, key = ymd(new Date(s)), year = new Date(s).getFullYear();
  const tasks = state.tasks.filter(t => !t.letGo && t.start < e && t.deadline >= s).map(t => ({ t, due: t.deadline >= s && t.deadline < e }))
    .sort((a, b) => Number(b.due) - Number(a.due));
  const sessions = state.tasks.filter(t => !t.done && !t.pausedAt).map(t => ({ t, n: nextSlot(t, s) })).filter(x => x.n != null && x.n < e);
  const events = (state.events ?? []).filter(ev => eventDays(ev, year).includes(key));
  return { tasks, sessions, events };
}

