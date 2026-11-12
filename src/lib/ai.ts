// Optional: Gemini reads a spoken or typed task, through Firebase AI Logic (the Gemini Developer API behind
// Firebase, so no key ships in the app and no server of our own is needed). Off unless the person turns it on in
// Settings. Only the sentence and today's date are sent. Whatever comes back is checked field by field, and the
// on-phone parser (lib/parse) has already filled the form, so a slow, failed or odd answer changes nothing.
import { getApps, initializeApp } from 'firebase/app';
import { GoogleAIBackend, Schema, getAI, getGenerativeModel, type GenerativeModel, type ObjectSchema } from 'firebase/ai';
import { firebaseConfig, firebaseReady } from './firebase';
import type { Parsed } from './parse';

/** The model to ask. Check Firebase console → AI Logic for the current Flash-Lite model ID before release. */
export const GEMINI_MODEL = 'gemini-3.5-flash-lite'; // 2.5 Flash-Lite was retired for new projects (checked 10 Nov 2026)
const TIMEOUT = 6000;

export const aiAvailable = firebaseReady;

const schema = Schema.object({
  properties: {
    title: Schema.string({ description: 'The task itself, short, without the date, time, length or subtask words.' }),
    deadline: Schema.string({ description: 'Deadline as YYYY-MM-DD, or empty if none was said.' }),
    days: Schema.array({ items: Schema.integer(), description: 'Repeating weekdays for work sessions, 0 = Sunday … 6 = Saturday. Empty if not repeating.' }),
    once: Schema.string({ description: 'A single session day as YYYY-MM-DD, or empty.' }),
    time: Schema.string({ description: 'Session start, 24-hour HH:MM, or empty.' }),
    minutes: Schema.integer({ description: 'Session length in minutes, or 0 if not said. A range like 6 to 7:30pm is 90.' }),
    end: Schema.string({ description: 'Session end, 24-hour HH:MM, only when an end was said without a length; else empty.' }),
    steps: Schema.array({ items: Schema.string(), description: 'Subtasks, each a short phrase starting with a capital. Spoken lists often lack commas: split them by meaning.' }),
  },
});

let model: GenerativeModel | null = null;
function gemini() {
  if (!firebaseReady) return null;
  if (!model) {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0 },
      systemInstruction: 'You turn one sentence about a goal into fields for a planner app. Use only what the sentence says; leave a field empty (or 0) when it was not said. Resolve relative dates ("Friday", "in two weeks", "end of the month") from today\'s date. A bare hour from 1 to 6 means pm unless morning is said.',
    });
  }
  return model;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const day = (s: unknown) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split('-').map(Number), out = new Date(y, m - 1, d, 12);
  return out.getMonth() === m - 1 ? out : undefined;
};
const hm = (s: unknown) => (typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : undefined);

/** Checks Gemini's answer and turns it into the same shape the on-phone parser gives. */
export function fromAnswer(a: Record<string, unknown>, now = new Date()): Parsed | null {
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const future = (d?: Date) => (d && +d >= +today && +d < +today + 20 * 365 * 864e5 ? d : undefined);
  const out: Parsed = { title: typeof a.title === 'string' ? a.title.trim().slice(0, 120) : '', found: [] };
  out.deadline = future(day(a.deadline));
  const days = Array.isArray(a.days) ? [...new Set(a.days.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))] : [];
  if (days.length) out.days = days;
  else out.once = future(day(a.once));
  out.time = hm(a.time);
  if (typeof a.minutes === 'number' && a.minutes >= 5 && a.minutes <= 16 * 60) out.minutes = Math.round(a.minutes);
  if (!out.minutes) out.end = hm(a.end);
  const steps = Array.isArray(a.steps) ? a.steps.filter((x): x is string => typeof x === 'string' && x.trim().length > 1).map(x => x.trim().slice(0, 120)).map(x => x.charAt(0).toUpperCase() + x.slice(1)).slice(0, 20) : [];
  if (steps.length) out.steps = steps;
  if (!out.title && !out.deadline && !out.days && !out.once && !out.time && !out.minutes && !out.steps) return null;

  // What was understood, said back in the form's "Understood" line.
  const D = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const short = (d: Date) => `${D[d.getDay()]} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`;
  if (out.deadline) out.found.push(`by ${short(out.deadline)}`);
  if (out.days) out.found.push(out.days.length === 7 ? 'every day' : [1, 2, 3, 4, 5, 6, 0].filter(d => out.days!.includes(d)).map(d => D[d]).join(', '));
  if (out.once) out.found.push(`on ${short(out.once)}`);
  if (out.time) out.found.push(out.time);
  if (out.minutes) out.found.push(out.minutes % 60 === 0 ? `${out.minutes / 60} h` : out.minutes > 60 ? `${Math.floor(out.minutes / 60)} h ${out.minutes % 60} min` : `${out.minutes} min`);
  if (out.end) out.found.push(`until ${out.end}`);
  if (out.steps) out.found.push(`${out.steps.length} subtask${out.steps.length === 1 ? '' : 's'}`);
  return out;
}

/** Asks Gemini to read the sentence. Null when it is off, offline, slow (6 s) or the answer is unusable. */
export async function aiParse(sentence: string, now = new Date()): Promise<Parsed | null> {
  const m = gemini();
  if (!m || !sentence.trim()) return null;
  const today = `${ymd(now)} (${now.toLocaleDateString('en-GB', { weekday: 'long' })}), time ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  try {
    const res = await Promise.race([
      m.generateContent(`Today is ${today}.\nSentence: ${sentence.slice(0, 600)}`),
      new Promise<null>(r => setTimeout(() => r(null), TIMEOUT)),
    ]);
    if (!res) return null;
    return fromAnswer(JSON.parse(res.response.text()), now);
  } catch {
    return null;
  }
}

/**
 * One JSON answer from Gemini for another feature (e.g. career suggestions), with the same setup as above.
 * Null when Firebase isn't set up, offline, slow, refused (including App Check failures) or not valid JSON.
 */
/** The larger model, tried once when Flash-Lite is busy (both confirmed available to the project, 12 Nov 2026). */
export const GEMINI_FALLBACK = 'gemini-3.5-flash';

/** One attempt: the parsed answer, 'busy' for a timeout or an overloaded model (worth retrying), or null. */
async function askOnce(model: string, system: string, prompt: string, responseSchema: ObjectSchema, ms: number):
  Promise<Record<string, unknown> | 'busy' | null> {
  try {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const m = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
      model, systemInstruction: system,
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.2, maxOutputTokens: 2048 },
    });
    const res = await Promise.race([m.generateContent(prompt), new Promise<null>(r => setTimeout(() => r(null), ms))]);
    if (!res) return 'busy';
    const v = JSON.parse(res.response.text());
    return v && typeof v === 'object' ? v : null;
  } catch (e) {
    // "High demand" comes back as a 500 or 503 (and sometimes 429); everything else (App Check, bad JSON) is final.
    return /\b(429|500|503)\b|overloaded|high demand|unavailable|exhausted/i.test(String((e as Error)?.message ?? e)) ? 'busy' : null;
  }
}

export type Ask = (model: string, system: string, prompt: string, schema: ObjectSchema, ms: number) => ReturnType<typeof askOnce>;

/** [model, time limit in ms, wait before the try in ms]. The default: Flash-Lite, again after 1.5 s, then Flash. */
export type Tries = [string, number, number][];
const DEFAULT_TRIES: Tries = [[GEMINI_MODEL, 6000, 0], [GEMINI_MODEL, 4000, 1500], [GEMINI_FALLBACK, 4000, 0]];

/**
 * One JSON answer from Gemini, retried when the model is busy, in the order `tries` gives. Null when Firebase isn't
 * set up, offline, refused (including App Check failures) or still busy after the last try.
 */
export async function geminiJSON(system: string, prompt: string, responseSchema: ObjectSchema, ask: Ask = askOnce, tries: Tries = DEFAULT_TRIES): Promise<Record<string, unknown> | null> {
  if (!firebaseReady) return null;
  for (const [model, ms, wait] of tries) {
    if (wait) await new Promise(r => setTimeout(r, wait));
    const r = await ask(model, system, prompt, responseSchema, ms);
    if (r !== 'busy') return r;
  }
  return null;
}
