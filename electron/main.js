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

// Registered at module load so the renderer can never call before the bridge exists.
ipcMain.handle('open-control-center', () => openControlCenter());
ipcMain.handle('reload-control-center', () => {
  if (amayaWin && !amayaWin.isDestroyed()) {
    amayaWin.reload();
    return true;
  }
  return openControlCenter();
});

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
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; });
}

/** The Control Center is a first-class window, never an embedded frame.
 *  Launched through a contextBridge so the renderer keeps Node disabled. */
function openControlCenter() {
  if (amayaWin && !amayaWin.isDestroyed()) {
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
        spellcheck: false,
        partition: 'amaya-control-center'
      }
    });
    amayaWin.loadURL(`http://localhost:${PORT}/amaya-imei-control-center/`);
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

function menu() {
  const isMac = process.platform === 'darwin';
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'Sync NSpector ledgers', accelerator: 'CmdOrCtrl+R', click: () => win && win.webContents.executeJavaScript(
          "fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(()=>location.reload())") },
      { label: 'Open Control Center', accelerator: 'CmdOrCtrl+Shift+R', click: () => openControlCenter() },
      { type: 'separator' },
      { label: 'Open NSpector data folder', click: () => dataDir && shell.openPath(dataDir) },
      { label: 'Open AMAYA snapshot folder', click: () => shell.openPath(process.env.AMAYA_DIR || '') },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]},
    { label: 'View', submenu: [
      { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
      { role: 'togglefullscreen' }
    ]},
    { label: 'Help', submenu: [
      { label: 'Server address', click: () => dialog.showMessageBox(win, {
        type:'info', title:'AMAYA × NSpector', message:'Phones on this network can open:',
        detail: `http://<this PC's LAN IP>:${PORT}` }) },
      { label: 'About', click: () => dialog.showMessageBox(win, {
        type:'info', title:'AMAYA × NSpector',
        message:'AMAYA × NSpector 1.0.0',
        detail:'Unified device intelligence.\nNSpector ledger + AMAYA IMEI Control Center.' }) }
    ]}
  ]));
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  menu();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
