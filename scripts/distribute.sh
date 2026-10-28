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
  # The Android App ID identifies the Firebase app (it is not a secret); override with FIREBASE_ANDROID_APP_ID.
  android) app_id="${FIREBASE_ANDROID_APP_ID:-1:134720562004:android:d60bf188e2dd9f68185ec1}"; ext=apk ;;
  ios)     app_id="${FIREBASE_IOS_APP_ID:?Set FIREBASE_IOS_APP_ID}"; ext=ipa ;;
  *) echo "Usage: $0 android|ios" >&2; exit 1 ;;
esac

echo "Finding the latest finished $platform preview build on EAS..."
info="$(npx --yes eas-cli@latest build:list --platform "$platform" --profile preview --status finished \
  --limit 1 --json --non-interactive | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const b=JSON.parse(s)[0];if(!b?.artifacts?.buildUrl){process.exit(1)}console.log([b.artifacts.buildUrl,b.appVersion,b.appBuildVersion,b.completedAt||b.updatedAt,b.gitCommitHash||""].join("|"))})')" \
  || { echo "No finished $platform preview build found. Run: npm run build:$platform:preview" >&2; exit 1; }
IFS='|' read -r url version build_no finished commit <<< "$info"
echo "Latest finished build: version $version ($build_no), finished $finished"
head="$(git rev-parse HEAD 2>/dev/null || true)"
if [ -n "$commit" ] && [ -n "$head" ] && [ "$commit" != "$head" ]; then
  echo "WARNING: that build is from commit ${commit:0:7}, but this folder is at ${head:0:7}." >&2
  echo "         If your newest build failed or is still running, check expo.dev → Builds first." >&2
fi

mkdir -p dist
file="dist/deadline-$platform.$ext"
echo "Downloading $url"
# Download with Node rather than curl: Windows curl (schannel) can drop large downloads mid-way.
node -e '
const fs = require("fs"), { Readable } = require("stream"), { pipeline } = require("stream/promises");
const [url, file] = process.argv.slice(1);
(async () => {
  for (let i = 1; i <= 4; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(file));
      console.log("Downloaded " + (fs.statSync(file).size / 1048576).toFixed(1) + " MB");
      return;
    } catch (e) {
      console.error("Download attempt " + i + " failed: " + e.message);
      if (i === 4) process.exit(1);
      await new Promise(res => setTimeout(res, 2000 * i));
    }
  }
})();
' "$url" "$file"

# Groups and notes go in files: long quoted arguments can get lost on the way through npx on Windows.
printf '%s' "$groups" > dist/groups.txt
printf '%s' "$notes" > dist/notes.txt
echo "Uploading to Firebase App Distribution (groups: $groups)..."
npx --yes firebase-tools@latest appdistribution:distribute "$file" \
  --app "$app_id" --groups-file dist/groups.txt --release-notes-file dist/notes.txt 2>&1 | tee dist/firebase.log

# The upload can succeed while sending it to nobody, so check that it was actually distributed.
if grep -q "distributed to testers/groups successfully" dist/firebase.log; then
  echo "Done. Version $version ($build_no) was sent to '$groups'. They get an email, and it shows in App Tester."
else
  echo "" >&2
  echo "Uploaded, but NOT sent to testers. Open the release link above in the Firebase console, click" >&2
  echo "Distribute and choose '$groups'. Also check the group's alias is exactly '$groups' (Testers & Groups)." >&2
  exit 1
fi
