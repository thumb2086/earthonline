const { app, BrowserWindow } = require('electron');
const path = require('path');
const DiscordRPC = require('discord-rpc');

// Replace with a valid Discord Client ID later
const clientId = '112233445566778899'; 

DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: true
    },
    title: '地球在線 Earth Online',
    backgroundColor: '#050505',
    autoHideMenuBar: true
  });

  // In development, load the Vite dev server URL
  const devUrl = 'http://localhost:5173';
  
  // In production, load the built HTML file
  // const prodUrl = `file://${path.join(__dirname, '../dist/index.html')}`;

  mainWindow.loadURL(devUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function setActivity() {
  if (!rpc || !mainWindow) {
    return;
  }

  // We can dynamically update this by communicating with the renderer process via IPC
  // For now, this is the static setup
  try {
    await rpc.setActivity({
      details: '伺服器節點: [TW-X1]',
      state: '已用 1 | 共 9999',
      startTimestamp,
      largeImageKey: 'earth_nasa', // Needs to be uploaded to Discord Developer Portal
      largeImageText: 'Earth Online',
      instance: false,
    });
  } catch(e) {
    console.error('Discord RPC Error:', e);
  }
}

app.on('ready', () => {
  createWindow();

  rpc.login({ clientId }).catch(console.error);
});

rpc.on('ready', () => {
  setActivity();

  // Update activity every 15 seconds
  setInterval(() => {
    setActivity();
  }, 15e3);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
