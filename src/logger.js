class Logger {
    constructor(enabled = false) {
        this.enabled = enabled;
        this.originalConsole = {
            log: console.log.bind(console),
            error: console.error.bind(console),
            warn: console.warn.bind(console),
            info: console.info.bind(console)
        };
        
        this.initializeLogging();
    }

    initializeLogging() {
        // コンソールメソッドをオーバーライド
        console.log = (...args) => {
            if (this.enabled) {
                this.originalConsole.log(...args);
            }
        };

        console.info = (...args) => {
            if (this.enabled) {
                this.originalConsole.info(...args);
            }
        };

        console.warn = (...args) => {
            if (this.enabled) {
                this.originalConsole.warn(...args);
            }
        };

        // エラーメッセージは常に表示（重要）
        console.error = (...args) => {
            this.originalConsole.error(...args);
        };
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    isEnabled() {
        return this.enabled;
    }

    // 強制的にログを出力（デバッグモードに関係なく）
    forceLog(...args) {
        this.originalConsole.log(...args);
    }

    forceWarn(...args) {
        this.originalConsole.warn(...args);
    }

    forceInfo(...args) {
        this.originalConsole.info(...args);
    }

    // ログレベル付きメソッド
    debug(...args) {
        if (this.enabled) {
            this.originalConsole.log('[DEBUG]', ...args);
        }
    }

    info(...args) {
        if (this.enabled) {
            this.originalConsole.info('[INFO]', ...args);
        }
    }

    warn(...args) {
        if (this.enabled) {
            this.originalConsole.warn('[WARN]', ...args);
        }
    }

    error(...args) {
        // エラーは常に出力
        this.originalConsole.error('[ERROR]', ...args);
    }

    // 構造化ログメソッド
    logError(message, error, context = {}) {
        const errorInfo = {
            message: message,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            context: context,
            timestamp: new Date().toISOString()
        };

        if (error.code) {
            errorInfo.error.code = error.code;
        }

        if (error.details) {
            errorInfo.error.details = error.details;
        }

        this.originalConsole.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
    }

    logWarning(message, context = {}) {
        const warningInfo = {
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        };

        if (this.enabled) {
            this.originalConsole.warn('[WARN]', JSON.stringify(warningInfo, null, 2));
        }
    }

    logDebug(message, context = {}) {
        if (this.enabled) {
            const debugInfo = {
                message: message,
                context: context,
                timestamp: new Date().toISOString()
            };
            this.originalConsole.log('[DEBUG]', JSON.stringify(debugInfo, null, 2));
        }
    }

    // コンソールを元に戻す
    restore() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
    }
}

module.exports = Logger;