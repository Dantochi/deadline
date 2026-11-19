// Important dates on the life grid: one day, a span (e.g. university), or every year (e.g. a birthday).
// Each has a colour the person picks. Swatches avoid the red/amber/green used for task status.
import type { State } from './store';
import { DAY, addYears, parseBirth } from './time';

export type LifeEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  end?: string | null; // YYYY-MM-DD, for spans
  yearly?: boolean; // repeats on the same day every year
  color: string;
};

export const EVENT_COLORS = [
  { name: 'Blue', hex: '#4C8DFF' }, { name: 'Indigo', hex: '#7B6CFF' }, { name: 'Violet', hex: '#B26BFF' },
  { name: 'Pink', hex: '#FF5FA2' }, { name: 'Sky', hex: '#3FC5F0' }, { name: 'Sand', hex: '#D9B48F' },
  { name: 'Brown', hex: '#A8774F' }, { name: 'Silver', hex: '#AEB4BE' },
];

/** Week index (52 per year of life) that contains a moment, or -1 outside the grid. */
export function weekOf(birth: Date, life: number, ms: number) {
  if (ms < +birth) return -1;
  let y = new Date(ms).getFullYear() - birth.getFullYear();
  if (+addYears(birth, y) > ms) y--;
  if (y >= life) return -1;
  return y * 52 + Math.min(51, Math.floor((ms - +addYears(birth, y)) / (7 * DAY)));
}

const at = (ymd: string) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };

/** All weeks an event covers. */
export function eventWeeks(ev: LifeEvent, state: State): number[] {
  const birth = parseBirth(state.birth), out = new Set<number>();
  const span = (a: Date, b: Date) => {
    const s = weekOf(birth, state.life, +a), e = weekOf(birth, state.life, +b);
    if (s < 0 && e < 0) return;
    for (let i = Math.max(0, s); i <= (e < 0 ? state.life * 52 - 1 : e); i++) out.add(i);
  };
  const start = at(ev.date), end = ev.end ? at(ev.end) : start;
  if (!ev.yearly) span(start, end);
  else {
    const len = +end - +start;
    for (let y = birth.getFullYear(); y <= birth.getFullYear() + state.life; y++) {
      const s = new Date(y, start.getMonth(), start.getDate());
      span(s, new Date(+s + len));
    }
  }
  return [...out];
}

/** Week index → colour of the event drawn there (later entries win), for the grid. */
export function eventColorMap(state: State) {
  const m = new Map<number, string>();
  for (const ev of state.events ?? []) for (const w of eventWeeks(ev, state)) m.set(w, ev.color);
  return m;
}

export const eventsInWeek = (state: State, week: number) =>
  (state.events ?? []).filter(ev => eventWeeks(ev, state).includes(week));

const dayDiff = (a: Date, b: Date) => Math.round((+new Date(a.getFullYear(), a.getMonth(), a.getDate()) - +new Date(b.getFullYear(), b.getMonth(), b.getDate())) / DAY);
/** Whole calendar months from a to b (b later), e.g. 19 Nov → 18 Apr is 4, → 19 Apr is 5. */
const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() - (b.getDate() < a.getDate() ? 1 : 0);
const n = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;

/** How far a date is from today, in words: "Today", "in 16 days", "in 5 months", "3 years ago". Yearly dates count
 *  to the next one; a range that includes today is "Now". `days` sorts (negative = past, Infinity-free). */
export function eventDistance(ev: LifeEvent, now = new Date()): { days: number; label: string; past: boolean } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = at(ev.date), end = ev.end ? at(ev.end) : start;
  if (ev.yearly) {
    const len = dayDiff(end, start);
    start = new Date(today.getFullYear(), start.getMonth(), start.getDate());
    end = new Date(+start + len * DAY);
    if (end < today) { start = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate()); end = new Date(+start + len * DAY); }
  }
  if (start <= today && today <= end) return { days: 0, label: ev.end ? 'Now' : 'Today', past: false };
  const ahead = dayDiff(start, today);
  if (ahead > 0) {
    const label = ahead === 1 ? 'Tomorrow' : ahead < 60 ? `in ${ahead} days` : monthsBetween(today, start) < 12 ? `in ${n(Math.max(2, monthsBetween(today, start)), 'month')}` : `in ${n(Math.floor(monthsBetween(today, start) / 12), 'year')}`;
    return { days: ahead, label, past: false };
  }
  const ago = dayDiff(today, end);
  const label = ago === 1 ? 'Yesterday' : ago < 60 ? `${ago} days ago` : monthsBetween(end, today) < 12 ? `${n(Math.max(2, monthsBetween(end, today)), 'month')} ago` : `${n(Math.floor(monthsBetween(end, today) / 12), 'year')} ago`;
  return { days: -ago, label, past: true };
}
