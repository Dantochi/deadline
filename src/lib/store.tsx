import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LifeEvent } from './events';
import { info } from './time';

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
  notes?: string;
  steps?: { title: string; date: number; done: boolean }[];
  checks?: number[];
  sessions?: number[];
  missedAt?: number | null;
  pausedAt?: number | null;
  done?: boolean;
  doneAt?: number;
  letGo?: boolean;
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
      .then(raw => { if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) }); })
      .catch(() => {})
      .finally(() => { loaded.current = true; setReady(true); });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

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

export const uid = () => Math.random().toString(36).slice(2, 10);
export const activeTasks = (s: State) =>
  s.tasks.filter(t => !t.done && !t.pausedAt).sort((a, b) => info(a).pct - info(b).pct);
