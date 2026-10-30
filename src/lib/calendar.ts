// The Year view: every day of a year as a box, coloured by the tasks and important dates on it.
import type { LifeEvent } from './events';
import { type State, type Task } from './store';
import { DAY, info, nextSlot, ymd } from './time';
import { statusColor, type Palette } from '../theme';

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** A task's colour on the calendar: the colour the person chose, or its status colour. */
export const taskColor = (p: Palette, t: Task) => t.color ?? statusColor(p, info(t).st);

const dayStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return +d; };

export type DayCell = {
  fill?: string; // task or event colour
  strong: boolean; // deadline day or an event: full colour; other task days are tinted
  session: boolean; // a reserved session falls on this day
};

/** Colours for every day of `year`, keyed by YYYY-MM-DD. */
export function yearCells(state: State, p: Palette, year: number) {
  const cells = new Map<string, DayCell>();
  const from = +new Date(year, 0, 1), to = +new Date(year + 1, 0, 1);
  const get = (k: string) => cells.get(k) ?? (cells.set(k, { strong: false, session: false }), cells.get(k)!);

  // Tasks: their days from start to deadline, most urgent drawn last so it wins overlaps.
  const tasks = state.tasks.filter(t => !t.letGo && t.deadline >= from && t.start < to)
    .sort((a, b) => info(b).pct - info(a).pct);
  for (const t of tasks) {
    const c = taskColor(p, t);
    for (let d = dayStart(Math.max(t.start, from)); d < Math.min(t.deadline + 1, to); d += DAY) {
      const k = ymd(new Date(d)), cell = get(k);
      cell.fill = c; cell.strong = false;
    }
    if (t.deadline >= from && t.deadline < to) { const cell = get(ymd(new Date(t.deadline))); cell.fill = c; cell.strong = true; }
    // Reserved sessions ahead (a small dot), up to the deadline.
    if (!t.done && !t.pausedAt) {
      let s = Math.max(Date.now(), from) - 1;
      for (let k = 0; k < 400; k++) {
        const n = nextSlot(t, s + 1);
        if (!n || n >= to) break;
        get(ymd(new Date(n))).session = true;
        s = n + 60 * 1000;
      }
    }
  }

  // Important dates on top, in their own colour.
  for (const ev of state.events ?? []) for (const d of eventDays(ev, year)) { const cell = get(d); cell.fill = ev.color; cell.strong = true; }
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

/** What is on one day: tasks running (and due), sessions reserved, important dates. */
export function dayDetail(state: State, ms: number) {
  const s = dayStart(ms), e = s + DAY, key = ymd(new Date(s)), year = new Date(s).getFullYear();
  const tasks = state.tasks.filter(t => !t.letGo && t.start < e && t.deadline >= s).map(t => ({ t, due: t.deadline >= s && t.deadline < e }));
  const sessions = state.tasks.filter(t => !t.done && !t.pausedAt).map(t => ({ t, n: nextSlot(t, s) })).filter(x => x.n != null && x.n < e);
  const events = (state.events ?? []).filter(ev => eventDays(ev, year).includes(key));
  return { tasks, sessions, events };
}

