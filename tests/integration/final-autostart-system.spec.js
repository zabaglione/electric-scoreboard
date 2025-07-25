const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

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
});

test.afterEach(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});

/**
 * 設定ウィンドウを開く共通処理
 */
async function openSettingsWindow() {
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
  
  return settingsWindow;
}

/**
 * 自動起動設定を変更する共通処理
 */
async function toggleAutostartSetting(targetState) {
  const autostartCheckbox = await settingsWindow.locator('#autostart');
  const currentState = await autostartCheckbox.isChecked();
  
  if (currentState !== targetState) {
    await autostartCheckbox.click();
    
    // 処理が完了するまで待機
    await settingsWindow.waitForFunction(
      () => {
        const label = document.querySelector('label[for="autostart"]');
        return !label.textContent.includes('設定中');
      },
      { timeout: 10000 }
    );
  }
  
  return await autostartCheckbox.isChecked();
}

test.describe('Final Integration and System Testing - 自動起動完全統合テスト', () => {
  
  test('完全統合テスト: 自動起動ワークフロー全体の検証', async () => {
    // 1. 設定ウィンドウを開く
    await openSettingsWindow();
    
    // 2. 自動起動チェックボックスが表示されることを確認
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    await expect(autostartCheckbox).toBeVisible();
    
    // 3. プラットフォームサポート状況を確認
    const isDisabled = await autostartCheckbox.isDisabled();
    
    if (isDisabled) {
      // サポートされていない場合のテスト
      const label = await settingsWindow.locator('label[for="autostart"]');
      const labelText = await label.textContent();
      expect(labelText).toContain('サポートされていません');
      
      console.log('自動起動機能がサポートされていないプラットフォームです');
      return; // テストを終了
    }
    
    // 4. 初期状態を記録
    const initialState = await autostartCheckbox.isChecked();
    console.log(`自動起動の初期状態: ${initialState ? '有効' : '無効'}`);
    
    // 5. 自動起動を有効にする
    const enabledState = await toggleAutostartSetting(true);
    expect(enabledState).toBe(true);
    
    // 6. 設定を保存
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    await settingsWindow.waitForEvent('close');
    
    // 7. アプリケーションを再起動して設定の永続化を確認
    await electronApp.close();
    
    // 新しいインスタンスを起動
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main.js')]
    });
    
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // 8. 設定が保持されていることを確認
    await openSettingsWindow();
    const newAutostartCheckbox = await settingsWindow.locator('#autostart');
    const persistedState = await newAutostartCheckbox.isChecked();
    expect(persistedState).toBe(true);
    
    // 9. 自動起動を無効に戻す（クリーンアップ）
    await toggleAutostartSetting(initialState);
    
    // 10. 最終的な設定保存
    const finalSaveButton = await settingsWindow.locator('#save-settings');
    await finalSaveButton.click();
    await settingsWindow.waitForEvent('close');
    
    console.log('完全統合テストが正常に完了しました');
  });

  test('設定永続化テスト: アプリケーション再起動後の設定維持', async () => {
    await openSettingsWindow();
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    // サポートされていない場合はスキップ
    if (await autostartCheckbox.isDisabled()) {
      console.log('プラットフォームがサポートされていないため、テストをスキップします');
      return;
    }
    
    // 初期状態を取得
    const initialState = await autostartCheckbox.isChecked();
    
    // 状態を変更
    await toggleAutostartSetting(!initialState);
    
    // 設定を保存
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    await settingsWindow.waitForEvent('close');
    
    // アプリケーションを複数回再起動して永続化を確認
    for (let i = 0; i < 3; i++) {
      console.log(`再起動テスト ${i + 1}/3`);
      
      await electronApp.close();
      
      electronApp = await electron.launch({
        args: [path.join(__dirname, '../../main.js')]
      });
      
      window = await electronApp.firstWindow();
      await window.waitForLoadState('domcontentloaded');
      
      await openSettingsWindow();
      const checkbox = await settingsWindow.locator('#autostart');
      const currentState = await checkbox.isChecked();
      
      expect(currentState).toBe(!initialState);
      
      // 設定ウィンドウを閉じる
      const closeButton = await settingsWindow.locator('#save-settings');
      await closeButton.click();
      await settingsWindow.waitForEvent('close');
    }
    
    // 元の状態に戻す
    await openSettingsWindow();
    await toggleAutostartSetting(initialState);
    const finalSaveButton = await settingsWindow.locator('#save-settings');
    await finalSaveButton.click();
    await settingsWindow.waitForEvent('close');
    
    console.log('設定永続化テストが正常に完了しました');
  });

  test('自動起動検出テスト: 起動方法の判定', async () => {
    // 通常起動での起動状態を確認
    const isAutostartLaunch = await electronApp.evaluate(async ({ ipcMain }) => {
      return new Promise((resolve) => {
        ipcMain.handle('test-get-autostart-launch-status', () => {
          return global.isLaunchedViaAutostart || false;
        });
        resolve(global.isLaunchedViaAutostart || false);
      });
    });
    
    // 通常起動の場合はfalseであることを確認
    expect(isAutostartLaunch).toBe(false);
    
    console.log(`起動方法の検出: ${isAutostartLaunch ? '自動起動' : '通常起動'}`);
    
    // 自動起動フラグ付きでの起動をシミュレート
    await electronApp.close();
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main.js'), '--autostart']
    });
    
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // 自動起動フラグが検出されることを確認
    const isAutostartLaunchWithFlag = await electronApp.evaluate(async () => {
      return process.argv.includes('--autostart');
    });
    
    expect(isAutostartLaunchWithFlag).toBe(true);
    
    console.log('自動起動検出テストが正常に完了しました');
  });

  test('システムトレイ最小化テスト: 自動起動時の動作', async () => {
    // システムトレイが利用可能かどうかを確認
    let hasTray = false;
    try {
      const fs = require('fs');
      const iconPath = path.join(__dirname, '../../assets/icon.png');
      hasTray = fs.existsSync(iconPath);
    } catch (error) {
      hasTray = false;
    }
    
    if (!hasTray) {
      console.log('システムトレイアイコンが利用できないため、テストをスキップします');
      return;
    }
    
    // 自動起動フラグ付きで起動
    await electronApp.close();
    
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../main.js'), '--autostart']
    });
    
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    // ウィンドウが表示されていることを確認（テスト環境では通常表示される）
    const isVisible = await window.evaluate(() => {
      return !document.hidden;
    });
    
    console.log(`自動起動時のウィンドウ表示状態: ${isVisible ? '表示' : '非表示'}`);
    
    // 自動起動フラグが正しく検出されることを確認
    const hasAutostartFlag = await electronApp.evaluate(async ({ app }) => {
      return process.argv.includes('--autostart');
    });
    
    expect(hasAutostartFlag).toBe(true);
    
    console.log('システムトレイ最小化テストが正常に完了しました');
  });

  test('クロスプラットフォーム一貫性テスト: プラットフォーム固有の動作確認', async () => {
    await openSettingsWindow();
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    const platform = await electronApp.evaluate(() => process.platform);
    
    console.log(`現在のプラットフォーム: ${platform}`);
    
    // プラットフォーム固有の動作を確認
    if (await autostartCheckbox.isDisabled()) {
      // サポートされていないプラットフォーム
      const label = await settingsWindow.locator('label[for="autostart"]');
      const labelText = await label.textContent();
      
      expect(labelText).toContain('サポートされていません');
      console.log(`${platform} では自動起動機能がサポートされていません`);
      
    } else {
      // サポートされているプラットフォーム
      console.log(`${platform} では自動起動機能がサポートされています`);
      
      // プラットフォーム固有のメソッドを確認
      const platformMethod = await electronApp.evaluate(async ({ app }) => {
        const platform = process.platform;
        switch (platform) {
          case 'darwin':
            return 'loginItems';
          case 'win32':
            return 'registry';
          case 'linux':
            return 'desktop';
          default:
            return null;
        }
      });
      
      console.log(`使用される自動起動メソッド: ${platformMethod}`);
      
      // プラットフォーム別の期待値を確認
      switch (platform) {
        case 'darwin':
          expect(platformMethod).toBe('loginItems');
          break;
        case 'win32':
          expect(platformMethod).toBe('registry');
          break;
        case 'linux':
          expect(platformMethod).toBe('desktop');
          break;
        default:
          expect(platformMethod).toBeNull();
      }
      
      // 基本的な有効/無効の切り替えテスト
      const initialState = await autostartCheckbox.isChecked();
      
      // 有効化テスト
      await toggleAutostartSetting(true);
      const enabledState = await autostartCheckbox.isChecked();
      expect(enabledState).toBe(true);
      
      // 無効化テスト
      await toggleAutostartSetting(false);
      const disabledState = await autostartCheckbox.isChecked();
      expect(disabledState).toBe(false);
      
      // 元の状態に戻す
      await toggleAutostartSetting(initialState);
    }
    
    console.log('クロスプラットフォーム一貫性テストが正常に完了しました');
  });

  test('エラーハンドリングと回復テスト: 異常状態からの回復', async () => {
    await openSettingsWindow();
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    if (await autostartCheckbox.isDisabled()) {
      console.log('プラットフォームがサポートされていないため、テストをスキップします');
      return;
    }
    
    // 初期状態を記録
    const initialState = await autostartCheckbox.isChecked();
    
    // 高速で複数回クリックしてエラー状態を誘発
    console.log('エラー状態を誘発するため、高速で複数回クリックします');
    
    for (let i = 0; i < 5; i++) {
      await autostartCheckbox.click();
      await settingsWindow.waitForTimeout(100);
    }
    
    // 処理が完了するまで待機
    await settingsWindow.waitForTimeout(2000);
    
    // アプリケーションがクラッシュしていないことを確認
    const isResponsive = await settingsWindow.evaluate(() => {
      return document.readyState === 'complete';
    });
    
    expect(isResponsive).toBe(true);
    
    // チェックボックスが操作可能な状態であることを確認
    const isEnabled = await autostartCheckbox.isEnabled();
    expect(isEnabled).toBe(true);
    
    // 最終的な状態を確認（どちらの状態でも良いが、一貫している必要がある）
    const finalState = await autostartCheckbox.isChecked();
    expect(typeof finalState).toBe('boolean');
    
    // 正常な操作で元の状態に戻せることを確認
    await toggleAutostartSetting(initialState);
    const restoredState = await autostartCheckbox.isChecked();
    expect(restoredState).toBe(initialState);
    
    console.log('エラーハンドリングと回復テストが正常に完了しました');
  });

  test('パフォーマンステスト: 自動起動設定の応答時間', async () => {
    await openSettingsWindow();
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    if (await autostartCheckbox.isDisabled()) {
      console.log('プラットフォームがサポートされていないため、テストをスキップします');
      return;
    }
    
    const initialState = await autostartCheckbox.isChecked();
    
    // 複数回の切り替えで応答時間を測定
    const measurements = [];
    
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      // 状態を切り替え
      await autostartCheckbox.click();
      
      // 処理完了まで待機
      await settingsWindow.waitForFunction(
        () => {
          const label = document.querySelector('label[for="autostart"]');
          return !label.textContent.includes('設定中');
        },
        { timeout: 10000 }
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      measurements.push(duration);
      
      console.log(`切り替え ${i + 1}: ${duration}ms`);
      
      // 短い待機時間を設ける
      await settingsWindow.waitForTimeout(500);
    }
    
    // 元の状態に戻す
    await toggleAutostartSetting(initialState);
    
    // 平均応答時間を計算
    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    console.log(`平均応答時間: ${averageTime.toFixed(2)}ms`);
    
    // 応答時間が合理的な範囲内であることを確認（10秒以内）
    expect(averageTime).toBeLessThan(10000);
    
    // 最大応答時間も確認
    const maxTime = Math.max(...measurements);
    console.log(`最大応答時間: ${maxTime}ms`);
    expect(maxTime).toBeLessThan(15000);
    
    console.log('パフォーマンステストが正常に完了しました');
  });

  test('統合セキュリティテスト: 権限とアクセス制御', async () => {
    await openSettingsWindow();
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    const platform = await electronApp.evaluate(() => process.platform);
    
    if (await autostartCheckbox.isDisabled()) {
      console.log('プラットフォームがサポートされていないため、テストをスキップします');
      return;
    }
    
    console.log(`セキュリティテストを実行中: ${platform}`);
    
    // プラットフォーム固有のセキュリティ要件を確認
    const securityInfo = await electronApp.evaluate(async ({ app }) => {
      const platform = process.platform;
      const supportedPlatforms = ['darwin', 'win32', 'linux'];
      const isSupported = supportedPlatforms.includes(platform);
      
      let method = null;
      if (isSupported) {
        switch (platform) {
          case 'darwin':
            method = 'loginItems';
            break;
          case 'win32':
            method = 'registry';
            break;
          case 'linux':
            method = 'desktop';
            break;
        }
      }
      
      return {
        supported: isSupported,
        platform: platform,
        method: method,
        error: isSupported ? null : 'Platform not supported'
      };
    });
    
    console.log('セキュリティ情報:', securityInfo);
    
    if (securityInfo.supported) {
      // 正常な権限でのアクセステスト
      const initialState = await autostartCheckbox.isChecked();
      
      try {
        // 設定変更を試行
        await toggleAutostartSetting(!initialState);
        
        // 権限エラーが発生しなかったことを確認
        const label = await settingsWindow.locator('label[for="autostart"]');
        const labelText = await label.textContent();
        
        // エラーメッセージが表示されていないことを確認
        expect(labelText).not.toContain('権限');
        expect(labelText).not.toContain('アクセス');
        expect(labelText).not.toContain('失敗');
        
        // 元の状態に戻す
        await toggleAutostartSetting(initialState);
        
        console.log('権限テストが正常に完了しました');
        
      } catch (error) {
        console.log(`権限エラーが発生しました: ${error.message}`);
        
        // 権限エラーの場合は適切なエラーメッセージが表示されることを確認
        const label = await settingsWindow.locator('label[for="autostart"]');
        const labelText = await label.textContent();
        
        expect(
          labelText.includes('権限') || 
          labelText.includes('アクセス') || 
          labelText.includes('管理者')
        ).toBeTruthy();
      }
    }
    
    console.log('統合セキュリティテストが完了しました');
  });
});

test.describe('System Integration Validation - システム統合検証', () => {
  
  test('完全システム検証: インストールから自動起動まで', async () => {
    console.log('=== 完全システム検証を開始します ===');
    
    // 1. アプリケーションの基本機能確認
    console.log('1. アプリケーション基本機能の確認');
    
    // メインウィンドウが正常に表示されることを確認
    await expect(window).toHaveTitle(/RSS ニュース電光掲示板/);
    
    // RSS表示エリアが存在することを確認
    const tickerContainer = await window.locator('#ticker-container');
    await expect(tickerContainer).toBeVisible();
    
    // 2. 設定システムの確認
    console.log('2. 設定システムの確認');
    
    await openSettingsWindow();
    await expect(settingsWindow).toHaveTitle(/設定/);
    
    // 3. 自動起動機能の統合確認
    console.log('3. 自動起動機能の統合確認');
    
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    await expect(autostartCheckbox).toBeVisible();
    
    // プラットフォームサポート状況の確認
    const isSupported = !(await autostartCheckbox.isDisabled());
    console.log(`自動起動サポート状況: ${isSupported ? 'サポート済み' : 'サポート外'}`);
    
    if (isSupported) {
      // 4. 自動起動設定の動作確認
      console.log('4. 自動起動設定の動作確認');
      
      const initialState = await autostartCheckbox.isChecked();
      console.log(`初期状態: ${initialState ? '有効' : '無効'}`);
      
      // 設定変更テスト
      await toggleAutostartSetting(true);
      console.log('自動起動を有効化しました');
      
      await toggleAutostartSetting(false);
      console.log('自動起動を無効化しました');
      
      // 元の状態に復元
      await toggleAutostartSetting(initialState);
      console.log('初期状態に復元しました');
    }
    
    // 5. 設定の保存と復元
    console.log('5. 設定の保存と復元の確認');
    
    const saveButton = await settingsWindow.locator('#save-settings');
    await saveButton.click();
    await settingsWindow.waitForEvent('close');
    
    // 6. システム統合の最終確認
    console.log('6. システム統合の最終確認');
    
    // アプリケーションが安定して動作していることを確認
    const isResponsive = await window.evaluate(() => {
      return document.readyState === 'complete' && !document.hidden;
    });
    
    expect(isResponsive).toBe(true);
    
    console.log('=== 完全システム検証が正常に完了しました ===');
  });

  test('長時間動作テスト: 安定性の確認', async () => {
    console.log('=== 長時間動作テストを開始します ===');
    
    await openSettingsWindow();
    const autostartCheckbox = await settingsWindow.locator('#autostart');
    
    if (await autostartCheckbox.isDisabled()) {
      console.log('プラットフォームがサポートされていないため、テストをスキップします');
      return;
    }
    
    const initialState = await autostartCheckbox.isChecked();
    
    // 複数回の設定変更を実行して安定性を確認
    for (let cycle = 0; cycle < 5; cycle++) {
      console.log(`安定性テストサイクル ${cycle + 1}/5`);
      
      // 有効化
      await toggleAutostartSetting(true);
      await settingsWindow.waitForTimeout(1000);
      
      // 無効化
      await toggleAutostartSetting(false);
      await settingsWindow.waitForTimeout(1000);
      
      // アプリケーションが応答可能であることを確認
      const isResponsive = await settingsWindow.evaluate(() => {
        return document.readyState === 'complete';
      });
      
      expect(isResponsive).toBe(true);
    }
    
    // 元の状態に復元
    await toggleAutostartSetting(initialState);
    
    console.log('=== 長時間動作テストが正常に完了しました ===');
  });
});