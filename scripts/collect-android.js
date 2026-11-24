/** collect-android.js — publish signed Android release artifacts to dist/Android. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'Android');
const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const AAB = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const VERSION = '1.0.0';

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const mode = (process.argv[2] || 'all').toLowerCase();
  const targets = [
    ['apk', APK, `AMAYA-NSpector-v${VERSION}-release.apk`],
    ['apk', APK, 'amaya.v1.apk'], // simple share/install alias
    ['aab', AAB, `AMAYA-NSpector-v${VERSION}-release.aab`]
  ].filter(([kind]) => mode === 'all' || mode === kind);
  if (!targets.length) throw new Error('Unknown artifact mode: ' + mode);

  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const [, src, name] of targets) {
    if (!fs.existsSync(src)) throw new Error('Missing build artifact: ' + src);
    const dest = path.join(OUT, name);
    fs.copyFileSync(src, dest);
    results.push({ name, bytes: fs.statSync(dest).size, sha256: sha256(dest) });
    console.log(`  ${name} — ${(fs.statSync(dest).size / 1048576).toFixed(1)} MB`);
  }

  fs.writeFileSync(path.join(OUT, 'SHA256SUMS.txt'),
    results.map(r => `${r.sha256}  ${r.name}`).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT, 'BUILD.txt'), [
    'AMAYA NSpector — Android release',
    `Version: ${VERSION} (code 1)`,
    'Package: com.amaya.nspector.suite',
    `Build: signed release (${[...new Set(targets.map(([kind]) => kind.toUpperCase()))].join(' + ')})`,
    'API: https://amaya-nspector-docker.onrender.com',
    'Built: ' + new Date().toISOString(),
    '',
    'The full shell and AMAYA IMEI Control Center are bundled locally.',
    'Live NSpector ledgers and sync use the hosted API; an internet connection is required for live data.',
    '',
    ...results.map(r => `${r.name}\n  ${r.bytes} bytes\n  sha256 ${r.sha256}`)
  ].join('\n') + '\n', 'utf8');
  console.log('Android artifacts ready: ' + OUT);
}

main();
