const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');

const clientId = '1512263151671050280';
DiscordRPC.register(clientId);

let mainWindow;
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let rpcReady = false;

async function setActivity(data) {
  if (!rpcReady) return;
  try {
    await rpc.setActivity({
      details: data.details || 'Surviving...',
      state: data.state || 'In the wilderness',
      startTimestamp: data.startTimestamp || Date.now(),
      largeImageKey: 'earth_icon',
      largeImageText: 'Earth Online',
      smallImageKey: 'user_icon',
      smallImageText: data.username || 'Survivor',
      instance: false,
    });
  } catch (e) {
    console.error('Failed to set RPC', e);
  }
}

rpc.on('ready', () => {
  rpcReady = true;
  setActivity({
    details: '尚未登入 (Not Logged In)',
    state: '停留於登入閘道口'
  });
});

rpc.login({ clientId }).catch(console.error);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    title: 'Earth Online',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  ipcMain.on('update-presence', (event, data) => {
    setActivity(data);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
