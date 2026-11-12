// Wisdom for your work: the career someone does, or the one a student is heading towards, picked at setup or in
// Settings. Careers that harm others are refused, first by the list below on the phone (never sent anywhere), then
// by Gemini. Gemini suggests well-known creators in the field and their best-known works; every link it leads to
// is a search (YouTube or the web) for a real name or title, so nothing is invented.
import { Schema } from 'firebase/ai';
import { GEMINI_FALLBACK, GEMINI_MODEL, geminiJSON, type Tries } from './ai';

export type Work = { title: string; type: 'book' | 'video' | 'podcast' | 'article' | 'talk' };
export type Creator = { name: string; kind: 'author' | 'youtube' | 'podcast' | 'blog' | 'speaker'; why?: string; works: Work[] };
export type Career = {
  title: string; // as typed, e.g. "Nurse" or "Software engineering"
  student: boolean; // heading towards it rather than working in it
  creators: Creator[]; // the ones picked (or typed in)
  suggested?: Creator[]; // what Gemini offered last time, to pick from again in Settings
};

/** Careers we don't tailor to: work whose aim is harming people or society. Ordinary lawful jobs that only touch
 *  hard subjects (soldiers in national forces, police, security, criminal law, medicine) are not on it. */
const BLOCK = [
  /milit(a|i)n(t|cy)/, /terror/, /jihad/, /insurg/, /extremis/, /guerr?ill?a/, /\bwarlord/, /mercenar/,
  /bomb ?mak/, /hit ?man/, /assassin/, /kidnap/, /gang(ster)?\b/, /\bcartel/, /mafia/, /organi[sz]ed crime/,
  /(drug|arms|gun|weapons?|human|sex|child|organ) ?(dealer|dealing|traffick|smuggl|runner)/, /traffick/, /smuggl/,
  /scam/, /fraudster/, /\bfraud\b/, /yahoo ?(boy|plus)/, /419/, /money launder/, /hacker for hire/, /black ?hat/,
  /poach/, /pimp/, /\bthief\b/, /robber/, /burglar/, /pirate/, /\bcult\b/,
];
/** Work against those harms is fine: "fraud investigator", "counter-terrorism officer", "scam prevention". */
const PROTECT = [
  /\b(anti|counter)/, /investigat/, /analyst/, /prevent/, /detect/, /examiner/, /officer/, /police/, /lawyer/, /attorney/,
  /prosecut/, /judge/, /researcher/, /journalis/, /historian/, /consultant/, /auditor/, /compliance/, /security/, /forensic/,
];
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** True when the phone's own list refuses this career. */
export const blockedCareer = (title: string) => { const t = norm(title); return BLOCK.some(re => re.test(t)) && !PROTECT.some(re => re.test(t)); };
/** True for work that guards against harm (investigators, police, prosecutors, counter-terrorism…). Gemini has been
 *  seen refusing these ("fraud investigator"), so its refusal is not taken as final for them. */
export const protectiveCareer = (title: string) => PROTECT.some(re => re.test(norm(title)));

const SYSTEM = `You help a planner app suggest learning material for a person's career, or the career a student is
studying towards. Answer in English only.
First decide "allowed": false only if the career itself is committing violence against people, terrorism or militancy,
organised crime, trafficking, fraud or scams, or otherwise harming society. Set true for ordinary lawful work, including
soldiers in national armed forces, police, security, law, medicine and nursing, and for every role that investigates,
prevents, prosecutes or defends against crime, terrorism or fraud (for example a fraud investigator or a
counter-terrorism analyst).
If allowed, give 8 to 12 well-known, real, currently findable authors and creators in that field; for students
include people who teach or explain the field well. Never invent people or titles. For each, give 1 to 3 of their
best-known works (book, talk, video series, podcast or essay) with the title exactly as published. Keep every string
short.`;

// No free-text fields beyond names and titles, and the list first: in live tests (12 Nov 2026) a free "field" label
// made the small model ramble inside it and never reach the list.
const schema = Schema.object({
  properties: {
    allowed: Schema.boolean(),
    creators: Schema.array({
      items: Schema.object({
        properties: {
          name: Schema.string(), kind: Schema.enumString({ enum: ['author', 'youtube', 'podcast', 'blog', 'speaker'] }),
          works: Schema.array({ items: Schema.object({ properties: { title: Schema.string(), type: Schema.enumString({ enum: ['book', 'video', 'podcast', 'article', 'talk'] }) } }) }),
        },
        propertyOrdering: ['name', 'kind', 'works'],
      }),
    }),
  },
  propertyOrdering: ['allowed', 'creators'],
});

const KINDS = ['author', 'youtube', 'podcast', 'blog', 'speaker'] as const;
const TYPES = ['book', 'video', 'podcast', 'article', 'talk'] as const;
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Checks Gemini's answer field by field and keeps only what is usable. */
export function fromSuggestion(a: Record<string, unknown> | null): { allowed: boolean; field: string; creators: Creator[] } | null {
  if (!a || typeof a.allowed !== 'boolean') return null;
  if (!a.allowed) return { allowed: false, field: '', creators: [] };
  const seen = new Set<string>();
  const creators = (Array.isArray(a.creators) ? a.creators : []).flatMap((c: any): Creator[] => {
    const name = str(c?.name, 60);
    if (name.length < 3 || seen.has(name.toLowerCase())) return [];
    seen.add(name.toLowerCase());
    const kind = KINDS.includes(c?.kind) ? c.kind : 'author';
    const works = (Array.isArray(c?.works) ? c.works : []).flatMap((w: any): Work[] => {
      const title = str(w?.title, 120);
      return title.length > 1 ? [{ title, type: TYPES.includes(w?.type) ? w.type : 'book' }] : [];
    }).slice(0, 3);
    return [{ name, kind, why: str(c?.why, 140) || undefined, works }];
  }).slice(0, 12);
  // The field is shown as a label: two to four plain words, or nothing (a runaway or non-English answer is dropped).
  const f = str(a.field, 40);
  const field = /^[A-Za-z][A-Za-z&'\- ]*$/.test(f) && f.split(' ').length <= 4 ? f : '';
  return { allowed: true, field, creators };
}

// A long answer (8 to 12 creators with works). Measured 12 Nov 2026: Flash answers in 5.5 to 8 s; Flash-Lite was
// taking 14 to 20 s or reporting high demand. So Flash first, Flash-Lite as the fallback: about 25 s at most.
const TRIES: Tries = [[GEMINI_FALLBACK, 12000, 0], [GEMINI_MODEL, 10000, 1000]];

export type Suggestion =
  | { status: 'ok'; field: string; creators: Creator[] }
  | { status: 'refused' } // harmful career: the general Wisdom collection only
  | { status: 'offline' }; // Gemini unavailable: the person can still add creators by name

/** Checks the career and asks Gemini for creators. The phone's list runs first and never sends a refused career. */
export async function suggestCreators(title: string, student: boolean): Promise<Suggestion> {
  if (blockedCareer(title)) return { status: 'refused' };
  const r = fromSuggestion(await geminiJSON(SYSTEM, `${student ? 'Student heading towards' : 'Career'}: ${title.slice(0, 80)}`, schema, undefined, TRIES));
  if (!r) return { status: 'offline' };
  // Gemini refusing a protective job is a mistake, not a verdict: offer the manual way instead of refusing.
  if (!r.allowed) return protectiveCareer(title) ? { status: 'offline' } : { status: 'refused' };
  // An answer with nobody usable in it is no answer: let the person add names instead of showing an empty list.
  return r.creators.length ? { status: 'ok', field: r.field, creators: r.creators } : { status: 'offline' };
}

const yt = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const web = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

/** Where a creator or one of their works opens: a YouTube search for videos, talks and YouTube creators, a web
 *  search for everything else. Real names and titles only, so the results are always real. */
export const creatorLink = (c: Creator, field: string) => (c.kind === 'youtube' || c.kind === 'speaker' ? yt(`${c.name} ${field}`.trim()) : web(`${c.name} ${field}`.trim()));
export const workLink = (w: Work, c: Creator) => (w.type === 'video' || w.type === 'talk' ? yt(`${w.title} ${c.name}`) : web(`"${w.title}" ${c.name}`));
