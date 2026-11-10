// Expo config plugin: adds the native "Left today" Android widget (a live countdown to midnight) at build time.
// The repo uses Continuous Native Generation, so android/ is never edited by hand: this copies the widget's
// Kotlin class, layout, resources and fonts into the generated project and registers its receiver.
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const SRC = path.join(__dirname, 'android');
const RECEIVER = '.DayCountdownWidget';

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

const withFiles = config =>
  withDangerousMod(config, ['android', async c => {
    const android = c.modRequest.platformProjectRoot, project = c.modRequest.projectRoot;
    const pkg = c.android?.package;
    if (!pkg) throw new Error('day-countdown: android.package is missing in app.json');
    const scheme = Array.isArray(c.scheme) ? c.scheme[0] : c.scheme || pkg;
    const main = path.join(android, 'app', 'src', 'main');

    // The widget class, with the app's package and URL scheme filled in.
    const kt = fs.readFileSync(path.join(SRC, 'DayCountdownWidget.kt'), 'utf8')
      .replace(/__PACKAGE__/g, pkg).replace(/__SCHEME__/g, scheme);
    const javaDir = path.join(main, 'java', ...pkg.split('.'));
    fs.mkdirSync(javaDir, { recursive: true });
    fs.writeFileSync(path.join(javaDir, 'DayCountdownWidget.kt'), kt);

    // Layout, background, widget info and strings.
    copyDir(path.join(SRC, 'res'), path.join(main, 'res'));

    // Fonts: the same Doto and Inter the app uses.
    const fontDir = path.join(main, 'res', 'font');
    fs.mkdirSync(fontDir, { recursive: true });
    const font = p => require.resolve(p, { paths: [project] });
    fs.copyFileSync(font('@expo-google-fonts/doto/800ExtraBold/Doto_800ExtraBold.ttf'), path.join(fontDir, 'day_countdown_doto.ttf'));
    fs.copyFileSync(font('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'), path.join(fontDir, 'day_countdown_inter.ttf'));
    return c;
  }]);

const withReceiver = config =>
  withAndroidManifest(config, c => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.receiver = (app.receiver ?? []).filter(r => r.$['android:name'] !== RECEIVER);
    app.receiver.push({
      $: { 'android:name': RECEIVER, 'android:exported': 'false', 'android:label': '@string/day_countdown_label' },
      'intent-filter': [{
        action: [
          { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          { $: { 'android:name': 'android.intent.action.TIME_SET' } },
          { $: { 'android:name': 'android.intent.action.TIMEZONE_CHANGED' } },
        ],
      }],
      'meta-data': [{ $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/day_countdown_widget_info' } }],
    });
    return c;
  });

module.exports = config => withReceiver(withFiles(config));
