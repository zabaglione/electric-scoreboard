const { app, BrowserWindow, ipcMain, Menu, shell, globalShortcut, Tray } = require('electron');
const path = require('path');
const RSSManager = require('./src/rss-manager');
const StoreManager = require('./src/store-manager');
const Logger = require('./src/logger');

// コマンドライン引数からデバッグモードを判定
const isDebugMode = process.argv.includes('--debug') || process.argv.includes('-d') || process.env.NODE_ENV === 'development';

// ロガーを初期化（デフォルトはoff）
const logger = new Logger(isDebugMode);

if (isDebugMode) {
  console.log('デバッグモードで起動しました');
}

let mainWindow;
let settingsWindow;
let rssManager;
let storeManager;
let updateInterval;
let tray = null;

function createWindow() {
  rssManager = new RSSManager(logger);
  storeManager = new StoreManager();
  
  const settings = storeManager.getSettings();
  
  mainWindow = new BrowserWindow({
    width: settings.windowWidth || 1200,
    height: settings.windowHeight || 150,
    alwaysOnTop: settings.alwaysOnTop || false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'RSS ニュース電光掲示板'
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    mainWindow = null;
  });

  const savedFeeds = storeManager.getFeeds();
  if (savedFeeds.length > 0) {
    savedFeeds.forEach(feed => rssManager.addFeed(feed.url, feed.name));
  }

  startRSSUpdates();
  createContextMenu();
  registerShortcuts();
  createTray();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

async function fetchAndUpdateNews() {
  const result = await rssManager.fetchAllFeeds();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('news-update', result.articles);
  }
}

function startRSSUpdates() {
  fetchAndUpdateNews();
  
  const interval = storeManager.getSetting('updateInterval') || 300000;
  updateInterval = setInterval(fetchAndUpdateNews, interval);
}

ipcMain.handle('get-feeds', () => {
  return rssManager.getFeeds();
});

ipcMain.handle('add-feed', (event, url, name) => {
  const added = rssManager.addFeed(url, name);
  if (added) {
    storeManager.addFeed({ url, name });
    fetchAndUpdateNews();
  }
  return added;
});

ipcMain.handle('remove-feed', (event, url) => {
  const removed = rssManager.removeFeed(url);
  if (removed) {
    storeManager.removeFeed(url);
    fetchAndUpdateNews();
  }
  return removed;
});

ipcMain.handle('get-settings', () => {
  return storeManager.getSettings();
});

ipcMain.handle('get-debug-mode', () => {
  return isDebugMode;
});

ipcMain.handle('update-settings', (event, settings) => {
  const updated = storeManager.updateSettings(settings);
  
  if (settings.updateInterval !== undefined) {
    if (updateInterval) {
      clearInterval(updateInterval);
    }
    startRSSUpdates();
  }
  
  if (settings.windowWidth !== undefined || settings.windowHeight !== undefined) {
    mainWindow.setSize(settings.windowWidth || 1200, settings.windowHeight || 150);
  }
  
  if (settings.alwaysOnTop !== undefined) {
    mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
  }
  
  mainWindow.webContents.send('settings-updated');
  
  return updated;
});

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: '設定 - RSS ニュース電光掲示板'
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

ipcMain.on('open-settings', () => {
  createSettingsWindow();
});

// 右クリックメニューの作成
function createContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '一時停止/再開',
      click: () => {
        mainWindow.webContents.send('toggle-pause');
      }
    },
    { type: 'separator' },
    {
      label: '今すぐ更新',
      click: async () => {
        await fetchAndUpdateNews();
      }
    },
    {
      label: '設定',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '選択したテキストをコピー',
      role: 'copy'
    },
    {
      label: 'RSSフィードを開く',
      submenu: rssManager.getFeeds().map(feed => ({
        label: feed.name,
        click: () => shell.openExternal(feed.url)
      }))
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.quit();
      }
    }
  ]);

  mainWindow.webContents.on('context-menu', (event, params) => {
    contextMenu.popup({ window: mainWindow, x: params.x, y: params.y });
  });
}

// キーボードショートカットの登録
function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    mainWindow.webContents.send('toggle-pause');
  });

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    createSettingsWindow();
  });

  globalShortcut.register('CommandOrControl+Shift+R', async () => {
    await fetchAndUpdateNews();
  });

  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// システムトレイの作成
function createTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    
    // アイコンファイルが存在しない場合は、トレイを作成しない
    const fs = require('fs');
    if (!fs.existsSync(iconPath)) {
      logger.debug('Tray icon not found, skipping tray creation');
      return;
    }
    
    tray = new Tray(iconPath);

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'RSS ニュース電光掲示板',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'ウィンドウを表示',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: '一時停止/再開',
      click: () => {
        mainWindow.webContents.send('toggle-pause');
      }
    },
    { type: 'separator' },
    {
      label: '今すぐ更新',
      click: async () => {
        await fetchAndUpdateNews();
      }
    },
    {
      label: '設定',
      click: () => {
        createSettingsWindow();
      }
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('RSS ニュース電光掲示板');
  tray.setContextMenu(trayMenu);

  // ダブルクリックでウィンドウ表示/非表示
  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  } catch (error) {
    console.error('Failed to create tray:', error);
  }
}

// ウィンドウ最小化時の処理
ipcMain.on('minimize-to-tray', () => {
  mainWindow.hide();
});