# Testing Deadline with Firebase App Distribution

This gets test builds onto Android phones (and iPhones, with an Apple Developer account) without
putting the app on Google Play or the App Store. Testers get an email, tap a link and install.

Commands that are not run in this repo yet are marked as such; check the Firebase and Expo
dashboards for the current wording of buttons, since they change.

## One-time setup (about 20 minutes)

### 1. Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** → name it `Deadline`. Google Analytics is optional.
2. In the project, click **Add app → Android**. Package name: **`com.dantochi.deadline`**. You can skip downloading
   `google-services.json`; App Distribution does not need it.
3. Open **Project settings → General → Your apps** and copy the **App ID** (looks like `1:1234567890:android:abc123`).
4. Open **Release & Monitor → App Distribution → Get started → Testers & Groups**. Create a group with the alias
   **`testers`** and add your testers' email addresses (Gmail or any Google account works best).

### 2. Expo project (you already have an Expo account)
```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init      # links this repo to an Expo project and writes the projectId into app.json
git commit -am "Link EAS project" && git push
```

### 3. First Android test build
```bash
npm run build:android:preview   # builds an installable .apk in Expo's cloud (about 10-20 minutes)
```
The first run asks to create an Android signing key: answer **yes** and let Expo store it.

### 4. Send it to testers
```bash
npx firebase-tools@latest login
npm run distribute:android   # the Android App ID is built into scripts/distribute.sh
```
Every tester in the `testers` group gets an email. On their phone they:
1. Open the email and tap **Get started**, then accept the invite.
2. Download the app (Firebase suggests installing its **App Tester** app, which also shows future updates).
3. Allow **Install unknown apps** for the browser or App Tester when Android asks, then install.

## Each new test build
```bash
npm run build:android:preview
npm run distribute:android
```
Or, after adding the GitHub secrets below, press a button: **GitHub → Actions → Test build → Run workflow**.

### GitHub secrets for the button
In the repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret | Where to get it |
|---|---|
| `EXPO_TOKEN` | expo.dev → Account settings → Access tokens → Create |
| `FIREBASE_SERVICE_ACCOUNT` | Google Cloud console for the Firebase project → IAM & Admin → Service accounts → Create, give it the **Firebase App Distribution Admin** role → Keys → Add key → JSON. Paste the whole file. |
| `FIREBASE_ANDROID_APP_ID` | Firebase → Project settings → Your apps |
| `FIREBASE_IOS_APP_ID` | Same place, once you add the iOS app |

## iPhone testers

Firebase can distribute iPhone builds too, but Apple only lets a test build install on devices that are registered
in your Apple Developer account. That needs:

1. **Apple Developer Program** membership (paid yearly).
2. In Firebase: **Add app → iOS**, bundle ID **`com.dantochi.deadline`**. Copy its App ID.
3. Invite iPhone testers in App Distribution. When they accept on their iPhone, Firebase asks them to register the
   device and collects its ID (UDID).
4. In App Distribution, export the tester device list and add those devices to your Apple account
   (`npx eas-cli@latest device:create` can also register devices).
5. Build an ad hoc iPhone build that includes those devices: `npm run build:ios:preview`. EAS asks to pick the
   registered devices and handles certificates.
6. Send it: `FIREBASE_IOS_APP_ID=... npm run distribute:ios`.

New iPhones need registering and a rebuild before they can install. For large iPhone groups, Apple's TestFlight is
simpler, and the same Expo build setup works for it.

## What testers should try during a week

- Create two or three real tasks with reserved times.
- Leave notifications on and note whether the digest times and "15 minutes before" nudges feel right.
- Answer the "Did your session happen?" check-ins, including saying **Not today** at least once.
- Tell you what made them open the app, or not.
