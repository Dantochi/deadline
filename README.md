# Deadline

A life calendar and deadline app for Android and iPhone. Your life is drawn as weeks; every task gets its own boxes
and a status that moves from green to amber to red as time runs out. Reserved work sessions, gentle digests and
check-ins help you actually finish.

Built with Expo SDK 58 (React Native), Expo Router and react-native-svg. This is the **core test build**: onboarding, the life
grid, tasks with reserved times, check-ins, overdue recovery, pause, local reminders and settings.
Wisdom, widgets, the countdown screen, Pro and partner updates come in later builds.

## Run it

```bash
npm install
npx expo start          # scan the QR code with a development build of the app
npm run typecheck
```

The native date picker needs a development build rather than Expo Go:
`npx eas-cli@latest build --profile development --platform android`.

## Test builds for other people

See [docs/TESTING.md](docs/TESTING.md) for Firebase App Distribution: building an installable APK on EAS and
emailing it to testers, plus the extra steps for iPhones.

## Code map

| Path | What it is |
|---|---|
| `src/app/` | Screens (Expo Router): `(tabs)/index` Life, `(tabs)/tasks` Tasks, `onboarding`, `new-task`, `settings` |
| `src/components/` | Life grid (SVG), status dots with shapes, buttons, date and time fields, icons |
| `src/lib/store.tsx` | App state saved on the phone (AsyncStorage) |
| `src/lib/time.ts` | Weeks, status colours by time left, reserved session maths |
| `src/lib/notifications.ts` | Reminders: evening-before and 15-minute nudges, check-ins, three daily digests |
| `src/theme.ts` | Colours, spacing, radii and fonts from the design prototype |

## Design notes

- Status colours are colour-blind safe and always paired with a shape (● ◆ ▲).
- Time left is shown in days; reminders say a time is "reserved for" you; missing a session is never shamed.
- The life grid is always weeks at one fixed box size; lived rows drop away.
- The big number rolls digit by digit (like a bank balance); it stays still when Reduce motion is on.
- Settings → Lock screen wallpaper saves a full-size image of the grid to Photos.
- iOS allows 64 scheduled notifications per app, so reminders are scheduled four days ahead and refreshed each time
  the app opens or anything changes.
