const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  updatePresence: (data) => ipcRenderer.send('update-presence', data),
  setProgress: (value) => ipcRenderer.send('set-progress', value),
  getVersion: () => ipcRenderer.invoke('app-version'),
  getPlatform: () => ipcRenderer.invoke('app-platform'),
});
