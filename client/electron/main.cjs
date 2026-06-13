const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const DiscordRPC = require('discord-rpc');

const clientId = '1512263151671050280';
DiscordRPC.register(clientId);

let mainWindow;
const rpc = new DiscordRPC.Client({ transport: 'ipc' });
let rpcReady = false;
let activityTimer = null;

// ─── Window State Persistence ──────────────────────────────────────────────
function getWindowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(getWindowStatePath(), 'utf-8'));
  } catch { return { width: 1280, height: 720, frameless: false }; }
}

function saveWindowState(partial) {
  try {
    const existing = loadWindowState();
    const next = { ...existing, ...partial };
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(next, null, 2));
    return next;
  } catch (e) { console.error('saveWindowState', e); }
}

// ─── Discord RPC ──────────────────────────────────────────────────────────
async function setActivity(data) {
  if (!rpcReady) return;
  try {
    const activity = {
      details: data.details || 'Surviving...',
      state: data.state || 'In the wilderness',
      startTimestamp: data.startTimestamp || Date.now(),
      largeImageKey: 'earth_icon',
      largeImageText: 'Earth Online',
      instance: false,
    };
    if (data.smallImageKey) {
      activity.smallImageKey = data.smallImageKey;
      activity.smallImageText = data.smallImageText || '';
    }
    if (data.buttons) activity.buttons = data.buttons;
    await rpc.setActivity(activity);
  } catch (e) { console.error('setActivity', e); }
}

function startActivityTimer(data) {
  if (activityTimer) clearInterval(activityTimer);
  activityTimer = setInterval(() => setActivity(data), 15000);
}

rpc.on('ready', () => {
  rpcReady = true;
  const def = {
    details: '尚未登入 (Not Logged In)',
    state: '停留於登入閘道口',
    buttons: [{ label: 'Play Earth Online', url: 'https://earthonline.qzz.io' }],
  };
  setActivity(def);
  startActivityTimer(def);
});

rpc.login({ clientId }).catch(console.error);

// ─── Window Creation ──────────────────────────────────────────────────────
let saveTimer = null;
function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!mainWindow) return;
    const { x, y, width, height } = mainWindow.getBounds();
    saveWindowState({ x, y, width, height });
  }, 500);
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width || 1280,
    height: state.height || 720,
    x: state.x,
    y: state.y,
    frame: !state.frameless,
    title: 'Earth Online',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────
ipcMain.on('update-presence', (_event, data) => {
  setActivity(data);
  startActivityTimer(data);
});

ipcMain.on('set-progress', (_event, progress) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(progress);
  }
});

ipcMain.handle('toggle-frameless', () => {
  const state = loadWindowState();
  const nextFrameless = !state.frameless;
  saveWindowState({ frameless: nextFrameless });
  const bounds = mainWindow.getBounds();
  mainWindow.destroy();
  mainWindow = new BrowserWindow({
    ...bounds,
    frame: !nextFrameless,
    title: 'Earth Online',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  return nextFrameless;
});

ipcMain.handle('get-window-state', () => loadWindowState());

// ─── App Lifecycle ────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
