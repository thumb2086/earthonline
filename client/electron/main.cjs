const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const PROD_URL = process.env.EO_PRODUCTION_URL || 'https://twonline.dpdns.org';
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const clientId = process.env.EO_DISCORD_CLIENT_ID || '1512263151671050280';

let mainWindow = null;
let rpc = null;
let rpcReady = false;
let rpcRetryTimer = null;
let defaultPresence = {
  details: '尚未登入 (Not Logged In)',
  state: '停留於登入閘道口',
};

try {
  const DiscordRPC = require('discord-rpc');
  DiscordRPC.register(clientId);
  rpc = new DiscordRPC.Client({ transport: 'ipc' });

  rpc.on('ready', () => {
    rpcReady = true;
    setActivity(defaultPresence);
  });

  rpc.on('disconnected', () => {
    rpcReady = false;
    clearTimeout(rpcRetryTimer);
    rpcRetryTimer = setTimeout(() => {
      rpc.login({ clientId }).catch(() => {});
    }, 30000);
  });
} catch (e) {
  console.error('[EarthOnline] Discord RPC unavailable:', e.message);
}

async function setActivity(data) {
  if (!rpcReady || !rpc) return;
  try {
    await rpc.setActivity({
      details: data.details || defaultPresence.details,
      state: data.state || defaultPresence.state,
      startTimestamp: data.startTimestamp || Date.now(),
      largeImageKey: 'earth_icon',
      largeImageText: 'Earth Online',
      smallImageKey: data.smallImageKey || 'user_icon',
      smallImageText: data.smallImageText || 'Survivor',
      instance: false,
    });
  } catch (e) {
    console.error('[EarthOnline] Failed to set RPC:', e.message);
  }
}

function loadContent(win) {
  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadURL(PROD_URL);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '地球在線 Earth Online',
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#0a0d12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (e, url) => {
    const allowed = isDev
      ? url.startsWith(DEV_SERVER_URL)
      : url.startsWith(PROD_URL);
    if (!allowed) {
      e.preventDefault();
      if (/^https?:\/\//.test(url)) shell.openExternal(url);
    }
  });

  loadContent(mainWindow);
}

app.setAppUserModelId('com.huchialun.earthonline');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

ipcMain.on('update-presence', (_event, data) => {
  setActivity(data);
});

ipcMain.on('set-progress', (_event, value) => {
  if (!mainWindow) return;
  try {
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      mainWindow.setProgressBar(value);
    }
  } catch (e) {
    console.error('[EarthOnline] setProgressBar failed:', e.message);
  }
});

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('app-platform', () => process.platform);

app.whenReady().then(() => {
  createWindow();
  if (rpc) rpc.login({ clientId }).catch(() => {});

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  clearTimeout(rpcRetryTimer);
  if (rpc) rpc.destroy().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});
