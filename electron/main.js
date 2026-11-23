/**
 * main.js — desktop shell for the merged AMAYA × NSpector suite.
 * Starts the unified API/server in-process, then opens the combined UI.
 */
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('AMAYA NSpector');

const PORT = process.env.PORT || 4173;
let win = null;
let amayaWin = null;
let dataDir = null;
let currentLocale = 'en';

const MENU = {
  en: {
    file:'File', sync:'Sync NSpector ledgers', open:'Open Control Center',
    data:'Open NSpector data folder', snapshot:'Open AMAYA snapshot folder',
    view:'View', help:'Help', server:'Server address', about:'About',
    hint:'Phones on this network can open:', aboutBody:'Unified device intelligence.\nNSpector ledger + AMAYA IMEI Control Center.'
  },
  bn: {
    file:'ফাইল', sync:'NSpector লেজার সমন্বয় করুন', open:'কন্ট্রোল সেন্টার খুলুন',
    data:'NSpector ডাতা ফোল্ডার খুলুন', snapshot:'AMAYA স্ন্যাপশট ফোল্ডার খুলুন',
    view:'ভিউ', help:'সাহায্য', server:'সার্ভার ঠিকানা', about:'সম্পর্কে',
    hint:'এই নেটওয়ার্কের ফোনগুলি খুলতে পারে:', aboutBody:'একীকৃত ডিভাইস বুদ্ধিমত্তা।\nNSpector লেজার + AMAYA IMEI কন্ট্রোল সেন্টার।'
  },
  zh: {
    file:'文件', sync:'同步 NSpector 台账', open:'打开控制中心',
    data:'打开 NSpector 数据文件夹', snapshot:'打开 AMAYA 快照文件夹',
    view:'视图', help:'帮助', server:'服务器地址', about:'关于',
    hint:'此网络中的设备可打开：', aboutBody:'统一设备智能。\nNSpector 台账 + AMAYA IMEI 控制中心。'
  }
};

function normalizeLocale(value) {
  const s = String(value == null ? '' : value).toLowerCase();
  if (s.indexOf('bn') === 0) return 'bn';
  if (s.indexOf('zh') === 0) return 'zh';
  if (s.indexOf('en') === 0) return 'en';
  return '';
}

function safeEvidenceHash(value) {
  return /^#\/evidence\/\d{14,15}$/.test(String(value || '')) ? String(value) : '';
}

function relayLocale(raw) {
  const next = normalizeLocale(raw);
  if (!next) return currentLocale;
  currentLocale = next;
  for (const target of [win, amayaWin]) {
    try {
      if (target && !target.isDestroyed()) target.webContents.send('suite:locale-change', next);
    } catch (e) { /* a closing window must never break locale sync */ }
  }
  if (app.isReady()) menu();
  return currentLocale;
}

// Registered at module load so the renderer can never call before the bridge exists.
ipcMain.handle('open-control-center', (_event, hash) => openControlCenter(safeEvidenceHash(hash)));
ipcMain.handle('reload-control-center', () => {
  if (amayaWin && !amayaWin.isDestroyed()) {
    amayaWin.reload();
    return true;
  }
  return openControlCenter();
});
ipcMain.handle('suite:locale-get', () => currentLocale);
ipcMain.on('suite:locale-change', (_event, locale) => relayLocale(locale));

/** Source CSVs ship inside the app; on first run copy them to userData so the
 *  user's own exports land in an editable place outside the install directory. */
function seedDataDir() {
  const dest = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dest, { recursive: true });
  const candidates = [
    path.join(__dirname, '..', 'data'),                    // dev / unpacked
    path.join(process.resourcesPath || '', 'data')         // packaged
  ];
  let copied = 0;
  for (const src of candidates) {
    try {
      if (!fs.existsSync(src)) continue;
      for (const f of fs.readdirSync(src)) {
        if (!/\.(csv|json|txt)$/i.test(f)) continue;
        const to = path.join(dest, f);
        if (!fs.existsSync(to)) { fs.copyFileSync(path.join(src, f), to); copied++; }
      }
      if (copied) break;
    } catch (e) { /* try the next candidate */ }
  }
  return { dest, copied };
}

function amayaDir() {
  const packed = path.join(process.resourcesPath || '', 'amaya');
  if (fs.existsSync(packed)) return packed;
  return path.join(__dirname, '..', 'vendor', 'amaya');
}

/**
 * The unified API server runs in-process on Electron's Node runtime.
 * better-sqlite3 is rebuilt/unpacked for the Electron ABI at package time,
 * so this works identically in development and in the packaged app.
 */
function startServer() {
  return new Promise((resolve) => {
    let ready = false;
    const done = () => { if (!ready) { ready = true; resolve(); } };
    process.env.PORT = String(PORT);
    const seeded = seedDataDir();
    dataDir = seeded.dest;
    process.env.NSPECTOR_DATA = seeded.dest;
    process.env.NSPECTOR_DB = path.join(app.getPath('userData'), 'nspector.db');
    process.env.AMAYA_DIR = amayaDir();
    try {
      require(path.join(__dirname, '..', 'server', 'server.js'));
      setTimeout(done, 2200);
    } catch (e) {
      process.stderr.write('[srv!] ' + (e && e.stack || e) + '\n');
      dialog.showErrorBox('AMAYA × NSpector could not start',
        'The data service failed to start:\n\n' + (e && e.message || e));
      setTimeout(done, 1000);
    }
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 480, minHeight: 600,
    backgroundColor: '#05070f',
    title: 'AMAYA × NSpector — Unified Device Intelligence',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false
    }
  });
  win.loadURL(`http://localhost:${PORT}`);
  win.webContents.on('did-finish-load', () => relayLocale(currentLocale));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; });
}

/** The Control Center is a first-class window, never an embedded frame.
 *  Launched through a contextBridge so the renderer keeps Node disabled. */
function openControlCenter(hash) {
  hash = safeEvidenceHash(hash);
  const base = `http://localhost:${PORT}/amaya-imei-control-center/`;
  if (amayaWin && !amayaWin.isDestroyed()) {
    if (hash && amayaWin.webContents.getURL() !== base + hash) amayaWin.loadURL(base + hash);
    if (amayaWin.isMinimized()) amayaWin.restore();
    amayaWin.focus();
    return true;
  }
  try {
    amayaWin = new BrowserWindow({
      width: 1440, height: 900, minWidth: 960, minHeight: 640,
      backgroundColor: '#05070f',
      title: 'AMAYA IMEI Control Center',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'amaya-preload.js'),
        spellcheck: false,
        partition: 'amaya-control-center'
      }
    });
    amayaWin.loadURL(base + hash);
    amayaWin.webContents.on('did-finish-load', () => relayLocale(currentLocale));
    amayaWin.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    amayaWin.on('closed', () => { amayaWin = null; });
    return true;
  } catch (e) {
    process.stderr.write('[amaya] ' + (e && e.stack || e) + '\n');
    return false;
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const m = MENU[currentLocale] || MENU.en;
  return Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: m.file, submenu: [
      { label: m.sync, accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.executeJavaScript(
          "fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(()=>location.reload())") },
      { label: m.open, accelerator: 'CmdOrCtrl+Shift+R', click: () => openControlCenter() },
      { type: 'separator' },
      { label: m.data, click: () => dataDir && shell.openPath(dataDir) },
      { label: m.snapshot, click: () => shell.openPath(process.env.AMAYA_DIR || '') },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]},
    { label: m.view, submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' }
    ]},
    { label: m.help, submenu: [
      { label: m.server, click: () => dialog.showMessageBox(win, {
        type:'info', title:'AMAYA × NSpector', message:m.hint,
        detail: `http://<this PC's LAN IP>:${PORT}` }) },
      { label: m.about, click: () => dialog.showMessageBox(win, {
        type:'info', title:'AMAYA × NSpector',
        message:'AMAYA × NSpector 1.0.0',
        detail:m.aboutBody }) }
    ]}
  ]);
}

function menu() {
  Menu.setApplicationMenu(buildMenu());
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  menu();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
