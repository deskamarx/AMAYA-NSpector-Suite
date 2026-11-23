/**
 * build.js — assemble a self-contained Windows build from the Electron runtime
 * that already sits next to this project.
 *
 * Layout produced:
 *   dist/AMAYA-NSpector/
 *     AMAYA-NSpector.exe
 *     *.dll, *.pak, locales/, ...
 *     resources/
 *       app.asar
 *       app.asar.unpacked/node_modules/better-sqlite3/...
 *       data/            NSpector source CSVs
 *       amaya/           the IMEI Control Center snapshot
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INSTALL = path.resolve(ROOT, '..');          // extracted NSpector runtime
const DIST = path.join(ROOT, 'dist', 'AMAYA-NSpector');
const RES = path.join(DIST, 'resources');

function rm(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mk(p) { fs.mkdirSync(p, { recursive: true }); }
function copy(src, dest) { fs.cpSync(src, dest, { recursive: true }); }

function copyRuntime() {
  const runtimeFiles = fs.readdirSync(INSTALL, { withFileTypes: true });
  let exe = 0;
  for (const e of runtimeFiles) {
    const src = path.join(INSTALL, e.name);
    if (e.isDirectory()) {
      if (['locales', 'resources'].includes(e.name)) continue;
      if (e.name === 'dist' || e.name === 'AMAYA-NSpector-Suite') continue;
      continue;
    }
    if (/\.exe$/i.test(e.name)) {
      // one renamed launcher; keep elevate.exe from resources instead
      fs.copyFileSync(src, path.join(DIST, 'AMAYA-NSpector.exe'));
      exe++;
      continue;
    }
    if (/\.(dll|pak|dat|bin|html|txt)$/i.test(e.name) && !/^app-update/i.test(e.name)) {
      fs.copyFileSync(src, path.join(DIST, e.name));
    }
  }
  const locales = path.join(INSTALL, 'locales');
  if (fs.existsSync(locales)) copy(locales, path.join(DIST, 'locales'));
  const elevate = path.join(INSTALL, 'resources', 'elevate.exe');
  if (fs.existsSync(elevate)) fs.copyFileSync(elevate, path.join(RES, 'elevate.exe'));
  if (!exe) throw new Error('Could not find the Electron executable in ' + INSTALL);
}

function stageApp() {
  const stage = path.join(DIST, '.stage');
  rm(stage);
  mk(stage);
  for (const name of ['package.json', 'electron', 'server', 'web']) {
    copy(path.join(ROOT, name), path.join(stage, name));
  }
  copy(path.join(ROOT, 'node_modules'), path.join(stage, 'node_modules'));

  const asar = path.join(RES, 'app.asar');
  const cmd = `npx --yes @electron/asar pack "${stage}" "${asar}" --unpack-dir "node_modules/better-sqlite3"`;
  execSync(cmd, { stdio: 'inherit', cwd: ROOT });
  rm(stage);
  return asar;
}

function main() {
  console.log('Building AMAYA × NSpector…');
  console.log('  runtime:', INSTALL);
  console.log('  output: ', DIST);
  rm(DIST);
  mk(DIST);
  mk(RES);

  copyRuntime();
  copy(path.join(ROOT, 'data'), path.join(RES, 'data'));
  copy(path.join(ROOT, 'vendor', 'amaya'), path.join(RES, 'amaya'));
  const asar = stageApp();

  fs.writeFileSync(path.join(DIST, 'BUILD.txt'),
    'AMAYA × NSpector — unified device intelligence suite\n' +
    'Built ' + new Date().toISOString() + '\n\n' +
    'Launch: AMAYA-NSpector.exe\n' +
    'The app runs entirely offline on http://localhost:4173.\n' +
    'NSpector data is copied to %APPDATA%\\AMAYA NSpector\\data on first run.\n',
    'utf8');
  const readme = path.join(ROOT, 'README.md');
  if (fs.existsSync(readme)) fs.copyFileSync(readme, path.join(DIST, 'README.md'));

  const size = dirSize(DIST);
  console.log('  app.asar:', (fs.statSync(asar).size / 1048576).toFixed(1), 'MB');
  console.log('  total:   ', (size / 1048576).toFixed(1), 'MB');
  console.log('Done. Launch ' + path.join(DIST, 'AMAYA-NSpector.exe'));
}

function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

main();
