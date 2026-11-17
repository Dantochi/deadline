// Sends a dictation recording to our API (POST /api/dictate) and returns the cleaned text. The server does the
// speech-to-text (AssemblyAI) and the tidy-up (Gemini); no keys live in the app.

/** Where the API runs, from EXPO_PUBLIC_API_URL (e.g. http://192.168.1.20:8787 in development). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
export const dictationAvailable = !!API_URL;

const TIMEOUT = 60_000;

export class DictationError extends Error {}

/** Uploads the recorded file (multipart/form-data, field "audio") and returns the polished text ('' for silence). */
export async function dictate(uri: string): Promise<string> {
  if (!API_URL) throw new DictationError('Dictation isn’t set up in this build.');
  const body = new FormData();
  // React Native's FormData takes a file as { uri, name, type }.
  body.append('audio', { uri, name: 'dictation.m4a', type: 'audio/mp4' } as unknown as Blob);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    // No Content-Type header: fetch sets multipart/form-data with the right boundary itself.
    const res = await fetch(`${API_URL}/api/dictate`, { method: 'POST', body, signal: ctrl.signal, headers: { Accept: 'application/json' } });
    const json = (await res.json().catch(() => null)) as { text?: unknown; error?: unknown } | null;
    if (!res.ok) throw new DictationError(typeof json?.error === 'string' ? json.error : `The server answered ${res.status}.`);
    return typeof json?.text === 'string' ? json.text.trim() : '';
  } catch (e) {
    if (e instanceof DictationError) throw e;
    throw new DictationError((e as Error)?.name === 'AbortError' ? 'That took too long. Check your connection and try again.' : 'Couldn’t reach the dictation server. Check your connection.');
  } finally {
    clearTimeout(timer);
  }
}

/** Puts dictated text into existing text at the cursor (or at the end), with sensible spacing either side. */
export function insertDictation(text: string, add: string, at?: { start: number; end: number }): { value: string; cursor: number } {
  const start = Math.max(0, Math.min(at?.start ?? text.length, text.length)), end = Math.max(start, Math.min(at?.end ?? start, text.length));
  const before = text.slice(0, start), after = text.slice(end);
  const lead = before && !/\s$/.test(before) ? ' ' : '';
  const trail = after && !/^[\s.,;:!?)]/.test(after) ? ' ' : '';
  const value = before + lead + add + trail + after;
  return { value, cursor: (before + lead + add).length };
}
