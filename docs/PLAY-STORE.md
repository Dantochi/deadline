# Publishing Deadline on Google Play

Apps from the Play Store update themselves, so this replaces Firebase App Distribution for most testers.
Steps marked **once** are only needed the first time.

## 1. Developer account (once)
1. Go to <https://play.google.com/console/signup>. Pay the one-time registration fee ($25) and verify your
   identity. Verification can take a few days.
2. **Personal accounts made after November 2023 must run a closed test before going public:** at least 12
   testers opted in for 14 days in a row. Organisation accounts are exempt but need a D-U-N-S number.

## 2. Public pages Play asks for (once)
The pages are in `site/` and are hosted free on Firebase Hosting:

1. Replace every `REPLACE_WITH_SUPPORT_EMAIL` in `site/*.html` with the support email you want public.
2. Deploy:
   ```powershell
   npx firebase-tools@latest login
   npm run deploy:site
   ```
3. Your links:
   - Privacy policy: `https://deadline-c21d9.web.app/privacy`
   - Account deletion: `https://deadline-c21d9.web.app/delete-account`

`npm run deploy:rules` publishes `firestore.rules` from the repo, so you don't need to paste them into the console.

## 3. Create the app in Play Console (once)
1. **Create app:** name **Deadline**, type App, Free (in-app subscriptions can be added later), accept the declarations.
2. **Dashboard → Set up your app.** Complete each item:
   - **Privacy policy:** the link above.
   - **App access:** "All functionality is available without special access." The partner feature lets
     anyone create an account, so reviewers don't need a login.
   - **Ads:** No ads.
   - **Content rating:** fill in the questionnaire (Productivity, no violence or user-generated public content). Expect *Everyone*.
   - **Target audience:** 13+ (avoid "children" so Families policy doesn't apply).
   - **Data safety:** answers below.
   - **Account deletion:** the delete-account link above.
   - **Government app / Financial features / Health:** No.
3. **Store listing:**
   - Short description, e.g. *"Your life in weeks, and a clock for every goal."*
   - Full description.
   - App icon: 512×512 PNG.
   - Feature graphic: 1024×500.
   - At least 2 phone screenshots. Take them on your phone; the wallpaper preview makes a good one.

## 4. First upload (once, by hand)
```powershell
npm run build:android:play        # builds an .aab (Play's format) on EAS
```
Download the `.aab` from the expo.dev build page. In Play Console go to **Testing → Internal testing →
Create new release**, upload it, then save and roll out. Add testers under the **Testers** tab, using an email
list or a Google Group. They install it from the opt-in link and get every later update automatically.

## 5. Automatic uploads after that (once)
1. Google Cloud console for the project → **IAM & Admin → Service accounts → Create**, e.g.
   `play-upload`. Then **Keys → Add key → JSON** and download it.
2. Play Console → **Users and permissions → Invite new user** → the service account's email. Grant it
   **Release apps to testing tracks** (and **Release to production** later).
3. Save the JSON as `secrets/google-play-service-account.json` in this folder. It is git-ignored, so it never
   reaches GitHub.

From then on, each update is:
```powershell
npm run release:android:play      # build on EAS, then upload to the Internal testing track automatically
```
`eas.json` sends uploads to the **internal** track as a **draft**: Google only accepts drafts until the app
has been reviewed once. After the first review, change `"releaseStatus"` to `"completed"` so updates roll out
without a manual click.

## 6. Closed test → production
1. **Testing → Closed testing → Create track.** Add at least 12 testers and promote a release to it.
2. Keep at least 12 of them opted in for 14 days, and ask them to really use it (Google checks engagement).
3. **Dashboard → Apply for production**, answer the questions about your test, and wait for review.

## Data safety answers (current version)
| Question | Answer |
|---|---|
| Does the app collect or share user data? | **Yes** (only when the partner feature is used) |
| Is data encrypted in transit? | Yes (Firebase uses HTTPS) |
| Can users request deletion? | Yes, in app and via the delete-account page |
| **Personal info → Email address** | Collected, not shared. Purpose: Account management. Required for the partner feature only |
| **Personal info → Name** (display name) and **User IDs** (username) | Collected; **shared** with the one partner the user chooses. Purpose: App functionality, Account management |
| **App activity → Other user-generated content** (weekly summary, optional task titles) | Collected; shared with the chosen partner. Purpose: App functionality |
| Photos, location, contacts, health, financial info | Not collected. Photos are saved only, never read |
| Data processed only on device (tasks, notes, birth date) | Not "collected" under Play's definition, since it never leaves the phone |

Update this table and `site/privacy.html` before shipping AI features or analytics.
