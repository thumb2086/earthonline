const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  updatePresence: (data) => ipcRenderer.send('update-presence', data)
});
