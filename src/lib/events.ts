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
