const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/integration',
  testMatch: '**/*.spec.js',
  
  // テスト実行時の設定
  timeout: 30000, // 30秒
  retries: 1,
  workers: 1, // Electronアプリのため並列実行は無効
  
  // レポート設定
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }]
  ],
  
  // スクリーンショット設定
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure'
  },
  
  // 出力ディレクトリ
  outputDir: 'test-results/artifacts',
  
  // Electronアプリのための特別な設定
  projects: [
    {
      name: 'electron',
      testDir: './tests/integration',
      use: {
        // Electronアプリ用の設定
        launchOptions: {
          args: ['main.js']
        }
      }
    }
  ]
});