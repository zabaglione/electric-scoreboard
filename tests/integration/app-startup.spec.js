const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

let electronApp;
let window;

test.beforeEach(async () => {
  // Electronアプリを起動
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../main.js')]
  });
  
  // 最初のウィンドウを取得
  window = await electronApp.firstWindow();
  
  // ウィンドウが完全に読み込まれるまで待機
  await window.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  // アプリを閉じる
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('アプリ起動テスト', () => {
  test('正常系: アプリが正常に起動する', async () => {
    // アプリが起動していることを確認
    expect(electronApp).toBeTruthy();
    expect(window).toBeTruthy();
    
    // ウィンドウのタイトルを確認
    const title = await window.title();
    expect(title).toBe('RSS ニュース電光掲示板');
  });

  test('正常系: 初期画面が正しく表示される', async () => {
    // ティッカーコンテナが存在することを確認
    const tickerContainer = await window.locator('#ticker-container');
    await expect(tickerContainer).toBeVisible();
    
    // ティッカーコンテンツが存在することを確認
    const tickerContent = await window.locator('#ticker-content');
    await expect(tickerContent).toBeVisible();
    
    // 初期メッセージまたはニュースが表示されることを確認
    await expect(tickerContent).toBeVisible();
    
    // コンテンツが存在することを確認（初期メッセージまたは実際のニュース）
    const hasContent = await tickerContent.evaluate(el => el.textContent.length > 0);
    expect(hasContent).toBe(true);
  });

  test('正常系: コントロールボタンが表示される', async () => {
    // マウスをウィンドウ内に移動
    await window.hover('body');
    
    // コントロールが表示されるまで待機
    const controls = await window.locator('#controls');
    await controls.waitFor({ state: 'visible', timeout: 5000 });
    
    // 一時停止ボタンが存在することを確認
    const pauseBtn = await window.locator('#pause-btn');
    await expect(pauseBtn).toBeVisible();
    await expect(pauseBtn).toHaveText('一時停止');
    
    // 設定ボタンが存在することを確認
    const settingsBtn = await window.locator('#settings-btn');
    await expect(settingsBtn).toBeVisible();
    await expect(settingsBtn).toHaveText('設定');
  });

  test('正常系: デフォルトフィードから記事を取得する', async () => {
    // 記事が表示されるまで待機（最大15秒）
    await window.waitForFunction(
      () => {
        const content = document.querySelector('#ticker-content');
        return content && content.children.length > 1;
      },
      { timeout: 15000 }
    );
    
    // ニュースアイテムが表示されることを確認
    const newsItems = await window.locator('.news-item');
    const count = await newsItems.count();
    expect(count).toBeGreaterThan(0);
    
    // ニュースアイテムにソース情報が含まれることを確認
    const firstItem = newsItems.first();
    const sourceText = await firstItem.locator('.source').textContent();
    expect(sourceText).toMatch(/\[.+\]/);
    
    // 新しいデフォルトフィードのソースが含まれることを確認
    const allText = await window.locator('#ticker-content').textContent();
    const expectedSources = ['はてなブックマーク', 'ライブドアニュース', 'Yahoo!IT', 'GIGAZINE', 'ITmedia'];
    const hasExpectedSource = expectedSources.some(source => allText.includes(source));
    expect(hasExpectedSource).toBe(true);
  });

  test('正常系: ウィンドウサイズが適切に設定される', async () => {
    const { width, height } = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      const bounds = window.getBounds();
      return { width: bounds.width, height: bounds.height };
    });
    
    expect(width).toBe(1200);
    expect(height).toBe(150);
  });

  test('正常系: 開発者ツールが本番環境で無効化される', async () => {
    // NODE_ENVがproductionでない場合はスキップ
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('開発環境のため、開発者ツールのテストをスキップ');
      return;
    }
    
    // 開発者ツールが開かれていないことを確認
    const isDevToolsOpened = await electronApp.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      return window.webContents.isDevToolsOpened();
    });
    
    expect(isDevToolsOpened).toBe(false);
  });
});