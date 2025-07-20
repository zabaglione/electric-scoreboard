const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const Logger = require('./logger');

/**
 * AutostartManager - クロスプラットフォーム自動起動管理クラス
 * Cross-platform autostart management for the RSS news ticker application
 */
class AutostartManager {
  constructor(loggerInstance = null) {
    this.platform = process.platform;
    this.appName = 'RSS ニュース電光掲示板';
    this.appPath = app.getPath('exe');
    this.logger = loggerInstance || new Logger(false);
  }

  /**
   * 現在のプラットフォームに応じた自動起動方式を取得
   * Get the autostart method for the current platform
   * @returns {string} Platform-specific autostart method
   */
  getPlatformMethod() {
    switch (this.platform) {
      case 'darwin':
        return 'loginItems';
      case 'win32':
        return 'registry';
      case 'linux':
        return 'desktop';
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * 自動起動が有効かどうかを確認
   * Check if autostart is currently enabled
   * @returns {Promise<boolean>} True if autostart is enabled
   */
  async isEnabled() {
    try {
      switch (this.platform) {
        case 'darwin':
        case 'win32':
          return this._checkElectronLoginItems();
        case 'linux':
          return await this._checkLinuxDesktopFile();
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      this.logger.error('Failed to check autostart status:', error);
      return false;
    }
  }

  /**
   * 自動起動を有効にする
   * Enable autostart for the current platform
   * @returns {Promise<void>}
   */
  async enable() {
    try {
      switch (this.platform) {
        case 'darwin':
        case 'win32':
          this._setElectronLoginItems(true);
          break;
        case 'linux':
          await this._createLinuxDesktopFile();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
      this.logger.debug('Autostart enabled successfully');
    } catch (error) {
      this.logger.error('Failed to enable autostart:', error);
      throw error;
    }
  }

  /**
   * 自動起動を無効にする
   * Disable autostart for the current platform
   * @returns {Promise<void>}
   */
  async disable() {
    try {
      switch (this.platform) {
        case 'darwin':
        case 'win32':
          this._setElectronLoginItems(false);
          break;
        case 'linux':
          await this._removeLinuxDesktopFile();
          break;
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
      this.logger.debug('Autostart disabled successfully');
    } catch (error) {
      this.logger.error('Failed to disable autostart:', error);
      throw error;
    }
  }

  /**
   * 自動起動の状態を切り替える
   * Toggle autostart state
   * @returns {Promise<boolean>} New autostart state
   */
  async toggle() {
    const currentState = await this.isEnabled();
    if (currentState) {
      await this.disable();
      return false;
    } else {
      await this.enable();
      return true;
    }
  }

  /**
   * Electron の app.setLoginItemSettings を使用して自動起動を確認
   * Check autostart status using Electron's login item settings
   * @returns {boolean} Current autostart state
   * @private
   */
  _checkElectronLoginItems() {
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.openAtLogin;
  }

  /**
   * Electron の app.setLoginItemSettings を使用して自動起動を設定
   * Set autostart using Electron's login item settings
   * @param {boolean} enabled - Enable or disable autostart
   * @private
   */
  _setElectronLoginItems(enabled) {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: enabled, // システム起動時は最小化状態で開始
      name: this.appName
    });
  }

  /**
   * Linux の .desktop ファイルの存在を確認
   * Check if Linux desktop file exists in autostart directory
   * @returns {Promise<boolean>} True if desktop file exists
   * @private
   */
  async _checkLinuxDesktopFile() {
    const desktopFilePath = this._getLinuxDesktopFilePath();
    try {
      await fs.access(desktopFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Linux 用の .desktop ファイルを作成
   * Create Linux desktop file for autostart
   * @returns {Promise<void>}
   * @private
   */
  async _createLinuxDesktopFile() {
    const desktopFilePath = this._getLinuxDesktopFilePath();
    const autostartDir = path.dirname(desktopFilePath);

    // autostart ディレクトリが存在しない場合は作成
    try {
      await fs.mkdir(autostartDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }

    const desktopFileContent = this._generateLinuxDesktopFileContent();
    await fs.writeFile(desktopFilePath, desktopFileContent, 'utf8');
  }

  /**
   * Linux の .desktop ファイルを削除
   * Remove Linux desktop file from autostart directory
   * @returns {Promise<void>}
   * @private
   */
  async _removeLinuxDesktopFile() {
    const desktopFilePath = this._getLinuxDesktopFilePath();
    try {
      await fs.unlink(desktopFilePath);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Linux の .desktop ファイルのパスを取得
   * Get the path for Linux desktop file
   * @returns {string} Desktop file path
   * @private
   */
  _getLinuxDesktopFilePath() {
    const homeDir = os.homedir();
    const fileName = 'rss-news-ticker.desktop';
    return path.join(homeDir, '.config', 'autostart', fileName);
  }

  /**
   * Linux の .desktop ファイルの内容を生成
   * Generate content for Linux desktop file
   * @returns {string} Desktop file content
   * @private
   */
  _generateLinuxDesktopFileContent() {
    return `[Desktop Entry]
Type=Application
Name=${this.appName}
Comment=RSS feed electric scoreboard display
Exec="${this.appPath}" --autostart
Icon=rss-news-ticker
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
StartupNotify=false
`;
  }
}

module.exports = AutostartManager;