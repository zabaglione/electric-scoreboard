# 📰 RSS ニュース電光掲示板アプリ

RSSフィードから取得したニュースを電光掲示板風にスクロール表示するElectronデスクトップアプリケーション

## ✨ 主要機能

### 📡 RSS管理
- **10種類のプリセットフィード**: はてなブックマーク、GIGAZINE、Yahoo!ニュース、ITmediaなど
- **カスタムフィード追加**: 任意のRSSフィードを簡単に追加・削除
- **自動更新**: 設定可能な間隔でニュースを自動取得

### 🎨 表示カスタマイズ
- **8種類のテーマ**: ダーク、ライト、マトリックス、サイバーパンクなど
- **カスタム色設定**: テキスト、背景、ソース表示色を自由に変更
- **フォント調整**: サイズ（24-72px）とフォントファミリー選択

### ⚡ スクロール制御
- **直感的な速度設定**: ピクセル/秒単位（10-200px/s）
- **一時停止/再開**: いつでもスクロールを停止可能
- **動的計算**: テキスト長に応じて最適なスクロール時間を自動計算

### 🖱️ 操作性
- **右クリックメニュー**: 一時停止、更新、設定などの便利機能
- **キーボードショートカット**: 
  - `Cmd/Ctrl + Shift + P`: 一時停止/再開
  - `Cmd/Ctrl + Shift + S`: 設定画面
  - `Cmd/Ctrl + Shift + R`: 今すぐ更新
- **システムトレイ統合**: バックグラウンドでの動作をサポート
- **ログ制御**: デフォルトでコンソールメッセージ非表示、デバッグ時のみ出力

## 🚀 クイックスタート

### 必要環境
- Node.js 20.15.0+
- macOS (推奨)

### インストール & 実行

```bash
# リポジトリをクローン
git clone https://github.com/zabaglione/electric-scoreboard.git
cd electric-scoreboard

# 依存関係をインストール
npm install

# アプリを起動
npm start
```

### 開発モード

```bash
# 開発モード（詳細ログ付き）
npm run dev

# デバッグモード（コンソールログ出力）
npm run debug

# 直接起動時のオプション
electron . --debug        # デバッグログ有効
electron . -d             # デバッグログ有効（短縮形）

# テスト実行
npm test                    # 単体テスト
npm run test:integration    # 統合テスト
npm run test:all           # 全テスト
```

## 📊 テスト品質

- **単体テスト**: 43/43 PASSED (100% カバレッジ)
- **統合テスト**: Playwright使用、主要機能をEnd-to-Endテスト
- **テストフレームワーク**: Jest + Playwright

## 🔧 技術スタック

- **フレームワーク**: Electron 36.4.0
- **RSS解析**: rss-parser 3.13.0  
- **データ永続化**: electron-store 10.0.1
- **テスト**: Jest 29.7.0 + Playwright 1.52.0

## 📖 使用方法

### 基本操作
1. アプリ起動時、デフォルトの5つのフィードからニュースを自動取得
2. マウスホバーで一時停止・設定ボタンが表示
3. 設定画面でフィードの追加・削除、外観のカスタマイズが可能

### プリセットフィード
- はてなブックマーク（人気エントリー）
- ライブドアニュース  
- Yahoo!ニュース（IT・科学・国内・国際）
- GIGAZINE
- ITmedia（全記事・ニュース・PC USER）

### スクロール速度の目安
- **10px/s**: 非常にゆっくり（読書モード）
- **30px/s**: ゆっくり（快適読み）
- **50px/s**: 標準（デフォルト）
- **100px/s**: 速め（概要把握）
- **200px/s**: 高速（見出しのみ）

## 🛠️ 開発に参加

### プロジェクト構成
```
electric-scoreboard/
├── main.js              # Electronメインプロセス
├── renderer.js          # レンダラープロセス
├── index.html           # メイン画面UI
├── settings.html        # 設定画面UI
├── src/
│   ├── rss-manager.js   # RSS取得・管理
│   └── store-manager.js # 設定データ永続化
├── tests/
│   ├── unit/           # 単体テスト
│   └── integration/    # 統合テスト
└── CLAUDE.md          # 開発計画書
```

### 開発フロー
1. Issue作成 → ブランチ作成 → 実装 → テスト → PR
2. 全テストが通ることを確認してからマージ
3. 機能追加時は対応するテストも必須

## 📄 ライセンス

MIT License

## 🤖 開発履歴

このプロジェクトは [Claude Code](https://claude.ai/code) を使用して開発されました。

- **Phase 1-2**: プロジェクト基盤 + RSS機能実装
- **Phase 3**: UI実装（電光掲示板表示、設定画面）  
- **Phase 4**: 機能拡張（テーマ、ショートカット、システムトレイ）
- **Phase 5**: 品質保証（100%テストカバレッジ達成）

---

## 🔗 リンク

- [GitHub Repository](https://github.com/zabaglione/electric-scoreboard)
- [Issues](https://github.com/zabaglione/electric-scoreboard/issues)
- [Releases](https://github.com/zabaglione/electric-scoreboard/releases)

**Happy News Reading! 📰✨**