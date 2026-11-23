/**
 * preload.js — the only surface the renderer has to desktop capabilities.
 * Node stays disabled in the page; only these three audited methods cross.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('amayaShell', {
  isDesktop: true,
  openControlCenter: () => ipcRenderer.invoke('open-control-center'),
  reloadControlCenter: () => ipcRenderer.invoke('reload-control-center'),
});
