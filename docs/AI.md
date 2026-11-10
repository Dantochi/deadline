# Gemini reads spoken tasks (optional)

With **Settings → Voice → Understand with Gemini** on, the sentence someone says or types for a new task is
also sent to Gemini through **Firebase AI Logic**. The on-phone parser (`src/lib/parse.ts`) still fills the form
instantly. Gemini's answer replaces that reading when it arrives, which usually takes under two seconds. If
Gemini fails, is slow (more than 6 s) or is offline, the phone's reading stays. The code is in `src/lib/ai.ts`.

## Turn it on in Firebase (once)
1. Go to Firebase console → project **deadline-c21d9** → **AI Logic** (Build menu) → **Get started**.
2. Choose the **Gemini Developer API**. It works on the free Spark plan; Firebase creates the key and keeps it
   on Google's side, so no key ships in the app.
3. Check that the model in `src/lib/ai.ts` (`GEMINI_MODEL`, now `gemini-3.5-flash-lite`) is still offered; Google retires older ones (2.5 Flash-Lite went in late 2026). AI Logic lists the current models.
   Prefer a Flash-Lite model, because it is fast and cheap.
4. `apiKey` and `appId` in `src/lib/firebase.ts` come from the project's **Web app** (Project settings → Your
   apps); they are filled in. The JavaScript Firebase library needs a Web app's ID, not the Android app's.
5. Before a public release, turn on **App Check** (Play Integrity) for AI Logic, so that only your app can use
   the quota.

## Privacy
- The policy (`site/privacy.html`) and the Play Data safety answers (`docs/PLAY-STORE.md`) already describe
  this feature. Run `firebase deploy --only hosting` to publish the policy page.
- On the free tier, Google may use the sentences that are sent to improve its products. The policy says so.
  Moving to the paid tier (Blaze) removes that.
