// The daily summary: what today holds, shown the first time the app is opened each day.
import { dayDetail } from './calendar';
import { sessionsOn, type Block } from './schedule';
import type { State, Task } from './store';
import { info, ymd } from './time';

export type Brief = { sessions: Block[]; due: Task[]; overdue: Task[] };

/** Today's reserved sessions (in order), tasks whose deadline is today, and tasks already past their deadline. */
export function dailyBrief(state: State, now = Date.now()): Brief {
  const live = (t: Task) => !t.done && !t.letGo;
  const sessions = sessionsOn(state, now).filter(b => !b.t.pausedAt && (!b.t.done || b.state === 'done'));
  const due = dayDetail(state, now).tasks.filter(x => x.due && live(x.t)).map(x => x.t);
  const overdue = state.tasks.filter(t => live(t) && !t.pausedAt && info(t, now).left < 0 && !due.includes(t))
    .sort((a, b) => a.deadline - b.deadline);
  return { sessions, due, overdue };
}

/** True when the summary hasn't been shown yet today (and setup is finished). */
export const briefDue = (state: State, now = new Date()) => state.onboarded && state.briefSeen !== ymd(now);
