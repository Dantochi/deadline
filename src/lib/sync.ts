// Backup and sync, the pure part: which data is synced, what changed since the last sync, and how changes from
// other phones are merged in. The Firestore and encryption plumbing lives in SyncProvider; this file has no I/O so
// every rule here is unit-tested.
//
// Records: one per task ("t_<task id>") and one for the synced settings ("settings"). Each carries `t`, the time
// it was last changed on whichever phone changed it; the newest change to a record wins, except that a task's
// diary notes are merged note by note, so notes written on two phones are both kept. A deleted task leaves a
// marker (`del`) so a phone that was offline can't bring it back.
import type { Note, State, Task } from './store';

/** Settings that follow the person to every phone. Everything else (onboarding done, grid scroll position, what
 *  was seen today) belongs to the phone it happened on. */
export const SYNCED = ['birth', 'life', 'showGrid', 'appearance', 'showLived', 'shapes', 'focus', 'digest', 'shareTitles',
  'events', 'saved', 'tabOrder', 'aiParse', 'dictation', 'career'] as const;
export type Settings = Partial<Pick<State, (typeof SYNCED)[number]>>;

export type RecordData = { kind: 'settings'; v: Settings } | { kind: 'task'; v: Task };
/** A record as it arrives from the cloud, already decrypted. */
export type Remote = { id: string; t: number; del?: boolean; data?: RecordData };
/** What this phone knows: per record, when it last changed and a hash of its content; plus changes not yet sent. */
export type Meta = { known: Record<string, { t: number; h: string }>; out: Record<string, { t: number; del?: boolean }> };
export const emptyMeta = (): Meta => ({ known: {}, out: {} });
const DELETED = 'deleted';

export const taskId = (id: string) => `t_${id}`;
const isTask = (id: string) => id.startsWith('t_');

/** JSON with keys in a fixed order, so the same data always hashes the same. */
export function stable(v: unknown): string {
  if (v === undefined) return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v as object).sort().filter(k => (v as Record<string, unknown>)[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
}
/** FNV-1a over the stable JSON: a cheap fingerprint to spot changes (not for security). */
export function hash(v: unknown): string {
  const s = stable(v);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

export function settingsOf(s: State): Settings {
  const out: Record<string, unknown> = {};
  for (const k of SYNCED) if (s[k] !== undefined) out[k] = s[k];
  return out as Settings;
}
/** Every record this phone holds, by id. */
export function recordsOf(s: State): Map<string, RecordData> {
  const m = new Map<string, RecordData>([['settings', { kind: 'settings', v: settingsOf(s) }]]);
  for (const t of s.tasks) m.set(taskId(t.id), { kind: 'task', v: t });
  return m;
}

/** Finds what changed on this phone since the last look, and queues it to send (deletions as markers). */
export function diff(s: State, meta: Meta, now: number): Meta {
  const known = { ...meta.known }, out = { ...meta.out }, here = recordsOf(s);
  for (const [id, r] of here) {
    const h = hash(r.v);
    if (known[id]?.h !== h) { const t = Math.max(now, (known[id]?.t ?? 0) + 1); known[id] = { t, h }; out[id] = { t }; }
  }
  for (const id of Object.keys(known)) {
    if (isTask(id) && !here.has(id) && known[id].h !== DELETED) {
      const t = Math.max(now, known[id].t + 1);
      known[id] = { t, h: DELETED }; out[id] = { t, del: true };
    }
  }
  return { known, out };
}

/** Diary notes from both sides, one copy of each, the most recently edited version of any note kept. */
export function mergeNotes(a: Note[] = [], b: Note[] = []): Note[] {
  const m = new Map<string, Note>();
  for (const n of [...a, ...b]) { const x = m.get(n.id); if (!x || n.edited > x.edited) m.set(n.id, n); }
  return [...m.values()].sort((x, y) => x.at - y.at);
}
/** The incoming task, with the notes this phone has that it doesn't. */
function mergeTask(local: Task | undefined, remote: Task): Task {
  if (!local) return remote;
  const log = mergeNotes(local.log, remote.log);
  return log.length ? { ...remote, log } : remote;
}
/** Lists (important dates, saved quotes) from both sides, nothing dropped: used only the first time a phone joins. */
function union<T>(a: T[] | undefined, b: T[] | undefined, key: (x: T) => string): T[] | undefined {
  if (!a && !b) return undefined;
  const m = new Map<string, T>();
  for (const x of [...(a ?? []), ...(b ?? [])]) m.set(key(x), x); // the second (cloud) copy wins
  return [...m.values()];
}

/** Applies changes from other phones. A record changed here more recently (or still waiting to be sent) is kept;
 *  the server copy wins otherwise. Returns the new state and what is now known about each record. */
export function applyRemote(s: State, meta: Meta, docs: Remote[]): { state: State; meta: Meta; changed: boolean } {
  const known = { ...meta.known }, out = { ...meta.out };
  let tasks = s.tasks, settings: Settings | null = null, changed = false;
  for (const d of docs) {
    const mine = Math.max(known[d.id]?.t ?? 0, out[d.id]?.t ?? 0);
    if (mine >= d.t) continue;
    if (d.del) {
      if (isTask(d.id)) { const before = tasks.length; tasks = tasks.filter(t => taskId(t.id) !== d.id); changed ||= tasks.length !== before; }
      known[d.id] = { t: d.t, h: DELETED };
      delete out[d.id];
      continue;
    }
    if (!d.data) continue;
    // Remember the server's version: if the merge below differs from it (notes only this phone had), the next
    // diff sees the difference and sends the merged task back, so every phone ends up the same.
    known[d.id] = { t: d.t, h: hash(d.data.v) };
    delete out[d.id];
    if (d.data.kind === 'settings') { settings = d.data.v; changed = true; continue; }
    const remote = d.data.v, i = tasks.findIndex(t => t.id === remote.id);
    const merged = mergeTask(i >= 0 ? tasks[i] : undefined, remote);
    tasks = i >= 0 ? tasks.map((t, j) => (j === i ? merged : t)) : [...tasks, merged];
    changed = true;
  }
  const state = changed ? { ...s, ...(settings ?? {}), tasks } : s;
  return { state, meta: { known, out }, changed };
}

/** The first time a phone joins: nothing is lost. Tasks and lists from both sides are kept; where both have the
 *  same task or setting, the cloud copy wins (with notes from both). Deleted markers don't remove anything here. */
export function firstMerge(s: State, docs: Remote[]): { state: State; meta: Meta } {
  const known: Meta['known'] = {};
  let tasks = [...s.tasks], next: State = s;
  for (const d of docs) {
    if (d.del || !d.data) { known[d.id] = { t: d.t, h: DELETED }; continue; }
    known[d.id] = { t: d.t, h: hash(d.data.v) };
    if (d.data.kind === 'settings') {
      const c = d.data.v;
      next = {
        ...next, ...c,
        events: union(next.events, c.events, e => e.id),
        saved: union(next.saved, c.saved, x => x),
      };
      continue;
    }
    const remote = d.data.v, i = tasks.findIndex(t => t.id === remote.id);
    const merged = mergeTask(i >= 0 ? tasks[i] : undefined, remote);
    if (i >= 0) tasks[i] = merged; else tasks.push(merged);
  }
  return { state: { ...next, tasks }, meta: { known, out: {} } };
}

/** After a send: drop the queued changes that went out, unless the record changed again meanwhile. */
export function sent(meta: Meta, ids: { id: string; t: number }[]): Meta {
  const out = { ...meta.out };
  for (const { id, t } of ids) if (out[id]?.t === t) delete out[id];
  return { known: meta.known, out };
}
