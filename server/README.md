# Deadline API

One route today: `POST /api/dictate`, voice dictation for the app.

1. The app records 16 kHz mono AAC (`.m4a`) and uploads it as `multipart/form-data`, field `audio`.
2. AssemblyAI transcribes it (Universal models: `universal-3-5-pro`, then `universal-2`; filler words left out).
3. AssemblyAI's LLM Gateway tidies the transcript: punctuation, capitals, self-corrections ("meet at 2 no wait
   3pm" → "Meet at 3pm"). The transcript is sent as text to edit, never as instructions, and an answer that strays
   from what was said is thrown away.
4. The route returns `{ "text": "..." }`. If the clean-up fails, the raw transcript is returned instead.

Everything runs on one key, `ASSEMBLYAI_API_KEY`.

### The clean-up model
The default is `qwen3.5-4b-32k-fast`: on 17 Nov 2026 it was the only LLM Gateway model this account could use
(the others answered "Your account does not have access to this LLM Gateway model", which usually means the account
needs a paid plan). It handles fillers, punctuation and simple corrections well, but can miss a correction in a
longer sentence. Once more models are open to the account, set `ASSEMBLYAI_LLM_MODEL` in `.env` to a stronger one,
for example `claude-haiku-5-5` or `gemini-2.5-flash`.

## Run it

```bash
cd server
npm install
cp .env.example .env    # then put your AssemblyAI key in .env (never commit it)
npm run dev             # http://0.0.0.0:8787
```

Point the app at it: create `.env.local` in the project root (git-ignored) with your computer's LAN address,
then restart Expo:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
```

Before shipping to other people, host this server somewhere public over HTTPS and add authentication and rate
limiting: as it stands, anyone who finds the URL can spend your AssemblyAI credits.
