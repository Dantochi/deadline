// Turns a spoken or typed sentence into task fields, on the phone (no AI, nothing sent anywhere):
//   "Write chapter three by Friday, weekdays at 7am for 45 minutes"
//   → title "Write chapter three", deadline next Friday, sessions Mon–Fri 07:00, 45 minutes.
// Deadline words: by / before / due / until / in N weeks. Session words: weekdays, every Monday, tomorrow, on Friday.
// Time: at 7, 7:30pm, half past six, noon, in the evening. Length: for 45 minutes, for an hour and a half.

export type Parsed = {
  title: string;
  deadline?: Date;
  days?: number[]; // repeating weekdays
  once?: Date; // a single session day
  time?: string; // HH:MM
  minutes?: number;
  found: string[]; // the phrases understood, to show back
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, 'forty-five': 45, 'forty five': 45, fifty: 50, sixty: 60, ninety: 90,
};
const DAY = 864e5;
const num = (s: string) => (NUM[s.toLowerCase()] ?? parseFloat(s));
const pad = (n: number) => String(n).padStart(2, '0');
const wdRe = '(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)s?';
const wdIndex = (s: string) => WEEKDAYS.findIndex(w => w.startsWith(s.toLowerCase().replace(/s$/, '').slice(0, 3)));
const numRe = `(\\d+(?:\\.\\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty[- ]five|forty|fifty|sixty|ninety)`;

/** The next date (after today) that falls on weekday `wd`; `next` adds a week when said "next Friday". */
function nextWeekday(wd: number, now: Date, next = false) {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  let add = (wd - d.getDay() + 7) % 7 || 7;
  if (next && add < 7) add += 0; // "next Friday" said on Monday usually means this coming Friday
  d.setDate(d.getDate() + add);
  return d;
}
function addUnits(now: Date, n: number, unit: string) {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  if (/^day/.test(unit)) d.setDate(d.getDate() + n);
  else if (/^week/.test(unit)) d.setDate(d.getDate() + 7 * n);
  else if (/^month/.test(unit)) d.setMonth(d.getMonth() + n);
  else d.setFullYear(d.getFullYear() + n);
  return d;
}
/** "30 March", "March 30th", "30/3": the next such date. */
function dateFrom(text: string, now: Date): { d: Date; m: string } | null {
  const mon = `(${MONTHS.map(m => m.slice(0, 3)).join('|')})[a-z]*`;
  let r = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${mon}\\b`, 'i').exec(text);
  let day: number | null = null, month: number | null = null;
  if (r) { day = +r[1]; month = MONTHS.findIndex(m => m.startsWith(r![2].toLowerCase())); }
  if (!r) { r = new RegExp(`\\b${mon} (\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i').exec(text); if (r) { month = MONTHS.findIndex(m => m.startsWith(r![1].toLowerCase())); day = +r[2]; } }
  if (!r) { r = /\b(\d{1,2})\/(\d{1,2})\b/.exec(text); if (r) { day = +r[1]; month = +r[2] - 1; } }
  if (!r || day == null || month == null || month < 0) return null;
  const d = new Date(now.getFullYear(), month, day, 12);
  if (+d < +now - DAY) d.setFullYear(d.getFullYear() + 1);
  return { d, m: r[0] };
}

export function parseTask(input: string, now = new Date()): Parsed {
  let text = ` ${input.replace(/[,.;]+(\s|$)/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const found: string[] = [];
  const take = (re: RegExp) => { const m = re.exec(text); if (m) { text = text.replace(m[0], ' '); found.push(m[0].trim()); } return m; };
  const out: Parsed = { title: '', found };

  // Length: "for 45 minutes", "for an hour and a half", "for 1.5 hours", "for half an hour".
  let m = take(/\bfor half an? hour\b/i);
  if (m) out.minutes = 30;
  if (!m && (m = take(new RegExp(`\\bfor ${numRe} (hours?|hrs?|h|minutes?|mins?|m)( and a half)?\\b`, 'i')))) {
    const n = num(m[1]), unit = m[2].toLowerCase();
    out.minutes = Math.round(/^h/.test(unit) ? n * 60 + (m[3] ? 30 : 0) : n);
  }

  // Deadline: "by/before/due/until <date|weekday|tomorrow|end of the month>", "in/within N weeks".
  const dl = '(?:by|before|due(?: on| by)?|until|deadline(?: is)?)';
  if ((m = take(new RegExp(`\\b${dl} (?:the )?end of (?:the |this )?(week|month|year)\\b`, 'i')))) {
    const d = new Date(now); d.setHours(12, 0, 0, 0);
    if (m[1] === 'week') d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    else if (m[1] === 'month') { d.setMonth(d.getMonth() + 1, 0); } else d.setMonth(11, 31);
    out.deadline = d;
  } else if ((m = take(new RegExp(`\\b${dl} tomorrow\\b`, 'i')))) out.deadline = addUnits(now, 1, 'day');
  else if ((m = take(new RegExp(`\\b${dl} next (week|month|year)\\b`, 'i')))) out.deadline = addUnits(now, 1, m[1]);
  else if ((m = take(new RegExp(`\\b${dl} (next )?(${wdRe})\\b`, 'i')))) out.deadline = nextWeekday(wdIndex(m[2]), now, !!m[1]);
  else if ((m = take(new RegExp(`\\b(?:in|within) ${numRe} (days?|weeks?|months?|years?)\\b`, 'i')))) out.deadline = addUnits(now, num(m[1]), m[2].toLowerCase());
  else {
    const re = new RegExp(`\\b${dl} `, 'i'), at = re.exec(text);
    if (at) {
      const d = dateFrom(text.slice(at.index), now);
      if (d) { text = text.replace(at[0] + d.m, ' ').replace(d.m, ' '); found.push(`${at[0].trim()} ${d.m}`); out.deadline = d.d; }
    }
  }

  // Sessions: weekdays / weekends / every day / every Monday and Wednesday / tomorrow / today / on Friday / a date.
  if (take(/\b(?:on |every )?weekdays\b/i)) out.days = [1, 2, 3, 4, 5];
  else if (take(/\b(?:on |every )?weekends?\b/i)) out.days = [6, 0];
  else if (take(/\b(?:every ?day|daily|each day)\b/i)) out.days = [0, 1, 2, 3, 4, 5, 6];
  else if ((m = take(new RegExp(`\\b(?:every|on|each) (${wdRe}(?:(?: and|,|&)? ${wdRe})*)\\b`, 'i'))) || (m = take(new RegExp(`\\b(${wdRe}s(?:(?: and|,|&)? ${wdRe}s)*)\\b`, 'i')))) {
    const names = m[1].split(/\s*(?:and|,|&)\s*|\s+/).filter(Boolean).map(wdIndex).filter(i => i >= 0);
    // "every Monday" repeats; "on Friday" (one name, no plural) is a single session.
    if (/^on /i.test(m[0]) && names.length === 1 && !/s$/i.test(m[1])) out.once = nextWeekday(names[0], now);
    else out.days = [...new Set(names)];
  } else if (take(/\btomorrow\b/i)) out.once = addUnits(now, 1, 'day');
  else if (take(/\b(?:today|tonight)\b/i)) { out.once = new Date(now); out.once.setHours(12, 0, 0, 0); if (/tonight/i.test(found[found.length - 1])) out.time = '20:00'; }
  else if ((m = /\bon (?:the )?/i.exec(text))) {
    const d = dateFrom(text.slice(m.index), now);
    if (d) { text = text.replace(m[0] + d.m, ' ').replace(d.m, ' '); found.push(`on ${d.m}`); out.once = d.d; }
  }

  // Time: "at 7", "at 7:30pm", "7am", "half past six", "quarter to eight", noon, midnight, morning/afternoon/evening.
  const fix = (h: number, mer?: string) => {
    if (mer) { const pm = /p/i.test(mer); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    else if (h >= 1 && h <= 6) h += 12; // "at 5" means 5 in the evening for most people
    return h;
  };
  if ((m = take(/\b(?:at )?(half past|quarter past|quarter to) (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)( ?(?:am|pm|a\.m\.|p\.m\.))?\b/i))) {
    let h = num(m[2]), min = /half/i.test(m[1]) ? 30 : 15;
    if (/to/i.test(m[1])) { h -= 1; min = 45; }
    out.time = `${pad(fix(h, m[3]))}:${pad(min)}`;
  } else if ((m = take(/\b(?:at )?(\d{1,2})(?:[:.](\d{2}))? ?(am|pm|a\.m\.|p\.m\.)\b/i)) || (m = take(/\bat (\d{1,2})(?:[:.](\d{2}))?\b/i))) {
    out.time = `${pad(fix(+m[1], m[3]))}:${pad(m[2] ? +m[2] : 0)}`;
  } else if (take(/\b(?:at )?noon\b/i)) out.time = '12:00';
  else if (take(/\b(?:at )?midnight\b/i)) out.time = '00:00';
  else if ((m = take(/\b(?:in the |every |each )?(morning|afternoon|evening|night)s?\b/i))) out.time = { morning: '07:00', afternoon: '14:00', evening: '19:00', night: '21:00' }[m[1].toLowerCase()]!;

  // What's left is the task, without filler.
  out.title = text.replace(/\b(?:i (?:need|want|have) to|remind me to|i'll|i will|please|task:?)\b/gi, ' ')
    .replace(/\s+(?:and|at|on|for|by|to)\s*$/i, '').replace(/^\s*(?:to|and)\s+/i, '').replace(/\s+/g, ' ').trim();
  out.title = out.title.charAt(0).toUpperCase() + out.title.slice(1);
  return out;
}
