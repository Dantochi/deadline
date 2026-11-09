import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { LifeEvent } from './events';
import { info } from './time';

export type Step = { id: string; title: string; date?: number | null; done: boolean };
/** A diary entry on a task. `at` is when it was first written, `edited` the last change. */
export type Note = { id: string; at: number; edited: number; title?: string; text: string; pinned?: boolean };

export type TabName = 'index' | 'year' | 'hours' | 'wisdom';
export const TABS: TabName[] = ['index', 'year', 'hours', 'wisdom'];
export const TAB_TITLES: Record<TabName, string> = { index: 'Life', year: 'Year', hours: 'Day', wisdom: 'Wisdom' };
/** A saved tab order with unknown names dropped and missing ones appended, so it always holds every tab once. */
export const fixTabOrder = (o?: unknown): TabName[] => {
  const seen = (Array.isArray(o) ? o : []).filter((x, i, a): x is TabName => TABS.includes(x as TabName) && a.indexOf(x) === i);
  return [...seen, ...TABS.filter(t => !seen.includes(t))];
};

export type Task = {
  id: string;
  title: string;
  start: number;
  deadline: number;
  slot?: { days: number[]; time: string } | null;
  oneOff?: number | null;
  place?: string;
  cue?: string;
  ifthen?: string;
  notes?: string; // old single note; moved into `log` on load
  log?: Note[]; // the task's diary
  steps?: Step[]; // subtasks (a checklist)
  checks?: number[];
  sessions?: number[];
  missedAt?: number | null;
  pausedAt?: number | null;
  done?: boolean;
  doneAt?: number;
  letGo?: boolean;
  minutes?: number; // length of each reserved session (default 30)
  color?: string | null; // the person's colour for this task on the Year calendar (default: status colour)
};

export type State = {
  onboarded: boolean;
  birth: string; // YYYY-MM-DD
  life: number;
  showGrid: boolean;
  appearance?: 'system' | 'light' | 'dark'; // theme override; default follows the phone
  showLived?: boolean;
  gridTop?: number; // row (year of life, fractional) at the top of the lived-weeks grid where the person last scrolled // draw the weeks already lived, from birth (the grid then scrolls)
  shapes: boolean;
  focus?: string;
  digest: string[]; // three times a day, HH:MM
  partner?: string; // partner's display name, kept in sync by PartnerProvider
  reviewSeen?: string; // Monday (YYYY-MM-DD) of the week whose review was opened
  shareTitles?: boolean; // include task titles in the weekly summary the partner sees (default on)
  events?: LifeEvent[]; // important dates shown on the life grid
  saved?: string[]; // saved Wisdom quotes (quoteKey)
  tabOrder?: TabName[]; // order of the bottom tabs, set in Settings
  aiParse?: boolean; // let Gemini read spoken/typed tasks (sends the sentence to Google); off by default
  tasks: Task[];
};

export const KEY = 'deadline.v1';
export const DEFAULT_STATE: State = {
  onboarded: false, birth: '1995-01-01', life: 80, showGrid: true, shapes: true,
  digest: ['09:00', '15:00', '21:00'], tasks: [],
};

type Ctx = {
  state: State;
  ready: boolean;
  update: (fn: (s: State) => State) => void;
  updateTask: (id: string, fn: (t: Task) => Task) => void;
};
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then(raw => { if (raw) setState(migrate({ ...DEFAULT_STATE, ...JSON.parse(raw) })); })
      .catch(() => {})
      .finally(() => { loaded.current = true; setReady(true); });
  }, []);

  // Save shortly after changes settle, not on every keystroke-sized update; flush when the app goes to background.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => { AsyncStorage.setItem(KEY, JSON.stringify(latest.current)).catch(() => {}); }, 300);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s !== 'active' && loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(latest.current)).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const update = useCallback((fn: (s: State) => State) => setState(fn), []);
  const updateTask = useCallback((id: string, fn: (t: Task) => Task) =>
    setState(s => ({ ...s, tasks: s.tasks.map(t => (t.id === id ? fn(t) : t)) })), []);

  const value = useMemo(() => ({ state, ready, update, updateTask }), [state, ready, update, updateTask]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/** Brings saved data up to date: the single notes string becomes the first diary entry; the tab order is made whole. */
export function migrate(s: State): State {
  const tasks = s.tasks.map(t => (t.notes && t.notes.trim()
    ? { ...t, notes: undefined, log: [{ id: `n${t.id}`, at: t.start, edited: t.start, text: t.notes.trim() }, ...(t.log ?? [])] }
    : t));
  return { ...s, tasks, tabOrder: fixTabOrder(s.tabOrder) };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const activeTasks = (s: State) =>
  s.tasks.filter(t => !t.done && !t.pausedAt).sort((a, b) => info(a).pct - info(b).pct);
