/** check.js — fast static sanity checks before packing. */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const files = [
  'electron/main.js',
  'server/amaya.js', 'server/server.js', 'server/db.js', 'server/core.js',
  'server/reason.js', 'server/sync.js',
  'web/nspector.js', 'web/shell.js', 'scripts/build.js'
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
  'vendor/amaya/index.html', 'vendor/amaya/data/assets.json',
  'vendor/amaya/data/events.json', 'vendor/amaya/data/meta.json',
  'node_modules/better-sqlite3/build/Release/better_sqlite3.node'
];
for (const f of must) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { bad++; console.error('  MISSING ' + f); }
  else console.log('  ok  ' + f + ' (' + (fs.statSync(p).size / 1024).toFixed(0) + ' KB)');
}
process.exit(bad ? 1 : 0);
