/** collect-android.js — publish the unified enterprise Android release to dist/Android. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'Android');
const APK = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const AAB = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const MAPPING = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'mapping', 'release', 'mapping.txt');
const VERSION = '2.0.1';
const CODE = 3;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  const mode = (process.argv[2] || 'all').toLowerCase();
  const targets = [
    ['apk', APK, `AMAYA-NSpector-v${VERSION}-enterprise.apk`],
    ['aab', AAB, `AMAYA-NSpector-v${VERSION}-release.aab`]
  ].filter(([kind]) => mode === 'all' || mode === kind);

  // The release keeps the Capacitor bridge unshrunk, so an R8 mapping is not
  // produced. Copy it only when present rather than failing the build.
  if ((mode === 'all' || mode === 'mapping') && fs.existsSync(MAPPING)) {
    targets.push(['mapping', MAPPING, `mapping-v${VERSION}.txt`]);
  }
  if (!targets.length) throw new Error('Unknown or unavailable artifact mode: ' + mode);

  // A version bump must not leave previous-release installers in the output.
  fs.mkdirSync(OUT, { recursive: true });
  for (const file of fs.readdirSync(OUT)) {
    if (/\.(apk|aab)$/i.test(file) || /^mapping-.*\.txt$/i.test(file)) {
      fs.rmSync(path.join(OUT, file), { force: true });
    }
  }

  const results = [];
  for (const [, src, name] of targets) {
    if (!fs.existsSync(src)) throw new Error('Missing build artifact: ' + src);
    const dest = path.join(OUT, name);
    fs.copyFileSync(src, dest);
    const bytes = fs.statSync(dest).size;
    results.push({ name, bytes, sha256: sha256(dest) });
    console.log(`  ${name} — ${(bytes / 1048576).toFixed(1)} MB`);
  }

  fs.writeFileSync(path.join(OUT, 'SHA256SUMS.txt'),
    results.map(r => `${r.sha256}  ${r.name}`).join('\n') + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT, 'BUILD.txt'), [
    'AMAYA NSpector — unified enterprise Android release',
    `Version: ${VERSION} (code ${CODE})`,
    'Package: com.amaya.nspector.suite',
    'Build: signed release, unshrunk Capacitor bridge, debugging disabled',
    'API: https://amaya-nspector-docker.onrender.com',
    'Built: ' + new Date().toISOString(),
    '',
    'One app contains all five suite workspaces and the complete AMAYA IMEI',
    'Control Center as a native, first-class in-app screen (never an iframe).',
    'The full snapshot is bundled locally; live ledgers need an internet connection.',
    'v2.0.0 used R8/resource shrinking and could not be verified to launch on',
    'device, so v2.0.1 restores the proven unshrunk bridge path. Signing identity',
    'and debuggable=false are unchanged.',
    '',
    ...results.map(r => `${r.name}\n  ${r.bytes} bytes\n  sha256 ${r.sha256}`)
  ].join('\n') + '\n', 'utf8');
  console.log('Android artifacts ready: ' + OUT);
}

main();
