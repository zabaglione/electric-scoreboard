const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');

let electronApp;
let window;
let settingsWindow;

test.beforeEach(async () => {
  // Electronアプリを起動
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../main.js')]
  });
  
  // 最初のウィンドウを取得
  window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  
  // マウスをホバーしてコントロールを表示
  await window.hover('body');
  const controls = await window.locator('#controls');
  await controls.waitFor({ state: 'visible', timeout: 5000 });
  
  // 設定ボタンをクリック
  const settingsBtn = await window.locator('#settings-btn');
  await settingsBtn.click();
  
  // 設定ウィンドウが開くのを待つ
  settingsWindow = await electronApp.waitForEvent('window');
  await settingsWindow.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

test.describe('設定機能テスト', () => {
  test('正常系: 設定ウィンドウが開く', async () => {
    // 設定ウィンドウが存在することを確認
    expect(settingsWindow).toBeTruthy();
    
    // タイトルを確認
    const title = await settingsWindow.title();
    expect(title).toBe('設定');
    
    // 各セクションが表示されることを確認
    await expect(settingsWindow.locator('h3:has-text("フィード管理")')).toBeVisible();
    await expect(settingsWindow.locator('h3:has-text("表示設定")')).toBeVisible();
    await expect(settingsWindow.locator('h3:has-text("動作設定")')).toBeVisible();
  });

  test('正常系: フィードを追加・削除できる', async () => {
    // 新しいフィードを追加
    const feedUrlInput = await settingsWindow.locator('#new-feed-url');
    const feedNameInput = await settingsWindow.locator('#new-feed-name');
    const addButton = await settingsWindow.locator('button:has-text("追加")');
    
    await feedUrlInput.fill('https://example.com/test-feed.xml');
    await feedNameInput.fill('テストフィード');
    await addButton.click();
    
    // フィードが追加されたことを確認
    await settingsWindow.waitForTimeout(500);
    const feedItem = await settingsWindow.locator('.feed-item:has-text("テストフィード")');
    await expect(feedItem).toBeVisible();
    
    // フィードを削除
    const deleteButton = await feedItem.locator('button:has-text("削除")');
    await deleteButton.click();
    
    // フィードが削除されたことを確認
    await settingsWindow.waitForTimeout(500);
    await expect(feedItem).not.toBeVisible();
  });

  test('正常系: スクロール速度を変更できる', async () => {
    // スクロール速度スライダーを操作
    const speedSlider = await settingsWindow.locator('#scroll-speed');
    const speedValue = await settingsWindow.locator('#scroll-speed-value');
    
    // 初期値を確認
    const initialSpeed = await speedValue.textContent();
    expect(initialSpeed).toBe('50px/秒');
    
    // スライダーを動かす
    await speedSlider.fill('30');
    
    // 値が更新されることを確認
    const newSpeed = await speedValue.textContent();
    expect(newSpeed).toBe('30px/秒');
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // メインウィンドウでスクロール速度が動的に計算されていることを確認
    const scrollDuration = await window.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--scroll-duration');
    });
    expect(scrollDuration).toContain('s'); // 秒単位の値が設定されていることを確認
  });

  test('正常系: テーマを切り替えられる', async () => {
    // テーマセレクタを操作
    const themeSelect = await settingsWindow.locator('#theme');
    await themeSelect.selectOption('light');
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // メインウィンドウでテーマが変更されていることを確認
    const hasLightTheme = await window.evaluate(() => {
      return document.body.classList.contains('light-theme');
    });
    expect(hasLightTheme).toBe(true);
  });

  test('正常系: カスタム色設定ができる', async () => {
    // テーマをカスタムに変更
    const themeSelect = await settingsWindow.locator('#theme');
    await themeSelect.selectOption('custom');
    
    // カスタムカラーセクションが表示されることを確認
    const customColors = await settingsWindow.locator('#custom-colors');
    await expect(customColors).toBeVisible();
    
    // 色を変更
    const textColorInput = await settingsWindow.locator('#text-color');
    await textColorInput.fill('#ff0000');
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // メインウィンドウで色が変更されていることを確認
    const textColor = await window.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    });
    expect(textColor.trim()).toBe('#ff0000');
  });

  test('正常系: フォント設定を変更できる', async () => {
    // フォントサイズを変更
    const fontSizeSlider = await settingsWindow.locator('#font-size');
    const fontSizeValue = await settingsWindow.locator('#font-size-value');
    
    await fontSizeSlider.fill('60');
    const newSize = await fontSizeValue.textContent();
    expect(newSize).toBe('60px');
    
    // フォントファミリーを変更
    const fontFamilySelect = await settingsWindow.locator('#font-family');
    await fontFamilySelect.selectOption('Arial');
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // メインウィンドウでフォント設定が変更されていることを確認
    const fontSize = await window.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--font-size');
    });
    expect(fontSize.trim()).toBe('60px');
    
    const fontFamily = await window.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    expect(fontFamily).toContain('Arial');
  });

  test('正常系: 更新間隔を変更できる', async () => {
    // 更新間隔セレクタを操作
    const intervalSelect = await settingsWindow.locator('#update-interval');
    await intervalSelect.selectOption('600000'); // 10分
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // IPCで設定が保存されたことを確認
    const savedInterval = await electronApp.evaluate(async () => {
      const { ipcMain } = require('electron');
      return new Promise((resolve) => {
        ipcMain.once('get-settings', (event) => {
          const Store = require('electron-store').default || require('electron-store');
          const store = new Store();
          event.reply('settings', store.get('settings'));
        });
        
        ipcMain.emit('get-settings', { reply: (channel, data) => resolve(data.updateInterval) });
      });
    });
    
    expect(savedInterval).toBe(600000);
  });

  test('正常系: 自動起動設定を変更できる', async () => {
    // 自動起動チェックボックスを確認
    const autostartCheckbox = await settingsWindow.locator('#autostart-enabled');
    await expect(autostartCheckbox).toBeVisible();
    
    // 初期状態を取得
    const initialChecked = await autostartCheckbox.isChecked();
    
    // チェックボックスをトグル
    await autostartCheckbox.click();
    
    // 状態が変更されたことを確認
    const newChecked = await autostartCheckbox.isChecked();
    expect(newChecked).toBe(!initialChecked);
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // 設定を再度開いて状態が保持されていることを確認
    await window.hover('body');
    const controls = await window.locator('#controls');
    await controls.waitFor({ state: 'visible', timeout: 5000 });
    
    const settingsBtn = await window.locator('#settings-btn');
    await settingsBtn.click();
    
    settingsWindow = await electronApp.waitForEvent('window');
    await settingsWindow.waitForLoadState('domcontentloaded');
    
    const savedAutostartCheckbox = await settingsWindow.locator('#autostart-enabled');
    const savedChecked = await savedAutostartCheckbox.isChecked();
    expect(savedChecked).toBe(newChecked);
  });
});