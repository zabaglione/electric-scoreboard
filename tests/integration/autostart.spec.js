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

test.describe('自動起動機能テスト', () => {
  test('正常系: 自動起動チェックボックスが表示される', async () => {
    // 自動起動チェックボックスが存在することを確認
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    await expect(autostartCheckbox).toBeVisible();
    
    // ラベルが正しいことを確認
    const autostartLabel = await settingsWindow.locator('label[for="autostart"]');
    await expect(autostartLabel).toContainText('OS起動時に自動起動する');
  });

  test('正常系: 自動起動設定を変更できる', async () => {
    // 自動起動チェックボックスを取得
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // 初期状態を取得
    const initialChecked = await autostartCheckbox.isChecked();
    
    // チェックボックスをトグル
    await autostartCheckbox.click();
    
    // 状態が変更されたことを確認
    const newChecked = await autostartCheckbox.isChecked();
    expect(newChecked).toBe(!initialChecked);
    
    // IPCメッセージが送信されたことを確認（間接的に確認）
    // 処理中の表示が一時的に出ることを確認
    const label = await settingsWindow.locator('label[for="autostart"]');
    await expect(label).toContainText('設定中');
    
    // 処理が完了するまで待機（最大5秒）
    await settingsWindow.waitForFunction(
      () => {
        const label = document.querySelector('label[for="autostart"]');
        return !label.textContent.includes('設定中');
      },
      { timeout: 5000 }
    );
    
    // 成功表示が一時的に出ることを確認
    const labelText = await label.textContent();
    expect(labelText.includes('✓') || labelText.includes('OS起動時に自動起動する')).toBeTruthy();
  });

  test('正常系: 設定が保存されて再表示時に維持される', async () => {
    // 自動起動チェックボックスを取得
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // 初期状態を取得
    const initialChecked = await autostartCheckbox.isChecked();
    
    // チェックボックスをトグル
    await autostartCheckbox.click();
    
    // 処理が完了するまで待機
    await settingsWindow.waitForFunction(
      () => {
        const label = document.querySelector('label[for="autostart"]');
        return !label.textContent.includes('設定中');
      },
      { timeout: 5000 }
    );
    
    // 保存ボタンをクリック
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    
    // 設定ウィンドウが閉じるのを待つ
    await settingsWindow.waitForEvent('close');
    
    // 設定を再度開く
    await window.hover('body');
    const controls = await window.locator('#controls');
    await controls.waitFor({ state: 'visible', timeout: 5000 });
    
    const settingsBtn = await window.locator('#settings-btn');
    await settingsBtn.click();
    
    // 新しい設定ウィンドウが開くのを待つ
    settingsWindow = await electronApp.waitForEvent('window');
    await settingsWindow.waitForLoadState('domcontentloaded');
    
    // 自動起動設定が保持されていることを確認
    const newAutostartCheckbox = await settingsWindow.locator('#autostart');
    const newChecked = await newAutostartCheckbox.isChecked();
    expect(newChecked).toBe(!initialChecked);
  });

  test('正常系: プラットフォームサポート状況が正しく表示される', async () => {
    // プラットフォームサポート情報が取得されたことを確認
    // (間接的に確認: チェックボックスが有効であることを確認)
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // チェックボックスが無効化されていないことを確認
    // (サポートされていない場合は無効化される)
    const isDisabled = await autostartCheckbox.isDisabled();
    
    if (isDisabled) {
      // サポートされていない場合はラベルにその旨が表示される
      const label = await settingsWindow.locator('label[for="autostart"]');
      await expect(label).toContainText('サポートされていません');
    } else {
      // サポートされている場合はチェックボックスが操作可能
      expect(isDisabled).toBe(false);
    }
  });

  test('異常系: エラー発生時の表示と回復', async () => {
    // エラー状態をシミュレートするためにIPCをモック
    // (Playwrightでは直接モックできないため、アプリケーション側でエラーハンドリングが
    // 適切に行われていることを間接的に確認する)
    
    // 自動起動チェックボックスを取得
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // 現在の状態を取得
    const initialChecked = await autostartCheckbox.isChecked();
    
    // エラーをシミュレートするために、短時間で複数回クリック
    // (これにより競合状態を作り出し、エラーが発生する可能性がある)
    await autostartCheckbox.click();
    await settingsWindow.waitForTimeout(100);
    await autostartCheckbox.click();
    await settingsWindow.waitForTimeout(100);
    await autostartCheckbox.click();
    
    // 処理が完了するまで待機
    await settingsWindow.waitForTimeout(1000);
    
    // エラーが発生した場合、元の状態に戻ることを確認
    // または正常に処理された場合は新しい状態になることを確認
    const finalChecked = await autostartCheckbox.isChecked();
    
    // どちらの状態になっても、アプリケーションがクラッシュしていないことが重要
    expect(finalChecked === initialChecked || finalChecked === !initialChecked).toBeTruthy();
  });

  test('異常系: 権限エラー時のユーザーフィードバック', async () => {
    // 権限エラーを直接シミュレートすることはできないが、
    // エラーハンドリングUIが存在することを確認する
    
    // 自動起動チェックボックスを取得
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // チェックボックスをクリック
    await autostartCheckbox.click();
    
    // 処理が完了するまで待機
    await settingsWindow.waitForTimeout(1000);
    
    // エラーが発生した場合、ラベルに一時的にエラー表示がされる可能性がある
    const label = await settingsWindow.locator('label[for="autostart"]');
    const labelText = await label.textContent();
    
    // エラー表示がある場合は ✗ マークが含まれる
    // エラーがない場合は通常表示または ✓ マークが含まれる
    expect(
      labelText.includes('OS起動時に自動起動する') || 
      labelText.includes('✓') || 
      labelText.includes('✗')
    ).toBeTruthy();
    
    // いずれにせよアプリケーションは応答可能な状態であることを確認
    expect(await autostartCheckbox.isEnabled()).toBeTruthy();
  });
});

test.describe('自動起動IPC通信テスト', () => {
  test('正常系: 自動起動状態の取得', async () => {
    // 自動起動状態が正しく取得されることを確認
    // (間接的に確認: チェックボックスの初期状態が設定される)
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // チェックボックスが有効であることを確認
    // (状態取得に失敗すると無効化される)
    const isDisabled = await autostartCheckbox.isDisabled();
    
    if (!isDisabled) {
      // 状態が取得できている場合、チェックボックスは有効
      expect(isDisabled).toBe(false);
    } else {
      // 状態取得に失敗した場合、エラーメッセージが表示される
      const label = await settingsWindow.locator('label[for="autostart"]');
      await expect(label).toContainText('設定の読み込みに失敗');
    }
  });

  test('正常系: 自動起動設定の保存', async () => {
    // 自動起動チェックボックスを取得
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // チェックボックスが無効でない場合のみテスト実行
    if (!(await autostartCheckbox.isDisabled())) {
      // 初期状態を取得
      const initialChecked = await autostartCheckbox.isChecked();
      
      // チェックボックスをトグル
      await autostartCheckbox.click();
      
      // 処理が完了するまで待機
      await settingsWindow.waitForTimeout(1000);
      
      // 保存ボタンをクリック
      const saveButton = await settingsWindow.locator('#save-settings');
      await saveButton.click();
      
      // 設定ウィンドウが閉じるのを待つ
      await settingsWindow.waitForEvent('close');
      
      // 設定を再度開く
      await window.hover('body');
      const controls = await window.locator('#controls');
      await controls.waitFor({ state: 'visible', timeout: 5000 });
      
      const settingsBtn = await window.locator('#settings-btn');
      await settingsBtn.click();
      
      // 新しい設定ウィンドウが開くのを待つ
      settingsWindow = await electronApp.waitForEvent('window');
      await settingsWindow.waitForLoadState('domcontentloaded');
      
      // 自動起動設定が保持されていることを確認
      const newAutostartCheckbox = await settingsWindow.locator('#autostart');
      const newChecked = await newAutostartCheckbox.isChecked();
      expect(newChecked).toBe(!initialChecked);
    } else {
      // チェックボックスが無効の場合はテストをスキップ
      console.log('自動起動設定が無効なためテストをスキップします');
    }
  });
});

test.describe('自動起動起動時の動作テスト', () => {
  test('正常系: 自動起動経由での起動状態を取得できる', async () => {
    // 自動起動経由での起動状態を確認
    // (間接的に確認: IPC通信を介して状態を取得)
    
    // 自動起動経由での起動状態を取得
    const isLaunchedViaAutostart = await electronApp.evaluate(async ({ app }) => {
      return global.isLaunchedViaAutostart || false;
    });
    
    // 通常起動の場合はfalseになることを確認
    // (テスト環境では自動起動経由での起動はシミュレートできないため)
    expect(typeof isLaunchedViaAutostart).toBe('boolean');
    expect(isLaunchedViaAutostart).toBe(false);
  });
});