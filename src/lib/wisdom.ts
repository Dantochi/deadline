// Wisdom content. Quotes are checked against their published sources; links open in the browser or the video app.
export type Quote = { q: string; who: string; src: string };
export type Link = { title: string; by: string; url: string };

export const QUOTES: Quote[] = [
  { q: 'It is not that we have a short time to live, but that we waste a lot of it.', who: 'Seneca', src: 'On the Shortness of Life, c. 49 AD' },
  { q: "Remembering that I'll be dead soon is the most important tool I've ever encountered to help me make the big choices in life.", who: 'Steve Jobs', src: 'Stanford commencement address, 2005' },
  { q: 'You could leave life right now. Let that determine what you do and say and think.', who: 'Marcus Aurelius', src: 'Meditations, Book 2' },
  { q: 'How we spend our days is, of course, how we spend our lives.', who: 'Annie Dillard', src: 'The Writing Life, 1989' },
  { q: 'A man who dares to waste one hour of time has not discovered the value of life.', who: 'Charles Darwin', src: 'Letter to his sister Susan, 1836' },
  { q: 'We cannot change the cards we are dealt, just how we play the hand.', who: 'Randy Pausch', src: 'The Last Lecture, 2007' },
  { q: 'Lost time is never found again.', who: 'Benjamin Franklin', src: "Poor Richard's Almanack" },
  { q: 'Tell me, what is it you plan to do with your one wild and precious life?', who: 'Mary Oliver', src: 'The Summer Day, 1990' },
  { q: 'The average human lifespan is absurdly, terrifyingly, insultingly short.', who: 'Oliver Burkeman', src: 'Four Thousand Weeks, 2021' },
];

export const READ: Link[] = [
  { title: 'Your Life in Weeks', by: 'Tim Urban · Wait But Why · 5 min', url: 'https://waitbutwhy.com/2014/05/life-weeks.html' },
  { title: 'The Tail End', by: 'Tim Urban · Wait But Why · 8 min', url: 'https://waitbutwhy.com/2015/12/the-tail-end.html' },
  { title: 'Life Is Short', by: 'Paul Graham · Essay · 8 min', url: 'https://paulgraham.com/vb.html' },
  { title: 'On the Shortness of Life', by: 'Seneca · About the essay · Wikipedia', url: 'https://en.wikipedia.org/wiki/De_Brevitate_Vitae_(Seneca)' },
];

export const WATCH: Link[] = [
  { title: 'How to live before you die', by: 'Steve Jobs · Stanford, 2005 · 15 min', url: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc' },
  { title: 'Really achieving your childhood dreams', by: 'Randy Pausch · Carnegie Mellon, 2007 · 76 min', url: 'https://www.youtube.com/watch?v=ji5_MqicxSo' },
  { title: 'Inside the mind of a master procrastinator', by: 'Tim Urban · TED, 2016 · 14 min', url: 'https://www.ted.com/talks/tim_urban_inside_the_mind_of_a_master_procrastinator' },
];

export const quoteKey = (q: Quote) => `${q.who}:${q.q.slice(0, 24)}`;
/** A different quote each day, the same one all day. */
export const quoteOfTheDay = (now = new Date()) =>
  Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5) % QUOTES.length;
