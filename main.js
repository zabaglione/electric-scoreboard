const { app, BrowserWindow, ipcMain, Menu, shell, globalShortcut, Tray } = require('electron');
const path = require('path');
const RSSManager = require('./src/rss-manager');
const StoreManager = require('./src/store-manager');
const AutostartManager = require('./src/autostart-manager');
const Logger = require('./src/logger');

// コマンドライン引数または環境変数からデバッグモードを判定
const isDebugMode = process.argv.includes('--debug') || 
                   process.argv.includes('-d') || 
                   process.env.NODE_ENV === 'development' || 
                   process.env.DEBUG_MODE === 'true';

// 自動起動経由での起動かどうかを検出
const isLaunchedViaAutostart = detectAutostartLaunch();

// ロガーを初期化（デフォルトはoff）
const logger = new Logger(isDebugMode);

if (isDebugMode) {
  console.log('デバッグモードで起動しました');
}

if (isLaunchedViaAutostart) {
  logger.debug('アプリケーションが自動起動経由で起動されました');
}

let mainWindow;
let settingsWindow;
let rssManager;
let storeManager;
let autostartManager;
let updateInterval;
let tray = null;

/**
 * 自動起動経由での起動かどうかを検出
 * Detect if the application was launched via autostart
 * @returns {boolean} True if launched via autostart
 */
function detectAutostartLaunch() {
  // macOS: openAsHidden フラグまたは起動時の引数を確認
  if (process.platform === 'darwin') {
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.wasOpenedAsHidden || process.argv.includes('--hidden');
  }
  
  // Windows: 起動時の引数や環境変数を確認
  if (process.platform === 'win32') {
    return process.argv.includes('--autostart') || 
           process.argv.includes('--hidden') ||
           process.env.AUTOSTART_LAUNCH === 'true';
  }
  
  // Linux: 起動時の引数を確認
  if (process.platform === 'linux') {
    return process.argv.includes('--autostart') || process.argv.includes('--hidden');
  }
  
  return false;
}

/**
 * 自動起動時の特別な動作を処理
 * Handle special behavior when launched via autostart
 */
function handleAutostartBehavior() {
  logger.debug('自動起動時の動作を設定中...');
  
  // システムトレイが利用可能な場合、ウィンドウを非表示にしてトレイに最小化
  if (tray) {
    logger.debug('システムトレイに最小化します');
    mainWindow.hide();
  } else {
    // システムトレイが利用できない場合は最小化状態で表示
    logger.debug('ウィンドウを最小化状態で表示します');
    mainWindow.minimize();
  }
  
  // 自動起動時は常に最前面表示を無効にする（邪魔にならないように）
  mainWindow.setAlwaysOnTop(false);
  
  logger.debug('自動起動時の動作設定が完了しました');
}

function createWindow() {
  rssManager = new RSSManager(logger);
  storeManager = new StoreManager();
  autostartManager = new AutostartManager(logger);
  
  const settings = storeManager.getSettings();
  
  // 自動起動時は非表示で開始するかどうかを決定
  const showWindow = !isLaunchedViaAutostart;
  
  mainWindow = new BrowserWindow({
    width: settings.windowWidth || 1200,
    height: settings.windowHeight || 150,
    alwaysOnTop: settings.alwaysOnTop || false,
    show: showWindow, // 自動起動時は非表示で開始
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
  
  // 自動起動時の特別な処理（トレイ作成後に実行）
  if (isLaunchedViaAutostart) {
    handleAutostartBehavior();
  }
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

ipcMain.handle('get-autostart-launch-status', () => {
  return isLaunchedViaAutostart;
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

// 自動起動関連のIPCハンドラー
ipcMain.handle('get-autostart-status', async () => {
  try {
    return await autostartManager.isEnabled();
  } catch (error) {
    logger.error('Failed to get autostart status:', error);
    throw new Error(`自動起動状態の取得に失敗しました: ${error.message}`);
  }
});

ipcMain.handle('set-autostart', async (event, enabled) => {
  try {
    if (enabled) {
      await autostartManager.enable();
      logger.debug('Autostart enabled via settings');
    } else {
      await autostartManager.disable();
      logger.debug('Autostart disabled via settings');
    }
    return true;
  } catch (error) {
    logger.error('Failed to set autostart:', error);
    
    // プラットフォーム固有のエラーメッセージを提供
    let errorMessage = error.message;
    if (error.message.includes('Unsupported platform')) {
      errorMessage = 'このプラットフォームでは自動起動機能はサポートされていません';
    } else if (error.message.includes('permission') || error.message.includes('Permission')) {
      errorMessage = '自動起動の設定に必要な権限がありません';
    }
    
    throw new Error(errorMessage);
  }
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
    // Trayの作成失敗はアプリの動作に影響しないので、デバッグログのみ
    logger.debug('Failed to create tray:', error.message);
  }
}

// ウィンドウ最小化時の処理
ipcMain.on('minimize-to-tray', () => {
  mainWindow.hide();
});