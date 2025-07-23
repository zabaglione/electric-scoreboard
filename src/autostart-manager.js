const { app } = require('electron');
const fs = require('fs').promises;
const fsConstants = require('fs').constants;
const path = require('path');
const os = require('os');
const Logger = require('./logger');

/**
 * AutostartError - 自動起動機能専用のエラークラス
 * Custom error class for autostart functionality
 */
class AutostartError extends Error {
  constructor(message, code = 'AUTOSTART_ERROR', details = {}) {
    super(message);
    this.name = 'AutostartError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AutostartError);
    }
  }

  /**
   * JSON形式でエラー情報を取得
   * Get error information in JSON format
   * @returns {Object} Error information
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * ユーザー向けのメッセージを取得
   * Get user-friendly error message
   * @returns {string} User-friendly message
   */
  getUserMessage() {
    // エラーコードに基づいてより分かりやすいメッセージを返す
    const userFriendlyMessages = {
      'PERMISSION_DENIED': 'システムの自動起動設定を変更する権限がありません。管理者権限で実行するか、システム設定を確認してください。',
      'UNSUPPORTED_PLATFORM': `お使いのオペレーティングシステム（${this.details.platform || 'unknown'}）では自動起動機能がサポートされていません。`,
      'ELECTRON_API_UNAVAILABLE': 'アプリケーションの自動起動機能が利用できません。アプリケーションを再起動してください。',
      'LINUX_DIR_CREATE_FAILED': 'Linux自動起動設定用のディレクトリを作成できませんでした。ホームディレクトリの権限を確認してください。',
      'LINUX_FILE_WRITE_FAILED': 'Linux自動起動設定ファイルの書き込みに失敗しました。ディスク容量と権限を確認してください。',
      'VERIFICATION_FAILED': '自動起動の設定は完了しましたが、正しく適用されているか確認できませんでした。',
      'STATUS_CHECK_FAILED': '自動起動の現在の状態を確認できませんでした。',
      'TOGGLE_FAILED': '自動起動設定の切り替えに失敗しました。',
      'PLATFORM_CHECK_FAILED': 'システム環境の確認中にエラーが発生しました。',
      'TEMPORARY_FAILURE': '一時的なエラーが発生しました。しばらく待ってから再度お試しください。',
      'ACCESS_DENIED': 'システム設定へのアクセスが拒否されました。管理者権限が必要な可能性があります。',
      'UNEXPECTED_ERROR': '予期しないエラーが発生しました。アプリケーションを再起動してください。',
      // 新しいプラットフォーム固有のエラーメッセージ
      'MACOS_LOGIN_ITEM_FAILED': 'macOSのログイン項目の設定に失敗しました。システム環境設定でプライバシー設定を確認してください。',
      'REGISTRY_ACCESS_FAILED': 'Windowsレジストリへのアクセスに失敗しました。管理者権限で実行するか、ウイルス対策ソフトの設定を確認してください。',
      'LINUX_DESKTOP_CHECK_FAILED': 'Linux自動起動ファイルの確認中にエラーが発生しました。ファイルシステムの権限を確認してください。',
      'LINUX_FILE_REMOVE_FAILED': 'Linux自動起動ファイルの削除に失敗しました。ファイルが使用中でないか確認してください。',
      'LINUX_PERMISSION_SET_FAILED': 'Linux自動起動ファイルの権限設定に失敗しましたが、機能に影響はありません。',
      'LINUX_UNEXPECTED_ERROR': 'Linux自動起動設定中に予期しないエラーが発生しました。システムログを確認してください。',
      'LOGIN_ITEM_CHECK_FAILED': 'システムの自動起動状態の確認に失敗しました。システムを再起動してから再度お試しください。',
      'LOGIN_ITEM_SET_FAILED': 'システムの自動起動設定に失敗しました。システム設定の権限を確認してください。',
      'DISK_FULL': 'ディスク容量が不足しています。空き容量を確保してから再度お試しください。',
      'FILE_IN_USE': 'ファイルが他のプロセスによって使用されています。しばらく待ってから再度お試しください。'
    };

    return userFriendlyMessages[this.code] || this.message;
  }

  /**
   * 詳細なエラーメッセージを取得
   * Get detailed error message with context
   * @returns {string} Detailed error message
   */
  getDetailedMessage() {
    const details = Object.keys(this.details).length > 0 ? 
      `\n詳細: ${JSON.stringify(this.details, null, 2)}` : '';
    
    return `${this.message} (コード: ${this.code})${details}`;
  }

  /**
   * 回復可能なエラーかどうかを判定
   * Check if the error is recoverable
   * @returns {boolean} True if error is recoverable
   */
  isRecoverable() {
    const recoverableErrors = [
      'PERMISSION_DENIED',
      'LINUX_DIR_CREATE_FAILED',
      'LINUX_FILE_WRITE_FAILED',
      'VERIFICATION_FAILED',
      'TEMPORARY_FAILURE'
    ];
    return recoverableErrors.includes(this.code);
  }

  /**
   * ユーザーアクションが必要なエラーかどうかを判定
   * Check if the error requires user action
   * @returns {boolean} True if user action is required
   */
  requiresUserAction() {
    const userActionErrors = [
      'PERMISSION_DENIED',
      'UNSUPPORTED_PLATFORM',
      'ACCESS_DENIED'
    ];
    return userActionErrors.includes(this.code);
  }
}

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
    this.lastError = null;
    
    // サポートされているプラットフォームのリスト
    this.supportedPlatforms = ['darwin', 'win32', 'linux'];
    
    // エラー統計の追跡
    this.errorStats = {
      totalErrors: 0,
      errorsByCode: {},
      lastErrorTime: null,
      recoveryAttempts: 0,
      successfulRecoveries: 0
    };
    
    this.logger.debug(`AutostartManager initialized for platform: ${this.platform}`);
    
    // Enhanced logging if available (defensive programming for tests)
    this._safeLog('logDebug', 'AutostartManager初期化完了', {
      platform: this.platform,
      platformDisplayName: this._getPlatformDisplayName(),
      supportedPlatforms: this.supportedPlatforms,
      appPath: this.appPath,
      appName: this.appName
    });
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
        this.logger.error(`Unsupported platform detected: ${this.platform}`);
        throw new AutostartError(
          `プラットフォーム「${this.platform}」では自動起動機能はサポートされていません`,
          'UNSUPPORTED_PLATFORM',
          { platform: this.platform }
        );
    }
  }

  /**
   * 最後に発生したエラーを取得
   * Get the last error that occurred
   * @returns {AutostartError|null} Last error or null if no error
   */
  getLastError() {
    return this.lastError;
  }

  /**
   * 包括的なエラーレポートを生成
   * Generate comprehensive error report for UI display
   * @param {AutostartError} error - The error to report
   * @returns {Promise<Object>} Comprehensive error report
   */
  async generateErrorReport(error) {
    const report = {
      error: {
        message: error.getUserMessage(),
        code: error.code,
        timestamp: error.timestamp,
        recoverable: error.isRecoverable(),
        userActionRequired: error.requiresUserAction(),
        details: error.details
      },
      platform: {
        name: this._getPlatformDisplayName(),
        code: this.platform,
        supported: this.supportedPlatforms.includes(this.platform),
        method: this.supportedPlatforms.includes(this.platform) ? this.getPlatformMethod() : null
      },
      statistics: this.getErrorStats(),
      systemInfo: null,
      recovery: null,
      guidance: null
    };

    try {
      // システム情報を収集
      report.systemInfo = await this._gatherSystemInfo();
      
      // 回復情報を生成
      if (error.isRecoverable()) {
        report.recovery = await this.attemptRecovery(error);
      }
      
      // ガイダンスを生成
      if (error.requiresUserAction()) {
        if (error.code === 'PERMISSION_DENIED') {
          report.guidance = await this._generatePermissionGuidance();
        } else if (error.code === 'UNSUPPORTED_PLATFORM') {
          report.guidance = await this.executeFallback();
        } else {
          report.guidance = this._generateGeneralGuidance(error);
        }
      }
      
      this._safeLog('logDebug', '包括的なエラーレポートを生成しました', {
        errorCode: error.code,
        hasSystemInfo: !!report.systemInfo,
        hasRecovery: !!report.recovery,
        hasGuidance: !!report.guidance,
        platform: this.platform
      });
      
    } catch (reportError) {
      this._safeLog('logError', 'エラーレポートの生成中にエラーが発生しました', {
        originalError: error.code,
        platform: this.platform,
        reportError: reportError.message
      });
      
      report.reportError = {
        message: 'エラーレポートの生成中に問題が発生しました',
        details: reportError.message
      };
    }

    return report;
  }

  /**
   * エラーをクリア
   * Clear the last error
   */
  clearError() {
    this.lastError = null;
  }

  /**
   * 拡張ログメソッドを安全に呼び出す
   * Safely call enhanced logging methods
   * @param {string} method - Logger method name
   * @param {string} message - Log message
   * @param {Object} context - Log context
   * @private
   */
  _safeLog(method, message, context = {}) {
    if (typeof this.logger[method] === 'function') {
      this.logger[method](message, context);
    } else {
      // Fallback to basic logging
      this.logger.debug(`[${method.toUpperCase()}] ${message}`, context);
    }
  }

  /**
   * エラー統計を記録
   * Record error statistics
   * @param {AutostartError} error - The error to record
   * @private
   */
  _recordErrorStats(error) {
    this.errorStats.totalErrors++;
    this.errorStats.lastErrorTime = new Date().toISOString();
    
    if (!this.errorStats.errorsByCode[error.code]) {
      this.errorStats.errorsByCode[error.code] = 0;
    }
    this.errorStats.errorsByCode[error.code]++;
    
    // Enhanced logging if available
    this._safeLog('logDebug', 'エラー統計を更新しました', {
      errorCode: error.code,
      totalErrors: this.errorStats.totalErrors,
      errorCount: this.errorStats.errorsByCode[error.code],
      isRecoverable: error.isRecoverable(),
      requiresUserAction: error.requiresUserAction()
    });
  }

  /**
   * 回復統計を記録
   * Record recovery statistics
   * @param {boolean} successful - Whether recovery was successful
   * @private
   */
  _recordRecoveryStats(successful) {
    this.errorStats.recoveryAttempts++;
    if (successful) {
      this.errorStats.successfulRecoveries++;
    }
    
    // Enhanced logging if available
    this._safeLog('logDebug', '回復統計を更新しました', {
      recoveryAttempts: this.errorStats.recoveryAttempts,
      successfulRecoveries: this.errorStats.successfulRecoveries,
      successRate: this.errorStats.recoveryAttempts > 0 ? 
        (this.errorStats.successfulRecoveries / this.errorStats.recoveryAttempts * 100).toFixed(1) + '%' : '0%'
    });
  }

  /**
   * エラー統計を取得
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      successRate: this.errorStats.recoveryAttempts > 0 ? 
        (this.errorStats.successfulRecoveries / this.errorStats.recoveryAttempts * 100).toFixed(1) + '%' : '0%',
      mostCommonError: Object.keys(this.errorStats.errorsByCode).reduce((a, b) => 
        this.errorStats.errorsByCode[a] > this.errorStats.errorsByCode[b] ? a : b, null)
    };
  }

  /**
   * プラットフォーム固有の実装が利用可能かどうかを確認
   * Check if platform-specific implementation is available
   * @returns {Promise<boolean>} True if platform implementation is available
   */
  async isPlatformSupported() {
    try {
      this.clearError();
      
      if (!this.supportedPlatforms.includes(this.platform)) {
        this.logger.error(`Platform ${this.platform} is not in supported platforms list`);
        this.lastError = new AutostartError(
          `プラットフォーム「${this.platform}」はサポートされていません。サポート対象: ${this.supportedPlatforms.join(', ')}`,
          'UNSUPPORTED_PLATFORM',
          { 
            platform: this.platform, 
            supportedPlatforms: this.supportedPlatforms,
            fallbackAvailable: this._hasFallbackSupport()
          }
        );
        return false;
      }

      switch (this.platform) {
        case 'darwin':
        case 'win32':
          // Electronのapp.setLoginItemSettingsが利用可能かチェック
          const hasLoginItemMethods = typeof app.setLoginItemSettings === 'function' && 
                                    typeof app.getLoginItemSettings === 'function';
          
          if (!hasLoginItemMethods) {
            this.logger.error('Electron login item methods are not available');
            this.lastError = new AutostartError(
              'システムの自動起動機能にアクセスできません',
              'ELECTRON_API_UNAVAILABLE',
              { platform: this.platform }
            );
            return false;
          }
          
          this.logger.debug(`Platform ${this.platform} is supported with Electron login items`);
          return true;
          
        case 'linux':
          // ホームディレクトリと.configディレクトリへのアクセス権限をチェック
          const homeDir = os.homedir();
          const configDir = path.join(homeDir, '.config');
          
          try {
            await fs.access(homeDir, fsConstants.W_OK);
            this.logger.debug('Home directory is writable');
            
            try {
              await fs.access(configDir, fsConstants.W_OK);
              this.logger.debug('Config directory is writable');
              return true;
            } catch (configError) {
              // .configディレクトリが存在しない場合は作成可能かチェック
              this.logger.debug('Config directory does not exist, checking if it can be created');
              try {
                await fs.access(homeDir, fsConstants.W_OK);
                this.logger.debug('Config directory can be created');
                return true;
              } catch (homeError) {
                this.logger.error('Cannot write to home directory:', homeError);
                this.lastError = new AutostartError(
                  'ホームディレクトリへの書き込み権限がありません',
                  'PERMISSION_DENIED',
                  { path: homeDir, error: homeError.message }
                );
                return false;
              }
            }
          } catch (error) {
            this.logger.error('Home directory access check failed:', error);
            this.lastError = new AutostartError(
              'ホームディレクトリにアクセスできません',
              'PERMISSION_DENIED',
              { path: homeDir, error: error.message }
            );
            return false;
          }
          
        default:
          this.logger.error(`Unexpected platform in support check: ${this.platform}`);
          return false;
      }
    } catch (error) {
      this.logger.error('Platform support check failed with unexpected error:', error);
      this.lastError = new AutostartError(
        'プラットフォームサポートの確認中にエラーが発生しました',
        'PLATFORM_CHECK_FAILED',
        { platform: this.platform, error: error.message }
      );
      return false;
    }
  }

  /**
   * 自動起動が有効かどうかを確認
   * Check if autostart is currently enabled
   * @returns {Promise<boolean>} True if autostart is enabled
   */
  async isEnabled() {
    try {
      this.clearError();
      
      // プラットフォームサポートを事前確認
      const isSupported = await this.isPlatformSupported();
      if (!isSupported) {
        this.logger.error('Platform is not supported for autostart check');
        return false;
      }

      switch (this.platform) {
        case 'darwin':
        case 'win32':
          return this._checkElectronLoginItems();
        case 'linux':
          return await this._checkLinuxDesktopFile();
        default:
          // この時点では到達しないはずだが、安全のため
          this.logger.error(`Unexpected platform in isEnabled: ${this.platform}`);
          this.lastError = new AutostartError(
            `プラットフォーム「${this.platform}」では自動起動状態を確認できません`,
            'UNSUPPORTED_PLATFORM',
            { platform: this.platform }
          );
          return false;
      }
    } catch (error) {
      this.logger.error('Failed to check autostart status:', error);
      this.lastError = new AutostartError(
        '自動起動状態の確認中にエラーが発生しました',
        'STATUS_CHECK_FAILED',
        { platform: this.platform, error: error.message }
      );
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
      this.clearError();
      
      // プラットフォームサポートを事前確認
      const isSupported = await this.isPlatformSupported();
      if (!isSupported) {
        const error = this.lastError || new AutostartError(
          'このプラットフォームでは自動起動機能はサポートされていません',
          'UNSUPPORTED_PLATFORM',
          { platform: this.platform }
        );
        this.logger.error('Cannot enable autostart: platform not supported');
        throw error;
      }

      this.logger.debug(`Attempting to enable autostart on ${this.platform}`);

      switch (this.platform) {
        case 'darwin':
        case 'win32':
          await this._setElectronLoginItems(true);
          break;
        case 'linux':
          await this._createLinuxDesktopFile();
          break;
        default:
          // この時点では到達しないはずだが、安全のため
          const error = new AutostartError(
            `プラットフォーム「${this.platform}」では自動起動を有効にできません`,
            'UNSUPPORTED_PLATFORM',
            { platform: this.platform }
          );
          this.lastError = error;
          throw error;
      }
      
      this.logger.debug('Autostart enabled successfully');
      
      // 設定が正しく適用されたかを確認
      const verificationResult = await this._verifyAutostartSetting(true);
      if (!verificationResult) {
        this.logger.warn('Autostart enable verification failed');
        const error = new AutostartError(
          '自動起動の設定は完了しましたが、正しく適用されていない可能性があります',
          'VERIFICATION_FAILED',
          { platform: this.platform, expectedState: true }
        );
        this.lastError = error;
        // 警告レベルのエラーなので例外は投げない
      }
      
    } catch (error) {
      this._safeLog('logError', 'Failed to enable autostart', error, {
        platform: this.platform,
        operation: 'enable',
        appPath: this.appPath
      });
      
      if (error instanceof AutostartError) {
        this.lastError = error;
        this._recordErrorStats(error);
        
        // エラー回復を試行
        try {
          const recoveryResult = await this.attemptRecovery(error);
          this._recordRecoveryStats(recoveryResult.success);
          
          if (recoveryResult.success) {
            this._safeLog('logDebug', '自動起動有効化のエラー回復が成功しました', {
              errorCode: error.code,
              recoveryAction: recoveryResult.action,
              recoveryMessage: recoveryResult.message
            });
          } else {
            this._safeLog('logWarning', '自動起動有効化のエラー回復が失敗しました', {
              errorCode: error.code,
              recoveryAction: recoveryResult.action,
              userActionRequired: recoveryResult.userActionRequired,
              fallbackAvailable: recoveryResult.fallbackAvailable
            });
          }
        } catch (recoveryError) {
          this._recordRecoveryStats(false);
          this._safeLog('logError', '自動起動有効化の回復処理中にエラーが発生しました', recoveryError, {
            originalError: error.code,
            platform: this.platform
          });
        }
        
        throw error;
      }
      
      // 予期しないエラーをラップ
      const wrappedError = new AutostartError(
        '自動起動の有効化中に予期しないエラーが発生しました',
        'UNEXPECTED_ERROR',
        { platform: this.platform, originalError: error.message }
      );
      this.lastError = wrappedError;
      throw wrappedError;
    }
  }

  /**
   * 自動起動を無効にする
   * Disable autostart for the current platform
   * @returns {Promise<void>}
   */
  async disable() {
    try {
      this.clearError();
      
      // プラットフォームサポートを事前確認
      const isSupported = await this.isPlatformSupported();
      if (!isSupported) {
        const error = this.lastError || new AutostartError(
          'このプラットフォームでは自動起動機能はサポートされていません',
          'UNSUPPORTED_PLATFORM',
          { platform: this.platform }
        );
        this.logger.error('Cannot disable autostart: platform not supported');
        throw error;
      }

      this.logger.debug(`Attempting to disable autostart on ${this.platform}`);

      switch (this.platform) {
        case 'darwin':
        case 'win32':
          await this._setElectronLoginItems(false);
          break;
        case 'linux':
          await this._removeLinuxDesktopFile();
          break;
        default:
          // この時点では到達しないはずだが、安全のため
          const error = new AutostartError(
            `プラットフォーム「${this.platform}」では自動起動を無効にできません`,
            'UNSUPPORTED_PLATFORM',
            { platform: this.platform }
          );
          this.lastError = error;
          throw error;
      }
      
      this.logger.debug('Autostart disabled successfully');
      
      // 設定が正しく適用されたかを確認
      const verificationResult = await this._verifyAutostartSetting(false);
      if (!verificationResult) {
        this.logger.warn('Autostart disable verification failed');
        const error = new AutostartError(
          '自動起動の無効化は完了しましたが、正しく適用されていない可能性があります',
          'VERIFICATION_FAILED',
          { platform: this.platform, expectedState: false }
        );
        this.lastError = error;
        // 警告レベルのエラーなので例外は投げない
      }
      
    } catch (error) {
      this._safeLog('logError', 'Failed to disable autostart', error, {
        platform: this.platform,
        operation: 'disable',
        appPath: this.appPath
      });
      
      if (error instanceof AutostartError) {
        this.lastError = error;
        this._recordErrorStats(error);
        
        // エラー回復を試行
        try {
          const recoveryResult = await this.attemptRecovery(error);
          this._recordRecoveryStats(recoveryResult.success);
          
          if (recoveryResult.success) {
            this._safeLog('logDebug', '自動起動無効化のエラー回復が成功しました', {
              errorCode: error.code,
              recoveryAction: recoveryResult.action,
              recoveryMessage: recoveryResult.message
            });
          } else {
            this._safeLog('logWarning', '自動起動無効化のエラー回復が失敗しました', {
              errorCode: error.code,
              recoveryAction: recoveryResult.action,
              userActionRequired: recoveryResult.userActionRequired,
              fallbackAvailable: recoveryResult.fallbackAvailable
            });
          }
        } catch (recoveryError) {
          this._recordRecoveryStats(false);
          this._safeLog('logError', '自動起動無効化の回復処理中にエラーが発生しました', recoveryError, {
            originalError: error.code,
            platform: this.platform
          });
        }
        
        throw error;
      }
      
      // 予期しないエラーをラップ
      const wrappedError = new AutostartError(
        '自動起動の無効化中に予期しないエラーが発生しました',
        'UNEXPECTED_ERROR',
        { platform: this.platform, originalError: error.message }
      );
      this.lastError = wrappedError;
      throw wrappedError;
    }
  }

  /**
   * 自動起動の状態を切り替える
   * Toggle autostart state
   * @returns {Promise<boolean>} New autostart state
   */
  async toggle() {
    try {
      this.clearError();
      this.logger.debug('Toggling autostart state');
      
      const currentState = await this.isEnabled();
      this.logger.debug(`Current autostart state: ${currentState}`);
      
      if (currentState) {
        await this.disable();
        this.logger.debug('Autostart toggled to disabled');
        return false;
      } else {
        await this.enable();
        this.logger.debug('Autostart toggled to enabled');
        return true;
      }
    } catch (error) {
      this._safeLog('logError', 'Failed to toggle autostart', error, { 
        platform: this.platform,
        operation: 'toggle'
      });
      
      if (error instanceof AutostartError) {
        this.lastError = error;
        throw error;
      }
      
      // 予期しないエラーをラップ
      const wrappedError = new AutostartError(
        '自動起動の切り替え中にエラーが発生しました',
        'TOGGLE_FAILED',
        { platform: this.platform, originalError: error.message }
      );
      this.lastError = wrappedError;
      throw wrappedError;
    }
  }

  /**
   * フォールバック機能のサポート状況を確認
   * Check if fallback functionality is available
   * @returns {boolean} True if fallback is available
   * @private
   */
  _hasFallbackSupport() {
    // サポートされていないプラットフォームでも手動設定ガイドを提供
    const fallbackSupportedPlatforms = [
      'freebsd', 'openbsd', 'netbsd', // BSD系
      'aix', 'sunos', // Unix系
      'android' // Android (将来的な対応)
    ];
    
    return fallbackSupportedPlatforms.includes(this.platform) || 
           !this.supportedPlatforms.includes(this.platform);
  }

  /**
   * フォールバック動作を実行
   * Execute fallback behavior for unsupported platforms
   * @returns {Promise<Object>} Fallback information
   */
  async executeFallback() {
    this._safeLog('logWarning', 'サポートされていないプラットフォームでフォールバック動作を実行します', {
      platform: this.platform,
      supportedPlatforms: this.supportedPlatforms,
      fallbackAvailable: this._hasFallbackSupport()
    });

    const fallbackInfo = {
      platform: this.platform,
      platformDisplayName: this._getPlatformDisplayName(),
      supported: false,
      fallbackType: 'manual_instructions',
      instructions: this._generateManualInstructions(),
      alternativeOptions: this._generateAlternativeOptions(),
      troubleshooting: this._generateTroubleshootingSteps(),
      timestamp: new Date().toISOString(),
      userMessage: `${this._getPlatformDisplayName()}では自動起動機能がサポートされていませんが、手動で設定することができます。`
    };

    // プラットフォーム固有の追加情報を生成
    try {
      fallbackInfo.systemInfo = await this._gatherSystemInfo();
    } catch (error) {
      this._safeLog('logWarning', 'システム情報の収集に失敗しました', { error: error.message });
      fallbackInfo.systemInfo = { error: 'システム情報を取得できませんでした' };
    }

    this._safeLog('logDebug', 'フォールバック情報を生成しました', {
      platform: fallbackInfo.platform,
      instructionSteps: fallbackInfo.instructions.steps?.length || 0,
      alternativeCount: fallbackInfo.alternativeOptions?.length || 0
    });
    
    return fallbackInfo;
  }

  /**
   * 手動設定の手順を生成
   * Generate manual setup instructions
   * @returns {Object} Manual setup instructions
   * @private
   */
  _generateManualInstructions() {
    const appPath = this.appPath;
    const appName = this.appName;

    switch (this.platform) {
      case 'freebsd':
      case 'openbsd':
      case 'netbsd':
        return {
          title: 'BSD系システムでの手動設定',
          steps: [
            'システムの起動スクリプトディレクトリを確認してください',
            `アプリケーションパス: ${appPath}`,
            'システム管理者に自動起動の設定を依頼してください',
            'または、シェルの設定ファイル（.bashrc, .zshrc等）に起動コマンドを追加してください'
          ],
          note: 'BSD系システムでは、システム固有の設定が必要な場合があります',
          commands: [
            `echo '${appPath} &' >> ~/.bashrc`,
            `echo '${appPath} &' >> ~/.zshrc`
          ]
        };

      case 'aix':
      case 'sunos':
        return {
          title: 'Unix系システムでの手動設定',
          steps: [
            'システムの自動起動メカニズムを確認してください',
            `アプリケーションパス: ${appPath}`,
            'init.d または systemd を使用して自動起動を設定してください',
            'システム管理者権限が必要な場合があります'
          ],
          note: 'Unix系システムでは、管理者権限での設定が必要です',
          commands: [
            'systemctl --user enable rss-news-ticker.service',
            'sudo systemctl enable rss-news-ticker.service'
          ]
        };

      default:
        return {
          title: `${this.platform} での手動設定`,
          steps: [
            'お使いのオペレーティングシステムの自動起動設定を確認してください',
            `アプリケーション名: ${appName}`,
            `アプリケーションパス: ${appPath}`,
            'システムの設定画面から自動起動プログラムに追加してください',
            'デスクトップ環境の自動起動設定を利用してください'
          ],
          note: 'このプラットフォームでは自動設定がサポートされていません',
          commands: [],
          alternatives: [
            'デスクトップ環境の自動起動設定を使用',
            'シェルの設定ファイルに起動コマンドを追加',
            'システムのサービス管理機能を利用'
          ]
        };
    }
  }

  /**
   * 代替オプションを生成
   * Generate alternative options for unsupported platforms
   * @returns {Array} Alternative options
   * @private
   */
  _generateAlternativeOptions() {
    const alternatives = [];

    switch (this.platform) {
      case 'freebsd':
      case 'openbsd':
      case 'netbsd':
        alternatives.push(
          {
            method: 'shell_profile',
            title: 'シェル設定ファイルを使用',
            description: '.bashrc や .zshrc にアプリケーション起動コマンドを追加',
            difficulty: 'easy',
            reliability: 'medium'
          },
          {
            method: 'cron',
            title: 'cron の @reboot を使用',
            description: 'crontab に @reboot エントリを追加してシステム起動時に実行',
            difficulty: 'medium',
            reliability: 'high'
          },
          {
            method: 'rc_local',
            title: '/etc/rc.local を使用',
            description: 'システムの起動スクリプトに追加（管理者権限必要）',
            difficulty: 'hard',
            reliability: 'high'
          }
        );
        break;

      case 'aix':
      case 'sunos':
        alternatives.push(
          {
            method: 'init_script',
            title: 'init スクリプトを作成',
            description: '/etc/init.d にスクリプトを作成して自動起動を設定',
            difficulty: 'hard',
            reliability: 'high'
          },
          {
            method: 'systemd',
            title: 'systemd サービスを作成',
            description: 'systemd ユニットファイルを作成してサービスとして登録',
            difficulty: 'medium',
            reliability: 'high'
          }
        );
        break;

      default:
        alternatives.push(
          {
            method: 'desktop_environment',
            title: 'デスクトップ環境の設定',
            description: 'お使いのデスクトップ環境の自動起動設定を利用',
            difficulty: 'easy',
            reliability: 'medium'
          },
          {
            method: 'manual_startup',
            title: '手動起動',
            description: 'システム起動後に手動でアプリケーションを起動',
            difficulty: 'easy',
            reliability: 'low'
          }
        );
        break;
    }

    return alternatives;
  }

  /**
   * トラブルシューティング手順を生成
   * Generate troubleshooting steps
   * @returns {Array} Troubleshooting steps
   * @private
   */
  _generateTroubleshootingSteps() {
    const steps = [
      {
        step: 1,
        title: 'アプリケーションの再起動',
        description: 'アプリケーションを完全に終了してから再起動してください',
        command: null
      },
      {
        step: 2,
        title: 'システムの再起動',
        description: 'システムを再起動してから再度お試しください',
        command: null
      },
      {
        step: 3,
        title: '権限の確認',
        description: 'アプリケーションに必要な権限が付与されているか確認してください',
        command: null
      },
      {
        step: 4,
        title: 'ウイルス対策ソフトの確認',
        description: 'ウイルス対策ソフトがアプリケーションをブロックしていないか確認してください',
        command: null
      }
    ];

    // プラットフォーム固有のトラブルシューティング手順を追加
    switch (this.platform) {
      case 'darwin':
        steps.push({
          step: 5,
          title: 'macOS セキュリティ設定の確認',
          description: 'システム環境設定 > セキュリティとプライバシー でアプリケーションの権限を確認',
          command: 'open /System/Library/PreferencePanes/Security.prefPane'
        });
        break;

      case 'win32':
        steps.push({
          step: 5,
          title: 'Windows レジストリの確認',
          description: 'レジストリエディタでスタートアップエントリを手動で確認',
          command: 'regedit'
        });
        break;

      case 'linux':
        steps.push({
          step: 5,
          title: 'Linux 権限の確認',
          description: 'ホームディレクトリと .config ディレクトリの権限を確認',
          command: 'ls -la ~/.config/autostart/'
        });
        break;
    }

    return steps;
  }

  /**
   * エラー回復を試行
   * Attempt error recovery
   * @param {AutostartError} error - The error to recover from
   * @returns {Promise<Object>} Recovery result
   */
  async attemptRecovery(error) {
    this._safeLog('logWarning', '自動起動エラーの回復処理を開始します', {
      errorCode: error.code,
      platform: this.platform,
      errorMessage: error.message,
      isRecoverable: error.isRecoverable(),
      requiresUserAction: error.requiresUserAction()
    });

    const recoveryResult = {
      success: false,
      action: null,
      message: null,
      fallbackAvailable: false,
      userActionRequired: error.requiresUserAction(),
      recoverable: error.isRecoverable()
    };

    try {
      switch (error.code) {
        case 'PERMISSION_DENIED':
          recoveryResult.action = 'permission_guidance';
          recoveryResult.message = await this._generatePermissionGuidance();
          recoveryResult.fallbackAvailable = true;
          this._safeLog('logDebug', '権限エラーの回復ガイダンスを生成しました');
          break;

        case 'UNSUPPORTED_PLATFORM':
          recoveryResult.action = 'fallback_instructions';
          recoveryResult.message = await this.executeFallback();
          recoveryResult.fallbackAvailable = true;
          this._safeLog('logDebug', 'サポート外プラットフォームのフォールバック手順を生成しました');
          break;

        case 'LINUX_DIR_CREATE_FAILED':
        case 'LINUX_FILE_WRITE_FAILED':
          recoveryResult.action = 'linux_recovery';
          recoveryResult.message = await this._attemptLinuxRecovery();
          recoveryResult.success = recoveryResult.message.successful.length > 0;
          this._safeLog('logDebug', 'Linux固有の回復処理を実行しました', {
            successful: recoveryResult.message.successful,
            failed: recoveryResult.message.failed
          });
          break;

        case 'VERIFICATION_FAILED':
          recoveryResult.action = 'verification_retry';
          recoveryResult.message = await this._retryVerification();
          recoveryResult.success = recoveryResult.message.success;
          this._safeLog('logDebug', '設定検証の再試行を実行しました', {
            attempts: recoveryResult.message.attempts,
            success: recoveryResult.message.success
          });
          break;

        case 'TEMPORARY_FAILURE':
          recoveryResult.action = 'retry_operation';
          recoveryResult.message = await this._retryWithBackoff(error);
          recoveryResult.success = recoveryResult.message.success;
          this._safeLog('logDebug', '一時的な障害の再試行を実行しました');
          break;

        default:
          recoveryResult.action = 'general_guidance';
          recoveryResult.message = this._generateGeneralGuidance(error);
          this._safeLog('logDebug', '一般的なトラブルシューティングガイダンスを生成しました');
          break;
      }

      this._safeLog('logDebug', 'エラー回復処理が完了しました', {
        action: recoveryResult.action,
        success: recoveryResult.success,
        fallbackAvailable: recoveryResult.fallbackAvailable
      });
      
    } catch (recoveryError) {
      this._safeLog('logError', 'エラー回復処理中に予期しないエラーが発生しました', recoveryError, {
        originalError: error.code,
        platform: this.platform,
        recoveryAction: recoveryResult.action
      });
      
      recoveryResult.message = {
        error: '回復処理中にエラーが発生しました',
        details: recoveryError.message,
        suggestion: 'アプリケーションを再起動してから再度お試しください'
      };
    }

    return recoveryResult;
  }

  /**
   * 権限に関するガイダンスを生成
   * Generate permission guidance
   * @returns {Promise<Object>} Permission guidance
   * @private
   */
  async _generatePermissionGuidance() {
    const guidance = {
      title: '権限エラーの解決方法',
      platform: this.platform,
      platformName: this._getPlatformDisplayName(),
      description: '自動起動の設定に必要な権限が不足しています。以下の手順で解決できる可能性があります。',
      solutions: [],
      technicalInfo: {
        errorType: 'PERMISSION_DENIED',
        appPath: this.appPath,
        timestamp: new Date().toISOString()
      }
    };

    switch (this.platform) {
      case 'darwin':
        guidance.solutions = [
          {
            step: 1,
            title: 'システム環境設定を開く',
            description: 'Appleメニュー > システム環境設定 を選択してください',
            command: null
          },
          {
            step: 2,
            title: 'セキュリティとプライバシーを開く',
            description: 'セキュリティとプライバシー > プライバシー タブを選択してください',
            command: null
          },
          {
            step: 3,
            title: 'アプリケーション権限を設定',
            description: '「フルディスクアクセス」または「自動化」の項目で本アプリケーションを許可してください',
            command: null
          },
          {
            step: 4,
            title: 'アプリケーションを再起動',
            description: '設定変更後、アプリケーションを完全に終了してから再起動してください',
            command: null
          }
        ];
        guidance.additionalInfo = 'macOS Catalinaまたはそれ以降では、アプリケーションの自動起動設定にシステム権限が必要です。';
        break;

      case 'win32':
        guidance.solutions = [
          {
            step: 1,
            title: '管理者として実行',
            description: 'アプリケーションを右クリックして「管理者として実行」を選択してください',
            command: null
          },
          {
            step: 2,
            title: 'ウイルス対策ソフトの確認',
            description: 'Windows Defenderやウイルス対策ソフトがアプリケーションをブロックしていないか確認してください',
            command: null
          },
          {
            step: 3,
            title: 'レジストリアクセス権限の確認',
            description: 'レジストリエディタ(regedit)でHKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Runへのアクセス権限を確認してください',
            command: 'regedit'
          },
          {
            step: 4,
            title: 'ユーザーアカウント制御の設定',
            description: 'コントロールパネル > ユーザーアカウント > ユーザーアカウント制御設定の変更 で設定を確認してください',
            command: null
          }
        ];
        guidance.additionalInfo = 'Windowsでは自動起動の設定にレジストリへの書き込み権限が必要です。';
        break;

      case 'linux':
        guidance.solutions = [
          {
            step: 1,
            title: 'ホームディレクトリの権限確認',
            description: 'ホームディレクトリへの書き込み権限があることを確認してください',
            command: 'ls -la ~/'
          },
          {
            step: 2,
            title: '.configディレクトリの確認',
            description: '.configディレクトリが存在し、書き込み権限があることを確認してください',
            command: 'ls -la ~/.config/'
          },
          {
            step: 3,
            title: '権限の修正',
            description: '必要に応じて.configディレクトリの権限を修正してください',
            command: 'chmod 755 ~/.config && chmod 755 ~/.config/autostart'
          },
          {
            step: 4,
            title: 'autostartディレクトリの作成',
            description: 'autostartディレクトリが存在しない場合は手動で作成してください',
            command: 'mkdir -p ~/.config/autostart'
          }
        ];
        guidance.additionalInfo = 'Linuxでは~/.config/autostartディレクトリに.desktopファイルを作成して自動起動を設定します。';
        break;

      default:
        guidance.solutions = [
          {
            step: 1,
            title: 'システム権限の確認',
            description: 'アプリケーションに必要なシステム権限が付与されているか確認してください',
            command: null
          },
          {
            step: 2,
            title: '管理者権限での実行',
            description: 'アプリケーションを管理者権限で実行してみてください',
            command: null
          },
          {
            step: 3,
            title: 'システム管理者への相談',
            description: '問題が解決しない場合は、システム管理者にお問い合わせください',
            command: null
          }
        ];
        guidance.additionalInfo = `プラットフォーム「${this.platform}」での自動起動設定には特別な権限が必要な場合があります。`;
        break;
    }

    this._safeLog('logDebug', '権限ガイダンスを生成しました', {
      platform: this.platform,
      solutionCount: guidance.solutions.length
    });

    return guidance;
  }

  /**
   * Linux固有の回復処理を試行
   * Attempt Linux-specific recovery
   * @returns {Promise<Object>} Recovery result
   * @private
   */
  async _attemptLinuxRecovery() {
    const recovery = {
      attempted: [],
      successful: [],
      failed: [],
      diagnostics: {
        homeDir: os.homedir(),
        configDir: null,
        autostartDir: null,
        permissions: {}
      }
    };

    this._safeLog('logDebug', 'Linux固有の回復処理を開始します', {
      homeDir: recovery.diagnostics.homeDir
    });

    try {
      const homeDir = recovery.diagnostics.homeDir;
      const configDir = path.join(homeDir, '.config');
      const autostartDir = path.join(configDir, 'autostart');
      
      recovery.diagnostics.configDir = configDir;
      recovery.diagnostics.autostartDir = autostartDir;

      // ホームディレクトリの権限確認
      recovery.attempted.push('home_directory_check');
      try {
        const homeStats = await fs.stat(homeDir);
        recovery.diagnostics.permissions.home = {
          mode: homeStats.mode.toString(8),
          uid: homeStats.uid,
          gid: homeStats.gid
        };
        
        await fs.access(homeDir, fsConstants.W_OK);
        recovery.successful.push('home_directory_writable');
        this._safeLog('logDebug', 'ホームディレクトリへの書き込み権限を確認しました', {
          path: homeDir,
          permissions: recovery.diagnostics.permissions.home
        });
      } catch (error) {
        recovery.failed.push({
          action: 'home_directory_check',
          error: error.message,
          code: error.code
        });
        this._safeLog('logWarning', 'ホームディレクトリの権限確認に失敗しました', {
          path: homeDir,
          error: error.message
        });
      }

      // .configディレクトリの作成を試行
      recovery.attempted.push('config_directory_creation');
      try {
        await fs.mkdir(configDir, { recursive: true });
        
        // 作成後の権限確認
        const configStats = await fs.stat(configDir);
        recovery.diagnostics.permissions.config = {
          mode: configStats.mode.toString(8),
          uid: configStats.uid,
          gid: configStats.gid
        };
        
        recovery.successful.push('config_directory_created');
        this._safeLog('logDebug', '.configディレクトリを作成しました', {
          path: configDir,
          permissions: recovery.diagnostics.permissions.config
        });
      } catch (error) {
        recovery.failed.push({
          action: 'config_directory_creation',
          error: error.message,
          code: error.code
        });
        this._safeLog('logWarning', '.configディレクトリの作成に失敗しました', {
          path: configDir,
          error: error.message
        });
      }

      // autostartディレクトリの作成を試行
      recovery.attempted.push('autostart_directory_creation');
      try {
        await fs.mkdir(autostartDir, { recursive: true });
        
        // 作成後の権限確認
        const autostartStats = await fs.stat(autostartDir);
        recovery.diagnostics.permissions.autostart = {
          mode: autostartStats.mode.toString(8),
          uid: autostartStats.uid,
          gid: autostartStats.gid
        };
        
        recovery.successful.push('autostart_directory_created');
        this._safeLog('logDebug', 'autostartディレクトリを作成しました', {
          path: autostartDir,
          permissions: recovery.diagnostics.permissions.autostart
        });
      } catch (error) {
        recovery.failed.push({
          action: 'autostart_directory_creation',
          error: error.message,
          code: error.code
        });
        this._safeLog('logWarning', 'autostartディレクトリの作成に失敗しました', {
          path: autostartDir,
          error: error.message
        });
      }

      // 権限修正の試行（必要に応じて）
      if (recovery.successful.includes('autostart_directory_created')) {
        recovery.attempted.push('permission_fix');
        try {
          // 適切な権限を設定（755 = rwxr-xr-x）
          await fs.chmod(autostartDir, 0o755);
          recovery.successful.push('permissions_fixed');
          this._safeLog('logDebug', 'autostartディレクトリの権限を修正しました', {
            path: autostartDir,
            newMode: '755'
          });
        } catch (error) {
          recovery.failed.push({
            action: 'permission_fix',
            error: error.message,
            code: error.code
          });
          this._safeLog('logWarning', '権限修正に失敗しましたが、動作に影響しない可能性があります', {
            path: autostartDir,
            error: error.message
          });
        }
      }

      // テスト用ファイルの作成・削除で書き込み権限を確認
      if (recovery.successful.includes('autostart_directory_created')) {
        recovery.attempted.push('write_test');
        const testFilePath = path.join(autostartDir, '.test-write-permission');
        try {
          await fs.writeFile(testFilePath, 'test', 'utf8');
          await fs.unlink(testFilePath);
          recovery.successful.push('write_test_passed');
          this._safeLog('logDebug', 'autostartディレクトリへの書き込みテストが成功しました');
        } catch (error) {
          recovery.failed.push({
            action: 'write_test',
            error: error.message,
            code: error.code
          });
          this._safeLog('logWarning', 'autostartディレクトリへの書き込みテストに失敗しました', {
            testFile: testFilePath,
            error: error.message
          });
        }
      }

    } catch (error) {
      recovery.failed.push({
        action: 'linux_recovery_general',
        error: error.message,
        code: error.code
      });
      this._safeLog('logError', 'Linux回復処理中に予期しないエラーが発生しました', error);
    }

    const recoveryResult = {
      ...recovery,
      summary: {
        totalAttempted: recovery.attempted.length,
        totalSuccessful: recovery.successful.length,
        totalFailed: recovery.failed.length,
        overallSuccess: recovery.successful.length > 0 && recovery.failed.length === 0
      }
    };

    this._safeLog('logDebug', 'Linux固有の回復処理が完了しました', recoveryResult.summary);

    return recoveryResult;
  }

  /**
   * 検証の再試行
   * Retry verification
   * @returns {Promise<Object>} Verification result
   * @private
   */
  async _retryVerification() {
    const retryResult = {
      attempts: 0,
      maxAttempts: 3,
      success: false,
      finalState: null,
      errors: []
    };

    this._safeLog('logDebug', '自動起動設定の検証を再試行します', {
      maxAttempts: retryResult.maxAttempts
    });

    for (let i = 0; i < retryResult.maxAttempts; i++) {
      retryResult.attempts++;
      
      try {
        // 指数バックオフで待機時間を増加
        const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
        this._safeLog('logDebug', `検証再試行 ${i + 1}/${retryResult.maxAttempts} - ${waitTime}ms待機中`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        const currentState = await this.isEnabled();
        retryResult.finalState = currentState;
        
        this._safeLog('logDebug', `検証再試行 ${i + 1}/${retryResult.maxAttempts}の結果`, {
          attempt: i + 1,
          state: currentState,
          stateType: typeof currentState
        });
        
        // 状態が安定していれば成功とみなす
        if (typeof currentState === 'boolean') {
          retryResult.success = true;
          this._safeLog('logDebug', '検証再試行が成功しました', {
            finalAttempt: i + 1,
            finalState: currentState
          });
          break;
        }
        
      } catch (error) {
        const errorInfo = {
          attempt: i + 1,
          error: error.message,
          errorCode: error.code || 'UNKNOWN'
        };
        
        retryResult.errors.push(errorInfo);
        this._safeLog('logWarning', `検証再試行 ${i + 1}/${retryResult.maxAttempts}が失敗しました`, errorInfo);
      }
    }

    if (!retryResult.success) {
      this._safeLog('logWarning', 'すべての検証再試行が失敗しました', {
        totalAttempts: retryResult.attempts,
        errors: retryResult.errors
      });
    }

    return retryResult;
  }

  /**
   * 指数バックオフによる操作の再試行
   * Retry operation with exponential backoff
   * @param {AutostartError} originalError - The original error
   * @returns {Promise<Object>} Retry result
   * @private
   */
  async _retryWithBackoff(originalError) {
    const retryResult = {
      attempts: 0,
      maxAttempts: 3,
      success: false,
      lastError: null,
      backoffTimes: []
    };

    this._safeLog('logDebug', '指数バックオフによる操作再試行を開始します', {
      originalError: originalError.code,
      maxAttempts: retryResult.maxAttempts
    });

    for (let i = 0; i < retryResult.maxAttempts; i++) {
      retryResult.attempts++;
      
      // 指数バックオフ: 1秒, 2秒, 4秒
      const backoffTime = Math.min(1000 * Math.pow(2, i), 8000);
      retryResult.backoffTimes.push(backoffTime);
      
      this._safeLog('logDebug', `再試行 ${i + 1}/${retryResult.maxAttempts} - ${backoffTime}ms待機中`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      
      try {
        // 元の操作を再実行（エラーの詳細に基づいて判断）
        if (originalError.details && originalError.details.operation === 'enable') {
          await this.enable();
        } else if (originalError.details && originalError.details.operation === 'disable') {
          await this.disable();
        } else {
          // 状態確認のみ実行
          await this.isEnabled();
        }
        
        retryResult.success = true;
        this._safeLog('logDebug', '指数バックオフによる再試行が成功しました', {
          successfulAttempt: i + 1,
          totalBackoffTime: retryResult.backoffTimes.reduce((sum, time) => sum + time, 0)
        });
        break;
        
      } catch (error) {
        retryResult.lastError = error;
        this._safeLog('logWarning', `再試行 ${i + 1}/${retryResult.maxAttempts}が失敗しました`, {
          attempt: i + 1,
          error: error.message,
          errorCode: error.code || 'UNKNOWN'
        });
      }
    }

    if (!retryResult.success) {
      this._safeLog('logError', 'すべての再試行が失敗しました', retryResult.lastError, {
        totalAttempts: retryResult.attempts,
        totalBackoffTime: retryResult.backoffTimes.reduce((sum, time) => sum + time, 0)
      });
    }

    return retryResult;
  }

  /**
   * プラットフォームの表示名を取得
   * Get display name for the current platform
   * @returns {string} Platform display name
   * @private
   */
  _getPlatformDisplayName() {
    const platformNames = {
      'darwin': 'macOS',
      'win32': 'Windows',
      'linux': 'Linux',
      'freebsd': 'FreeBSD',
      'openbsd': 'OpenBSD',
      'netbsd': 'NetBSD',
      'aix': 'AIX',
      'sunos': 'SunOS'
    };
    
    return platformNames[this.platform] || this.platform;
  }

  /**
   * システム情報を収集
   * Gather comprehensive system information for diagnostics
   * @returns {Promise<Object>} System information
   * @private
   */
  async _gatherSystemInfo() {
    const systemInfo = {
      platform: this.platform,
      platformDisplayName: this._getPlatformDisplayName(),
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appPath: this.appPath,
      appName: this.appName,
      homeDir: os.homedir(),
      timestamp: new Date().toISOString()
    };

    try {
      // プラットフォーム固有の情報を収集
      switch (this.platform) {
        case 'darwin':
          systemInfo.macOS = {
            version: os.release(),
            loginItemsPath: '~/Library/LaunchAgents/',
            expectedMethod: 'app.setLoginItemSettings()'
          };
          break;

        case 'win32':
          systemInfo.windows = {
            version: os.release(),
            registryPath: 'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
            expectedMethod: 'app.setLoginItemSettings()'
          };
          break;

        case 'linux':
          const configDir = path.join(os.homedir(), '.config');
          const autostartDir = path.join(configDir, 'autostart');
          const desktopFile = path.join(autostartDir, 'rss-news-ticker.desktop');

          systemInfo.linux = {
            version: os.release(),
            configDir: configDir,
            autostartDir: autostartDir,
            desktopFile: desktopFile,
            expectedMethod: 'desktop file creation'
          };

          // ディレクトリの存在確認
          try {
            await fs.access(configDir);
            systemInfo.linux.configDirExists = true;
          } catch {
            systemInfo.linux.configDirExists = false;
          }

          try {
            await fs.access(autostartDir);
            systemInfo.linux.autostartDirExists = true;
          } catch {
            systemInfo.linux.autostartDirExists = false;
          }

          try {
            await fs.access(desktopFile);
            systemInfo.linux.desktopFileExists = true;
          } catch {
            systemInfo.linux.desktopFileExists = false;
          }
          break;
      }

      // 環境変数の確認
      systemInfo.environment = {
        display: process.env.DISPLAY || null,
        xdgCurrentDesktop: process.env.XDG_CURRENT_DESKTOP || null,
        desktopSession: process.env.DESKTOP_SESSION || null,
        path: process.env.PATH ? process.env.PATH.split(path.delimiter).slice(0, 5) : null
      };

      this._safeLog('logDebug', 'システム情報を収集しました', {
        platform: systemInfo.platform,
        hasElectronVersion: !!systemInfo.electronVersion,
        platformSpecificInfo: !!systemInfo[this.platform]
      });

    } catch (error) {
      this._safeLog('logWarning', 'システム情報の収集中にエラーが発生しました', {
        error: error.message,
        platform: this.platform
      });
      
      systemInfo.error = {
        message: error.message,
        code: error.code || 'UNKNOWN'
      };
    }

    return systemInfo;
  }

  /**
   * 一般的なガイダンスを生成
   * Generate general guidance
   * @param {AutostartError} error - The error to provide guidance for
   * @returns {Object} General guidance
   * @private
   */
  _generateGeneralGuidance(error) {
    const guidance = {
      title: 'トラブルシューティングガイド',
      platform: this._getPlatformDisplayName(),
      error: {
        code: error.code,
        message: error.message,
        timestamp: error.timestamp,
        recoverable: error.isRecoverable(),
        userActionRequired: error.requiresUserAction()
      },
      suggestions: [],
      supportInfo: {
        platform: this.platform,
        appPath: this.appPath,
        appName: this.appName,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        electronVersion: process.versions.electron
      }
    };

    // エラーコードに基づいた具体的な提案を生成
    switch (error.code) {
      case 'ELECTRON_API_UNAVAILABLE':
        guidance.suggestions = [
          'Electronアプリケーションが正しく初期化されているか確認してください',
          'アプリケーションを完全に終了してから再起動してください',
          'アプリケーションのバージョンが最新であることを確認してください'
        ];
        break;

      case 'PLATFORM_CHECK_FAILED':
        guidance.suggestions = [
          'システムの互換性を確認してください',
          'オペレーティングシステムが最新の状態であることを確認してください',
          'アプリケーションがお使いのシステムに対応しているか確認してください'
        ];
        break;

      case 'STATUS_CHECK_FAILED':
        guidance.suggestions = [
          'システムの自動起動設定が破損していないか確認してください',
          'アプリケーションを管理者権限で実行してみてください',
          'システムを再起動してから再度お試しください'
        ];
        break;

      case 'TOGGLE_FAILED':
        guidance.suggestions = [
          '自動起動の現在の状態を確認してから再度お試しください',
          'システムの自動起動設定に他のアプリケーションが干渉していないか確認してください',
          'アプリケーションを再起動してから再度お試しください'
        ];
        break;

      case 'UNEXPECTED_ERROR':
        guidance.suggestions = [
          'アプリケーションを完全に終了してから再起動してください',
          'システムを再起動してから再度お試しください',
          'アプリケーションのログファイルを確認してください',
          'ウイルス対策ソフトがアプリケーションをブロックしていないか確認してください'
        ];
        break;

      default:
        guidance.suggestions = [
          'アプリケーションを再起動してから再度お試しください',
          'システムを再起動してから再度お試しください',
          'ウイルス対策ソフトがアプリケーションをブロックしていないか確認してください',
          '問題が続く場合は、以下のサポート情報と共にお問い合わせください'
        ];
        break;
    }

    // 共通の追加提案
    guidance.suggestions.push(
      '問題が解決しない場合は、デバッグモードでアプリケーションを起動して詳細なログを確認してください'
    );

    // プラットフォーム固有の追加情報
    if (this.platform === 'linux') {
      guidance.additionalInfo = 'Linuxでは、デスクトップ環境によって自動起動の動作が異なる場合があります。';
    } else if (this.platform === 'darwin') {
      guidance.additionalInfo = 'macOSでは、システムの整合性保護(SIP)が自動起動設定に影響する場合があります。';
    } else if (this.platform === 'win32') {
      guidance.additionalInfo = 'Windowsでは、グループポリシーが自動起動設定を制限している場合があります。';
    }

    this._safeLog('logDebug', '一般的なトラブルシューティングガイダンスを生成しました', {
      errorCode: error.code,
      suggestionCount: guidance.suggestions.length,
      platform: this.platform
    });

    return guidance;
  }

  /**
   * 自動起動設定の検証
   * Verify autostart setting was applied correctly
   * @param {boolean} expectedState - Expected autostart state
   * @returns {Promise<boolean>} True if verification passed
   * @private
   */
  async _verifyAutostartSetting(expectedState) {
    try {
      // 少し待ってから確認（システムの反映を待つ）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const actualState = await this.isEnabled();
      const verified = actualState === expectedState;
      
      this.logger.debug(`Autostart verification: expected=${expectedState}, actual=${actualState}, verified=${verified}`);
      
      return verified;
    } catch (error) {
      this.logger.error('Autostart verification failed:', error);
      return false;
    }
  }

  /**
   * Electron の app.setLoginItemSettings を使用して自動起動を確認
   * Check autostart status using Electron's login item settings
   * @returns {boolean} Current autostart state
   * @private
   */
  _checkElectronLoginItems() {
    try {
      const loginItemSettings = app.getLoginItemSettings();
      this.logger.debug(`Login item settings: ${JSON.stringify(loginItemSettings)}`);
      return loginItemSettings.openAtLogin;
    } catch (error) {
      this.logger.error('Failed to get login item settings:', error);
      this.lastError = new AutostartError(
        'システムの自動起動設定を確認できませんでした',
        'LOGIN_ITEM_CHECK_FAILED',
        { platform: this.platform, error: error.message }
      );
      return false;
    }
  }

  /**
   * Electron の app.setLoginItemSettings を使用して自動起動を設定
   * Set autostart using Electron's login item settings
   * @param {boolean} enabled - Enable or disable autostart
   * @returns {Promise<void>}
   * @private
   */
  async _setElectronLoginItems(enabled) {
    try {
      const settings = {
        openAtLogin: enabled,
        openAsHidden: enabled, // システム起動時は最小化状態で開始
        name: this.appName
      };

      // Windows固有の設定を追加
      if (this.platform === 'win32') {
        settings.path = this.appPath;
        settings.args = enabled ? ['--autostart'] : [];
      }

      this.logger.debug(`Setting login item settings: ${JSON.stringify(settings)}`);
      app.setLoginItemSettings(settings);
      this.logger.debug('Login item settings updated successfully');
      
    } catch (error) {
      this.logger.error('Failed to set login item settings:', error);
      
      // プラットフォーム固有のエラーメッセージを生成
      let errorMessage = '自動起動の設定に失敗しました';
      let errorCode = 'LOGIN_ITEM_SET_FAILED';
      
      if (error.message.includes('permission') || error.message.includes('Permission')) {
        errorMessage = '自動起動の設定に必要な権限がありません';
        errorCode = 'PERMISSION_DENIED';
      } else if (error.message.includes('access') || error.message.includes('Access')) {
        errorMessage = 'システムの自動起動設定にアクセスできません';
        errorCode = 'ACCESS_DENIED';
      } else if (this.platform === 'win32' && error.message.includes('registry')) {
        errorMessage = 'Windowsレジストリへのアクセスに失敗しました';
        errorCode = 'REGISTRY_ACCESS_FAILED';
      } else if (this.platform === 'darwin' && error.message.includes('login')) {
        errorMessage = 'macOSのログイン項目の設定に失敗しました';
        errorCode = 'MACOS_LOGIN_ITEM_FAILED';
      }
      
      const autostartError = new AutostartError(
        errorMessage,
        errorCode,
        { 
          platform: this.platform, 
          enabled: enabled,
          originalError: error.message,
          settings: settings
        }
      );
      
      this.lastError = autostartError;
      throw autostartError;
    }
  }

  /**
   * Linux の .desktop ファイルの存在を確認
   * Check if Linux desktop file exists in autostart directory
   * @returns {Promise<boolean>} True if desktop file exists
   * @private
   */
  async _checkLinuxDesktopFile() {
    try {
      const desktopFilePath = this._getLinuxDesktopFilePath();
      this.logger.debug(`Checking Linux desktop file: ${desktopFilePath}`);
      
      await fs.access(desktopFilePath);
      this.logger.debug('Linux desktop file exists');
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.debug('Linux desktop file does not exist');
        return false;
      }
      
      this.logger.error('Failed to check Linux desktop file:', error);
      this.lastError = new AutostartError(
        'Linux自動起動ファイルの確認中にエラーが発生しました',
        'LINUX_DESKTOP_CHECK_FAILED',
        { 
          platform: this.platform, 
          filePath: this._getLinuxDesktopFilePath(),
          error: error.message 
        }
      );
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

    try {
      this.logger.debug(`Creating Linux desktop file: ${desktopFilePath}`);
      
      // autostart ディレクトリが存在しない場合は作成
      try {
        await fs.mkdir(autostartDir, { recursive: true });
        this.logger.debug(`Created autostart directory: ${autostartDir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          this.logger.error('Failed to create autostart directory:', error);
          
          let errorMessage = 'Linux自動起動ディレクトリの作成に失敗しました';
          let errorCode = 'LINUX_DIR_CREATE_FAILED';
          
          if (error.code === 'EACCES' || error.code === 'EPERM') {
            errorMessage = 'Linux自動起動ディレクトリの作成権限がありません';
            errorCode = 'PERMISSION_DENIED';
          } else if (error.code === 'ENOSPC') {
            errorMessage = 'ディスク容量が不足しています';
            errorCode = 'DISK_FULL';
          }
          
          const autostartError = new AutostartError(
            errorMessage,
            errorCode,
            { 
              platform: this.platform, 
              directory: autostartDir,
              error: error.message,
              errorCode: error.code
            }
          );
          
          this.lastError = autostartError;
          throw autostartError;
        }
      }

      // デスクトップファイルの内容を生成
      const desktopFileContent = this._generateLinuxDesktopFileContent();
      this.logger.debug('Generated desktop file content');
      
      // ファイルを作成
      try {
        await fs.writeFile(desktopFilePath, desktopFileContent, 'utf8');
        this.logger.debug('Desktop file written successfully');
      } catch (error) {
        this.logger.error('Failed to write desktop file:', error);
        
        let errorMessage = 'Linux自動起動ファイルの作成に失敗しました';
        let errorCode = 'LINUX_FILE_WRITE_FAILED';
        
        if (error.code === 'EACCES' || error.code === 'EPERM') {
          errorMessage = 'Linux自動起動ファイルの作成権限がありません';
          errorCode = 'PERMISSION_DENIED';
        } else if (error.code === 'ENOSPC') {
          errorMessage = 'ディスク容量が不足しています';
          errorCode = 'DISK_FULL';
        }
        
        const autostartError = new AutostartError(
          errorMessage,
          errorCode,
          { 
            platform: this.platform, 
            filePath: desktopFilePath,
            error: error.message,
            errorCode: error.code
          }
        );
        
        this.lastError = autostartError;
        throw autostartError;
      }
      
      // ファイルに実行権限を付与
      try {
        await fs.chmod(desktopFilePath, 0o755);
        this.logger.debug('Desktop file permissions set successfully');
      } catch (error) {
        this.logger.error('Failed to set desktop file permissions:', error);
        
        // 権限設定の失敗は警告レベル（ファイルは作成済み）
        const autostartError = new AutostartError(
          'Linux自動起動ファイルは作成されましたが、実行権限の設定に失敗しました',
          'LINUX_PERMISSION_SET_FAILED',
          { 
            platform: this.platform, 
            filePath: desktopFilePath,
            error: error.message,
            errorCode: error.code
          }
        );
        
        this.lastError = autostartError;
        // 警告レベルなので例外は投げない
      }
      
      this.logger.debug(`Linux desktop file created successfully: ${desktopFilePath}`);
      
    } catch (error) {
      if (error instanceof AutostartError) {
        throw error;
      }
      
      this.logger.error('Unexpected error creating Linux desktop file:', error);
      const autostartError = new AutostartError(
        'Linux自動起動ファイルの作成中に予期しないエラーが発生しました',
        'LINUX_UNEXPECTED_ERROR',
        { 
          platform: this.platform, 
          filePath: desktopFilePath,
          originalError: error.message
        }
      );
      
      this.lastError = autostartError;
      throw autostartError;
    }
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
      this.logger.debug(`Removing Linux desktop file: ${desktopFilePath}`);
      
      await fs.unlink(desktopFilePath);
      this.logger.debug('Linux desktop file removed successfully');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        // ファイルが存在しない場合は正常とみなす
        this.logger.debug('Linux desktop file already removed or does not exist');
        return;
      }
      
      this.logger.error('Failed to remove Linux desktop file:', error);
      
      let errorMessage = 'Linux自動起動ファイルの削除に失敗しました';
      let errorCode = 'LINUX_FILE_REMOVE_FAILED';
      
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        errorMessage = 'Linux自動起動ファイルの削除権限がありません';
        errorCode = 'PERMISSION_DENIED';
      } else if (error.code === 'EBUSY') {
        errorMessage = 'Linux自動起動ファイルが使用中のため削除できません';
        errorCode = 'FILE_IN_USE';
      }
      
      const autostartError = new AutostartError(
        errorMessage,
        errorCode,
        { 
          platform: this.platform, 
          filePath: desktopFilePath,
          error: error.message,
          errorCode: error.code
        }
      );
      
      this.lastError = autostartError;
      throw autostartError;
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
Categories=Network;News;
`;
  }
}

module.exports = AutostartManager;
module.exports.AutostartError = AutostartError;