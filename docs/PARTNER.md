# Accountability partner: Firebase setup

The partner feature uses the free Firebase plan (Spark): Authentication for email accounts and Firestore for
usernames, partnerships and the weekly summary. Nothing else leaves the phone. Do these once in the
[Firebase console](https://console.firebase.google.com), project **deadline-c21d9**.

1. **Email sign-in:** Build → **Authentication** → Get started → Sign-in method → **Email/Password** → Enable → Save.
2. **Database:** Build → **Firestore Database** → Create database → pick a location near your testers →
   start in **production mode**.
3. **Rules:** in Firestore, open the **Rules** tab, replace everything with the contents of
   [`firestore.rules`](../firestore.rules), then **Publish**.
4. **Web app config:** Project settings (gear) → General → Your apps → **Add app** → Web (`</>`).
   Nickname `Deadline app`, leave Hosting unticked, Register. From the config it shows, copy `apiKey` and
   `appId` into [`src/lib/firebase.ts`](../src/lib/firebase.ts). These identify the project and are safe in the repo.
5. **Install link for invites:** App Distribution → **Invite links** → Create → group `testers`. Paste the link into
   `INSTALL_LINK` in `src/lib/firebase.ts`. People who open it enter their email to join the test.
6. Rebuild: `npm run build:android:preview`, then `npm run distribute:android`.

## How it works for people

- Signing in is only asked for when someone opens **Settings → Accountability partner**.
- Both people make an account with their own email and pick a username and name. Emails are never shown to anyone.
- Add a partner by username, or invite someone new by email (opens your own email app) or the share sheet.
  The invite has the install link and your username.
- The person asked accepts in the same screen (it also shows at the top of their Tasks tab).
- Each phone publishes a small weekly summary (sessions kept and missed, finished tasks, status counts and, if
  allowed, task titles). Only the partner can read it. Notes are never shared.
- Sunday at 18:00 both phones get a local "Sunday check-in" reminder.
- Settings → Accountability partner also has Sign out and Delete account (removes the account and all shared data).

## Backup & sync (same account)

Settings → **Backup & sync** keeps an end-to-end encrypted copy of tasks, notes, important dates and settings in
Firestore under `accounts/{uid}`, and keeps signed-in phones in step. Off until switched on.

- The data key is random, made on the first phone and kept in its secure storage (Keychain / Keystore). It is never
  derived from the password, so a password reset loses nothing.
- A 24-word recovery phrase unlocks the key on a new phone. A phone that already syncs can also approve a new one;
  both show the same 6-digit code to compare.
- The rules in [`firestore.rules`](../firestore.rules) allow only the owner to read or write `accounts/{uid}`, and
  only encrypted records. Deploy them after any change: `npm run deploy:rules`.
- Deleting the account (Settings → Accountability partner → Delete account) removes the backup too.
- Code: `src/lib/e2ee.ts` (encryption), `src/lib/sync.ts` (what changed and how changes merge), `src/lib/cloud.tsx`
  (Firestore and the screens' actions), `src/app/backup.tsx` (the screen), `src/components/PairPrompt.tsx`.
