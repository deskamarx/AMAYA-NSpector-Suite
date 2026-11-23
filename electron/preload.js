/**
 * preload.js — the only surface the renderer has to desktop capabilities.
 * Node stays disabled in the page; only audited methods cross via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('amayaShell', {
  isDesktop: true,
  openControlCenter: () => ipcRenderer.invoke('open-control-center'),
  reloadControlCenter: () => ipcRenderer.invoke('reload-control-center'),
});

// Locale is synchronised with the separately-partitioned Control Center
// through the main process; the renderer never sees ipcRenderer itself.
contextBridge.exposeInMainWorld('amayaShellLocale', {
  set: locale => ipcRenderer.send('suite:locale-change', locale),
  onChange: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, locale) => callback(locale);
    ipcRenderer.on('suite:locale-change', listener);
    return () => ipcRenderer.removeListener('suite:locale-change', listener);
  },
  get: () => ipcRenderer.invoke('suite:locale-get'),
});
