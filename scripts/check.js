/** check.js — fast static sanity checks before packing. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const files = [
  'electron/main.js', 'electron/preload.js', 'electron/amaya-preload.js',
  'server/amaya.js', 'server/server.js', 'server/db.js', 'server/core.js',
  'server/reason.js', 'server/sync.js',
  'web/i18n.js', 'web/nspector.js', 'web/shell.js', 'web/android-native.js',
  'vendor/amaya/assets/suite-locale-bridge.js', 'scripts/build.js',
  'scripts/stage-android.js', 'scripts/android-gradle.js',
  'scripts/collect-android.js', 'scripts/curate-themes.js'
];
let bad = 0;
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
    console.log('  ok  ' + f);
  } catch (e) {
    bad++;
    console.error('  ERR ' + f + '\n' + (e.stderr || e.message));
  }
}

const must = [
  'web/index.html', 'web/shell.css', 'web/nspector.css', 'web/fonts/fonts.css',
  'capacitor.config.json',
  'vendor/amaya/index.html', 'vendor/amaya/assets/suite-locale-bridge.js',
  'vendor/amaya/assets/suite-ui-polish.css',
  'vendor/amaya/data/assets.json',
  'vendor/amaya/data/events.json', 'vendor/amaya/data/meta.json',
  'node_modules/better-sqlite3/build/Release/better_sqlite3.node'
];
for (const f of must) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { bad++; console.error('  MISSING ' + f); }
  else console.log('  ok  ' + f + ' (' + (fs.statSync(p).size / 1024).toFixed(0) + ' KB)');
}
const shellSource = fs.readFileSync(path.join(ROOT, 'web/shell.js'), 'utf8');
const nativeRoute = "window.location.assign(AMA_NATIVE_PATH + hash);";
if (!shellSource.includes("const AMA_NATIVE_PATH = AMA_PATH + 'index.html';") || !shellSource.includes(nativeRoute)) {
  bad++;
  console.error('  ERR native Control Center route must target the bundled index.html');
} else {
  console.log('  ok  native Control Center route targets bundled index.html');
}
process.exit(bad ? 1 : 0);
