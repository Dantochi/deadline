import type { Status } from '../theme';
import type { Task } from './store';

export const DAY = 864e5;
export const YEAR = 365.2425 * DAY;

export const pad = (n: number) => String(n).padStart(2, '0');
export const fmt = (n: number) => n.toLocaleString('en-GB');
export const fdate = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const fshort = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const addYears = (d: Date, n: number) => new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
export const endOfDay = (ms: number) => { const d = new Date(ms); d.setHours(23, 59, 0, 0); return +d; };
export const parseBirth = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Weeks are laid out as 52 per row, one row per year of life, as in the prototype.
export function weekStart(birth: Date, i: number) { return +addYears(birth, Math.floor(i / 52)) + (i % 52) * 7 * DAY; }
export function weekEnd(birth: Date, i: number) {
  return i % 52 === 51 ? +addYears(birth, Math.floor(i / 52) + 1) : weekStart(birth, i) + 7 * DAY;
}
export function weekNow(birth: Date, life: number, now = Date.now()) {
  for (let i = 0; i < life * 52; i++) if (weekEnd(birth, i) > now) return i;
  return life * 52 - 1;
}

export type Info = { pct: number; left: number; total: number; st: Status };
export function info(t: Task, now = Date.now()): Info {
  const at = t.pausedAt ?? now, total = Math.max(t.deadline - t.start, 1), left = t.deadline - at;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const st: Status = t.done ? 'done' : t.pausedAt ? 'paused' : pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red';
  return { pct, left, total, st };
}

// Time is shown in days: people who think in days start sooner (Lewis & Oyserman, 2015).
export function leftShort(ms: number) {
  const d = ms / DAY;
  if (ms < 0) { const o = Math.ceil(-d); return `${fmt(o)} ${o === 1 ? 'day' : 'days'} over`; }
  if (d < 1) return `${Math.max(1, Math.floor(ms / 36e5))} h`;
  const n = Math.ceil(d); return `${fmt(n)} ${n === 1 ? 'day' : 'days'}`;
}

export function boxesAt(t: Task, at: number) {
  const total = Math.max(t.deadline - t.start, 1), left = t.deadline - at, weekly = total / DAY <= 7 * 30;
  const size = weekly ? 7 * DAY : 30.44 * DAY, n = Math.max(1, Math.ceil(total / size));
  const gone = Math.min(n, Math.max(0, Math.floor((total - Math.max(left, 0)) / size)));
  return { n, gone, unit: weekly ? 'week' : 'month' };
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function daysLabel(ds: number[]) {
  const k = [...ds].sort().join('');
  if (k === '12345') return 'Weekdays';
  if (k === '06') return 'Weekends';
  if (ds.length === 7) return 'Every day';
  return [1, 2, 3, 4, 5, 6, 0].filter(n => ds.includes(n)).map(n => DAY_NAMES[n]).join(', ');
}

/** Next reserved session after `from`, or null if none before the deadline. */
export function nextSlot(t: Task, from = Date.now()): number | null {
  let n: number | null = null;
  if (t.slot?.days.length) {
    const [hh, mm] = t.slot.time.split(':').map(Number);
    for (let k = 0; k < 8 && n == null; k++) {
      const d = new Date(from); d.setDate(d.getDate() + k); d.setHours(hh, mm, 0, 0);
      if (+d > from && t.slot.days.includes(d.getDay())) n = +d;
    }
  }
  if (t.oneOff && t.oneOff > from && (n == null || t.oneOff < n)) n = t.oneOff;
  return n != null && n <= t.deadline ? n : null;
}

/** Most recent reserved session in the last 20 hours, so the app can ask how it went. */
export function lastSlot(t: Task, now = Date.now()): number | null {
  let best: number | null = null;
  if (t.slot?.days.length) {
    const [hh, mm] = t.slot.time.split(':').map(Number);
    for (let k = 0; k < 2; k++) {
      const d = new Date(now); d.setDate(d.getDate() - k); d.setHours(hh, mm, 0, 0);
      if (+d <= now && now - +d < 20 * 36e5 && +d >= t.start && t.slot.days.includes(d.getDay())) { best = +d; break; }
    }
  }
  if (t.oneOff && t.oneOff <= now && now - t.oneOff < 20 * 36e5 && (!best || t.oneOff > best)) best = t.oneOff;
  return best;
}

export function slotLabel(ms: number) {
  const d = new Date(ms), t0 = new Date().setHours(0, 0, 0, 0), diff = Math.round((new Date(ms).setHours(0, 0, 0, 0) - t0) / DAY);
  const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'long' });
  return `${day} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function whenLine(t: Task) {
  if (!t.slot && !t.oneOff) return '';
  const n = nextSlot(t);
  const when = n ? slotLabel(n) : t.slot ? `${daysLabel(t.slot.days)} ${t.slot.time}` : '';
  return [when, t.place].filter(Boolean).join(' · ');
}
