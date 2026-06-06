const { app, BrowserWindow } = require('electron');
const DiscordRPC = require('discord-rpc');
const path = require('path');

// 設定 Earth Online 的專屬 Discord Application ID
const clientId = '1326442111162126428';

// 允許 IPC 傳輸
DiscordRPC.register(clientId);

const rpc = new DiscordRPC.Client({ transport: 'ipc' });
const startTimestamp = new Date(); // 計算掛機時間起點

let mainWindow;

async function setActivity() {
  if (!rpc) return;
  
  try {
    await rpc.setActivity({
      details: '全球網路觀測與管理中心',
      state: '正在掛機累積生存時間',
      startTimestamp,
      largeImageKey: 'earth_icon', // Discord 開發者後台若有上傳 icon，可填入其 Key
      largeImageText: 'EARTH ONLINE',
      instance: false,
    });
  } catch (err) {
    console.error('Failed to set Discord Activity:', err);
  }
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '地球在線 (Earth Online)',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'), // 未來可放入圖示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // 直接載入地球在線正式服網址
  mainWindow.loadURL('https://earthonline.onrender.com');

  // Discord RPC 連線與設定
  rpc.on('ready', () => {
    console.log('Discord RPC is ready!');
    setActivity();
    
    // 每 15 秒重新更新一次狀態以確保穩定
    setInterval(() => {
      setActivity();
    }, 15000);
  });

  rpc.login({ clientId }).catch(err => {
    console.log('請確認您已開啟桌面版 Discord 軟體。', err.message);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
