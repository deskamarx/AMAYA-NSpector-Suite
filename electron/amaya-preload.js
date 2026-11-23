/**
 * amaya-preload.js — locale bridge for the IMEI Control Center window.
 * The Control Center has its own storage partition, so language changes are
 * relayed through the main process instead of relying on shared localStorage.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('amayaControlLocale', {
  notify: locale => ipcRenderer.send('suite:locale-change', locale),
  onChange: callback => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, locale) => callback(locale);
    ipcRenderer.on('suite:locale-change', listener);
    return () => ipcRenderer.removeListener('suite:locale-change', listener);
  },
  get: () => ipcRenderer.invoke('suite:locale-get'),
});
