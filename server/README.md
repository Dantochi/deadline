# Deadline API

One route today: `POST /api/dictate`, voice dictation for the app.

1. The app records 16 kHz mono AAC (`.m4a`) and uploads it as `multipart/form-data`, field `audio`.
2. AssemblyAI transcribes it (Universal models: `universal-3-5-pro`, then `universal-2`).
3. Gemini (`gemini-2.5-flash`, temperature 0.1) removes fillers, fixes punctuation and resolves self-corrections.
4. The route returns `{ "text": "..." }`.

If `GEMINI_API_KEY` is missing or Gemini fails, the raw transcript is returned instead.

## Run it

```bash
cd server
npm install
cp .env.example .env    # then put your keys in .env (never commit it)
npm run dev             # http://0.0.0.0:8787
```

Point the app at it: create `.env.local` in the project root (git-ignored) with your computer's LAN address,
then restart Expo:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
```

Before shipping to other people, host this server somewhere public over HTTPS and add authentication and rate
limiting: as it stands, anyone who finds the URL can spend your AssemblyAI and Gemini credits.
