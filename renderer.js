const { ipcRenderer } = require('electron');
const { shell } = require('electron');
const Logger = require('./src/logger');

// ログ設定をメインプロセスから取得して初期化
let logger;
ipcRenderer.invoke('get-debug-mode').then(isDebug => {
  logger = new Logger(isDebug);
  if (isDebug) {
    console.log('RSS ニュース電光掲示板 - レンダラープロセス起動');
  }
});

const tickerContent = document.getElementById('ticker-content');
const pauseBtn = document.getElementById('pause-btn');
const settingsBtn = document.getElementById('settings-btn');
const tickerContainer = document.getElementById('ticker-container');

let currentArticles = [];
let isPaused = false;
let currentSettings = null;

function updateTicker(newsItems) {
    if (!newsItems || newsItems.length === 0) {
        tickerContent.innerHTML = '<span class="news-item">ニュースを取得中...<span class="source">[システム]</span></span>';
        // テキストが変更されたのでスクロール速度を再計算
        if (currentSettings) {
            setTimeout(() => updateScrollSpeed(currentSettings.scrollSpeed), 100);
        }
        return;
    }

    tickerContent.innerHTML = '';
    
    newsItems.forEach(item => {
        const newsElement = document.createElement('span');
        newsElement.className = 'news-item';
        newsElement.innerHTML = `
            ${item.title}
            <span class="source">[${item.source}]</span>
        `;
        if (item.link) {
            newsElement.addEventListener('click', () => {
                shell.openExternal(item.link);
            });
        }
        tickerContent.appendChild(newsElement);
    });

    const duplicateItems = [...newsItems];
    duplicateItems.forEach(item => {
        const newsElement = document.createElement('span');
        newsElement.className = 'news-item';
        newsElement.innerHTML = `
            ${item.title}
            <span class="source">[${item.source}]</span>
        `;
        if (item.link) {
            newsElement.addEventListener('click', () => {
                shell.openExternal(item.link);
            });
        }
        tickerContent.appendChild(newsElement);
    });
    
    // テキストが変更されたのでスクロール速度を再計算
    if (currentSettings) {
        setTimeout(() => updateScrollSpeed(currentSettings.scrollSpeed), 100);
    }
}

ipcRenderer.on('news-update', (event, articles) => {
    if (logger) {
        logger.debug(`受信したニュース記事数: ${articles.length}`);
    }
    currentArticles = articles;
    updateTicker(articles);
});

async function loadSettings() {
    currentSettings = await ipcRenderer.invoke('get-settings');
    applySettings(currentSettings);
}

function applySettings(settings) {
    // スクロール速度をピクセル/秒から時間に変換
    updateScrollSpeed(settings.scrollSpeed);
    
    document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
    document.documentElement.style.setProperty('--text-color', settings.textColor);
    document.documentElement.style.setProperty('--bg-color', settings.backgroundColor);
    document.documentElement.style.setProperty('--source-color', settings.sourceColor);
    document.body.style.fontFamily = `'${settings.fontFamily}', monospace`;
    
    // テーマクラスの適用
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    if (settings.theme !== 'custom') {
        document.body.classList.add(`theme-${settings.theme}`);
    }
}

function updateScrollSpeed(pixelsPerSecond) {
    // ピクセル/秒から実際のアニメーション時間を計算
    calculateAndApplyScrollDuration(pixelsPerSecond);
}

function calculateAndApplyScrollDuration(pixelsPerSecond) {
    // テキストコンテンツの幅を取得
    const tickerContent = document.getElementById('ticker-content');
    const windowWidth = window.innerWidth;
    
    if (tickerContent) {
        // テキストの実際の幅を測定
        const textWidth = tickerContent.scrollWidth;
        // 移動する総距離 = ウィンドウ幅 + テキスト幅（画面右端から完全に左に消えるまで）
        const totalDistance = windowWidth + textWidth;
        // 時間 = 距離 / 速度
        const duration = totalDistance / pixelsPerSecond;
        
        if (logger) {
            logger.debug(`スクロール計算: テキスト幅=${textWidth}px, 総距離=${totalDistance}px, 速度=${pixelsPerSecond}px/s, 時間=${duration}s`);
        }
        
        // CSSのアニメーション時間を更新
        document.documentElement.style.setProperty('--scroll-duration', `${duration}s`);
    } else {
        // fallback: デフォルトの計算（ウィンドウ幅ベース）
        const estimatedDistance = windowWidth * 2; // 概算
        const duration = estimatedDistance / pixelsPerSecond;
        document.documentElement.style.setProperty('--scroll-duration', `${duration}s`);
    }
}

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    if (isPaused) {
        tickerContainer.classList.add('paused');
        pauseBtn.textContent = '再開';
    } else {
        tickerContainer.classList.remove('paused');
        pauseBtn.textContent = '一時停止';
    }
});

settingsBtn.addEventListener('click', () => {
    ipcRenderer.send('open-settings');
});

// 設定変更時のリロード対応
ipcRenderer.on('settings-updated', async () => {
    await loadSettings();
});

// メインプロセスからの一時停止トグル
ipcRenderer.on('toggle-pause', () => {
    pauseBtn.click();
});

loadSettings();
updateTicker([{ title: "RSS フィードを読み込み中...", source: "システム" }]);