// The Deadline API server. Today it serves one route: POST /api/dictate (voice dictation). Keys come from .env.
import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import { MulterError } from 'multer';
import { dictate } from './dictate.js';

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => { res.json({ ok: true }); });
app.use(dictate);

// Errors as JSON with a short, safe message (no stack traces or keys in responses).
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'The recording is too long.' : 'Upload a single audio file in the "audio" field.' });
  const status = err.status ?? 500;
  if (status >= 500) console.error('[server]', err);
  res.status(status).json({ error: status >= 500 && !err.status ? 'Something went wrong.' : err.message });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, '0.0.0.0', () => console.log(`Deadline API on http://0.0.0.0:${port}`));
