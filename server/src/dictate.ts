// POST /api/dictate: voice dictation in two steps. The phone uploads a short recording (multipart/form-data, field
// "audio"); AssemblyAI turns it into a raw transcript, then Gemini tidies it (fillers, punctuation, self-corrections)
// without changing the person's words. Returns { text }.
import { GoogleGenAI } from '@google/genai';
import { AssemblyAI } from 'assemblyai';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';

const SYSTEM = "You are a voice dictation editor. Clean up the raw speech transcript. Remove filler words (um, uh, like), fix punctuation and capitalization, and resolve mid-sentence self-corrections (e.g., 'meet at 2 no wait 3pm' -> 'meet at 3pm'). Keep the user's exact tone and wording. Output ONLY the final cleaned text with no extra commentary.";
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BYTES = 15 * 1024 * 1024; // ~15 min of 16 kHz mono AAC; anything bigger is not a dictation

// Kept in memory only: nothing is written to disk on the server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^audio\/|^video\/mp4$|^application\/octet-stream$/.test(file.mimetype)),
});

// AssemblyAI's Universal models, best first. (The single `speech_model: 'universal'` parameter is deprecated: the API
// rejects it and asks for `speech_models`, checked 17 Nov 2026.) Override with ASSEMBLYAI_SPEECH_MODELS=a,b.
const SPEECH_MODELS = (process.env.ASSEMBLYAI_SPEECH_MODELS || 'universal-3-5-pro,universal-2').split(',').map(m => m.trim()).filter(Boolean);

let assembly: AssemblyAI | null = null, gemini: GoogleGenAI | null = null;
const speechClient = () => {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw Object.assign(new Error('Dictation is not set up on the server (ASSEMBLYAI_API_KEY is missing).'), { status: 503 });
  return (assembly ??= new AssemblyAI({ apiKey: key }));
};
/** Gemini is the polish step: without a key, dictation still works and returns the raw transcript. */
const textClient = () => {
  const key = process.env.GEMINI_API_KEY;
  return key ? (gemini ??= new GoogleGenAI({ apiKey: key })) : null;
};

/** Step 1: speech to text with AssemblyAI's Universal models. */
async function transcribe(audio: Buffer): Promise<string> {
  const t = await speechClient().transcripts.transcribe({ audio, speech_models: SPEECH_MODELS });
  if (t.status === 'error') throw Object.assign(new Error(`Transcription failed: ${t.error ?? 'unknown error'}`), { status: 502 });
  return (t.text ?? '').trim();
}

/** Step 2: tidy the transcript with Gemini. If Gemini fails, the raw transcript is still better than nothing. */
async function polish(raw: string): Promise<string> {
  const ai = textClient();
  if (!ai) { console.warn('[dictate] GEMINI_API_KEY is missing: returning the raw transcript.'); return raw; }
  try {
    const res = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: raw,
      config: { systemInstruction: SYSTEM, temperature: 0.1 },
    });
    const text = (res.text ?? '').trim();
    return text || raw;
  } catch (e) {
    console.warn('[dictate] Gemini cleanup failed, returning the raw transcript:', (e as Error).message);
    return raw;
  }
}

export const dictate = Router();

dictate.post('/api/dictate', upload.single('audio'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file?.buffer?.length) return res.status(400).json({ error: 'Send the recording as multipart/form-data in a field named "audio".' });
    const raw = await transcribe(req.file.buffer);
    if (!raw) return res.json({ text: '' }); // silence: nothing to add
    res.json({ text: await polish(raw) });
  } catch (e) {
    next(e);
  }
});
