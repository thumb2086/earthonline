const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  updatePresence: (data) => ipcRenderer.send('update-presence', data),
  setProgress: (progress) => ipcRenderer.send('set-progress', progress),
  toggleFrameless: () => ipcRenderer.invoke('toggle-frameless'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
});
