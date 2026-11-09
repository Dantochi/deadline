# Gemini reads spoken tasks (optional)

With **Settings → Voice → Understand with Gemini** on, the sentence someone says or types for a new task is
also sent to Gemini through **Firebase AI Logic**. The on-phone parser (`src/lib/parse.ts`) still fills the form
instantly. Gemini's answer replaces that reading when it arrives, which usually takes under two seconds. If
Gemini fails, is slow (more than 6 s) or is offline, the phone's reading stays. The code is in `src/lib/ai.ts`.

## Turn it on in Firebase (once)
1. Go to Firebase console → project **deadline-c21d9** → **AI Logic** (Build menu) → **Get started**.
2. Choose the **Gemini Developer API**. It works on the free Spark plan; Firebase creates the key and keeps it
   on Google's side, so no key ships in the app.
3. Check that the model in `src/lib/ai.ts` (`GEMINI_MODEL`) is still offered. AI Logic lists the current models.
   Prefer a Flash-Lite model, because it is fast and cheap.
4. Make sure `apiKey` and `appId` are filled in `src/lib/firebase.ts`. The switch in Settings stays greyed out
   until they are.
5. Before a public release, turn on **App Check** (Play Integrity) for AI Logic, so that only your app can use
   the quota.

## Privacy
- The policy (`site/privacy.html`) and the Play Data safety answers (`docs/PLAY-STORE.md`) already describe
  this feature. Run `firebase deploy --only hosting` to publish the policy page.
- On the free tier, Google may use the sentences that are sent to improve its products. The policy says so.
  Moving to the paid tier (Blaze) removes that.
