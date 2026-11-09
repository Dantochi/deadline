// Sessions on a timeline: what is reserved on a given day, a free time to suggest, overlap checks, and
// side-by-side columns for overlapping blocks (the day view on the Timeline screen).
import type { State, Task } from './store';
import { DAY, pad } from './time';

export const DEFAULT_MINUTES = 30;
const dayStart = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return +d; };
const at = (dayMs: number, hm: string) => { const [h, m] = hm.split(':').map(Number); const d = new Date(dayMs); d.setHours(h, m, 0, 0); return +d; };
export const toHM = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
export const fromHM = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

export type Block = {
  t: Task; start: number; minutes: number;
  state: 'planned' | 'done' | 'missed' | 'unanswered';
};

/** Every reserved session on the day containing `ms`: repeating slots while the task runs, plus one-off times. */
export function sessionsOn(state: State, ms: number): Block[] {
  const s = dayStart(ms), e = s + DAY, wd = new Date(s).getDay(), now = Date.now(), out: Block[] = [];
  for (const t of state.tasks) {
    if (t.letGo) continue;
    const minutes = t.minutes ?? DEFAULT_MINUTES;
    const ends = t.done && t.doneAt ? Math.min(t.deadline, t.doneAt) : t.deadline;
    const starts: number[] = [];
    if (t.slot?.days.includes(wd)) { const x = at(s, t.slot.time); if (x >= dayStart(t.start) && x <= ends) starts.push(x); }
    if (t.oneOff && t.oneOff >= s && t.oneOff < e && !starts.includes(t.oneOff)) starts.push(t.oneOff);
    for (const x of starts) {
      const done = (t.sessions ?? []).includes(x), asked = (t.checks ?? []).includes(x);
      out.push({ t, start: x, minutes, state: done ? 'done' : asked ? 'missed' : x + minutes * 6e4 < now ? 'unanswered' : 'planned' });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Minutes-of-day ranges already reserved on any of the given weekdays (by other tasks). */
function busy(state: State, days: number[], exceptId?: string) {
  const out: [number, number][] = [];
  for (const t of state.tasks) {
    if (t.id === exceptId || t.done || !t.slot || !t.slot.days.some(d => days.includes(d))) continue;
    const s = fromHM(t.slot.time); out.push([s, s + (t.minutes ?? DEFAULT_MINUTES)]);
  }
  return out;
}

/** Tasks whose sessions would overlap a new session at `hm` on these weekdays. */
export function overlaps(state: State, days: number[], hm: string, minutes: number, exceptId?: string): Task[] {
  const s = fromHM(hm), e = s + minutes;
  return state.tasks.filter(t => t.id !== exceptId && !t.done && t.slot && t.slot.days.some(d => days.includes(d))
    && fromHM(t.slot.time) < e && fromHM(t.slot.time) + (t.minutes ?? DEFAULT_MINUTES) > s);
}

/** The first free start (on the half hour) from `prefer`, between 06:00 and 22:00. */
export function suggestTime(state: State, days: number[], minutes: number, prefer = '07:00') {
  const taken = busy(state, days), start = fromHM(prefer);
  const free = (m: number) => !taken.some(([a, b]) => a < m + minutes && b > m);
  for (let k = 0; k < 48; k++) {
    for (const m of [start + k * 30, start - k * 30]) if (m >= 360 && m + minutes <= 1320 && free(m)) return toHM(m);
  }
  return prefer;
}

/** Side-by-side columns for overlapping blocks, as calendar day views do. */
export function columns(blocks: Block[]) {
  const placed: { b: Block; col: number; cols: number }[] = [];
  let group: { b: Block; col: number }[] = [], groupEnd = -1;
  const flush = () => { const n = Math.max(1, ...group.map(g => g.col + 1)); group.forEach(g => placed.push({ ...g, cols: n })); group = []; };
  for (const b of blocks) {
    const end = b.start + b.minutes * 6e4;
    if (group.length && b.start >= groupEnd) flush();
    const usedEnds: number[] = [];
    group.forEach(g => { usedEnds[g.col] = Math.max(usedEnds[g.col] ?? 0, g.b.start + g.b.minutes * 6e4); });
    let col = 0;
    while (usedEnds[col] != null && usedEnds[col] > b.start) col++;
    group.push({ b, col });
    groupEnd = Math.max(groupEnd, end);
  }
  if (group.length) flush();
  return placed;
}

/** Duration typed by the person: how a length in minutes is shown (hours when it is whole or half hours of 1 h+). */
export function toDuration(minutes: number): { value: string; unit: 'minutes' | 'hours' } {
  if (minutes >= 60 && minutes % 30 === 0) return { value: String(minutes / 60), unit: 'hours' };
  return { value: String(minutes), unit: 'minutes' };
}
/** The typed value and unit back to whole minutes (1 to 16 hours), or null when it isn't a usable number. */
export function fromDuration(value: string, unit: 'minutes' | 'hours'): number | null {
  const n = parseFloat(value.replace(',', '.'));
  if (!isFinite(n) || n <= 0) return null;
  const m = Math.round(unit === 'hours' ? n * 60 : n);
  return m >= 1 && m <= 16 * 60 ? m : null;
}

// Typing a time on the keypad, like a microwave: digits fill HH:MM from the left. A first digit of 3–9 can only
// be an hour, so it becomes 0X at once ("730" is 07:30). Digits that can't make a valid time are refused.
/** The buffer after pressing digit `d`, or null when that digit can't come next. */
export function keyTime(buf: string, d: string): string | null {
  if (!/^\d$/.test(d) || buf.length >= 4) return null;
  if (buf.length === 0) return +d >= 3 ? `0${d}` : d;
  if (buf.length === 1) return +(buf + d) <= 23 ? buf + d : null;
  if (buf.length === 2) return +d <= 5 ? buf + d : null;
  return buf + d;
}
/** The time a buffer stands for, as HH:MM ("07" → 07:00, "073" → 07:30), or null when nothing is typed. */
export function bufTime(buf: string): string | null {
  if (!buf) return null;
  const h = buf.length === 1 ? `0${buf}` : buf.slice(0, 2), m = (buf.slice(2) + '00').slice(0, 2);
  return `${h}:${m}`;
}
/** Minutes from start to end; an end before the start is the next day. Null when 0 or over 16 hours. */
export function lengthBetween(start: string, end: string): number | null {
  let n = fromHM(end) - fromHM(start);
  if (n <= 0) n += 24 * 60;
  return n > 0 && n <= 16 * 60 && n !== 24 * 60 ? n : null;
}
