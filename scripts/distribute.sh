#!/usr/bin/env bash
# Send the latest finished EAS "preview" build to testers with Firebase App Distribution.
#
#   FIREBASE_ANDROID_APP_ID=1:123:android:abc bash scripts/distribute.sh android
#   FIREBASE_IOS_APP_ID=1:123:ios:def        bash scripts/distribute.sh ios
#
# Optional: TESTER_GROUPS (default "testers"), RELEASE_NOTES.
# Firebase auth: run `npx firebase-tools login` once, or set GOOGLE_APPLICATION_CREDENTIALS
# to a service-account JSON file (that is what the GitHub workflow does).
set -euo pipefail

platform="${1:-android}"
groups="${TESTER_GROUPS:-testers}"
notes="${RELEASE_NOTES:-Deadline test build $(date +%Y-%m-%d). Reply to the invite email with anything that felt off.}"

case "$platform" in
  android) app_id="${FIREBASE_ANDROID_APP_ID:?Set FIREBASE_ANDROID_APP_ID}"; ext=apk ;;
  ios)     app_id="${FIREBASE_IOS_APP_ID:?Set FIREBASE_IOS_APP_ID}"; ext=ipa ;;
  *) echo "Usage: $0 android|ios" >&2; exit 1 ;;
esac

echo "Finding the latest finished $platform preview build on EAS..."
url="$(npx --yes eas-cli@latest build:list --platform "$platform" --profile preview --status finished \
  --limit 1 --json --non-interactive | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s)[0];if(!b?.artifacts?.buildUrl){process.exit(1)}console.log(b.artifacts.buildUrl)})')" \
  || { echo "No finished $platform preview build found. Run: npm run build:$platform:preview" >&2; exit 1; }

mkdir -p dist
file="dist/deadline-$platform.$ext"
echo "Downloading $url"
curl -fsSL "$url" -o "$file"

echo "Uploading to Firebase App Distribution (groups: $groups)..."
npx --yes firebase-tools@latest appdistribution:distribute "$file" \
  --app "$app_id" --groups "$groups" --release-notes "$notes"
echo "Done. Testers in '$groups' get an email with the install link."
