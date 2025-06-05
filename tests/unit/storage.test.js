// Mock electron-store before requiring StoreManager
jest.mock('electron-store', () => {
  class MockStore {
    constructor(options = {}) {
      this.store = {};
      this.defaults = options.defaults || {};
      // デフォルト値をストアに設定
      Object.keys(this.defaults).forEach(key => {
        this.store[key] = JSON.parse(JSON.stringify(this.defaults[key]));
      });
    }

    get(key, defaultValue) {
      const keys = key.split('.');
      let value = this.store;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return defaultValue !== undefined ? defaultValue : this._getDefault(key);
        }
      }
      
      return value;
    }

    set(key, value) {
      const keys = key.split('.');
      if (keys.length === 1) {
        this.store[key] = value;
      } else {
        let obj = this.store;
        for (let i = 0; i < keys.length - 1; i++) {
          const k = keys[i];
          if (!(k in obj) || typeof obj[k] !== 'object') {
            obj[k] = {};
          }
          obj = obj[k];
        }
        obj[keys[keys.length - 1]] = value;
      }
    }

    clear() {
      Object.keys(this.store).forEach(key => {
        delete this.store[key];
      });
      // デフォルト値を再設定
      Object.keys(this.defaults).forEach(key => {
        this.store[key] = JSON.parse(JSON.stringify(this.defaults[key]));
      });
    }

    _getDefault(key) {
      const keys = key.split('.');
      let value = this.defaults;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return undefined;
        }
      }
      
      return value;
    }
  }
  
  return { default: MockStore };
});

const StoreManager = require('../../src/store-manager');

describe('StoreManager', () => {
  let storeManager;

  beforeEach(() => {
    storeManager = new StoreManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('フィード管理', () => {
    it('正常系: フィードを保存できる', () => {
      const feeds = [
        { url: 'https://feed1.com', name: 'Feed 1' },
        { url: 'https://feed2.com', name: 'Feed 2' }
      ];

      storeManager.setFeeds(feeds);
      const savedFeeds = storeManager.getFeeds();

      expect(savedFeeds).toEqual(feeds);
    });

    it('正常系: フィードを追加できる', () => {
      const feed = { url: 'https://feed1.com', name: 'Feed 1' };
      const added = storeManager.addFeed(feed);

      expect(added).toBe(true);
      expect(storeManager.getFeeds()).toContainEqual(feed);
    });

    it('正常系: 重複したフィードは追加されない', () => {
      const feed = { url: 'https://feed1.com', name: 'Feed 1' };
      storeManager.addFeed(feed);
      const added = storeManager.addFeed(feed);

      expect(added).toBe(false);
      expect(storeManager.getFeeds()).toHaveLength(1);
    });

    it('正常系: フィードを削除できる', () => {
      const feed = { url: 'https://feed1.com', name: 'Feed 1' };
      storeManager.addFeed(feed);
      const removed = storeManager.removeFeed('https://feed1.com');

      expect(removed).toBe(true);
      expect(storeManager.getFeeds()).toHaveLength(0);
    });

    it('正常系: 存在しないフィードの削除は失敗する', () => {
      const removed = storeManager.removeFeed('https://nonexistent.com');

      expect(removed).toBe(false);
    });

    it('正常系: 初期状態では空の配列を返す', () => {
      const feeds = storeManager.getFeeds();

      expect(feeds).toEqual([]);
    });
  });

  describe('設定管理', () => {
    it('正常系: デフォルト設定を取得できる', () => {
      const settings = storeManager.getSettings();

      expect(settings).toMatchObject({
        updateInterval: 300000,
        scrollSpeed: 50,
        fontSize: 48,
        maxArticles: 20,
        theme: 'dark',
        alwaysOnTop: false,
        textColor: '#0ff',
        backgroundColor: '#000',
        sourceColor: '#ff0',
        fontFamily: 'Courier New',
        windowWidth: 1200,
        windowHeight: 150
      });
    });

    it('正常系: 設定を更新できる', () => {
      const newSettings = {
        fontSize: 36,
        theme: 'light',
        scrollSpeed: 20
      };

      const updated = storeManager.updateSettings(newSettings);

      expect(updated.fontSize).toBe(36);
      expect(updated.theme).toBe('light');
      expect(updated.scrollSpeed).toBe(20);
      expect(updated.updateInterval).toBe(300000); // 他の設定は保持される
    });

    it('正常系: 個別の設定を取得できる', () => {
      const fontSize = storeManager.getSetting('fontSize');

      expect(fontSize).toBe(48);
    });

    it('正常系: 個別の設定を更新できる', () => {
      storeManager.setSetting('fontSize', 60);
      const fontSize = storeManager.getSetting('fontSize');

      expect(fontSize).toBe(60);
    });

    it('正常系: ネストした設定キーも扱える', () => {
      storeManager.store.set('nested', { deep: { value: 'test' } });
      const value = storeManager.store.get('nested.deep.value');

      expect(value).toBe('test');
    });
  });

  describe('ストア管理', () => {
    it('正常系: ストアをクリアできる', () => {
      storeManager.addFeed({ url: 'https://feed.com', name: 'Feed' });
      storeManager.setSetting('fontSize', 60);

      storeManager.clear();
      
      // clearメソッドの後、feedsは空配列（デフォルト値）に戻る
      expect(storeManager.getFeeds()).toEqual([]);
      // 設定はclear後もデフォルト値を返すはず
      expect(storeManager.getSetting('fontSize')).toBe(48);
    });

    it('正常系: 存在しないキーではデフォルト値を返す', () => {
      const value = storeManager.store.get('nonexistent.key', 'default');

      expect(value).toBe('default');
    });
  });

  describe('URL検証', () => {
    it('正常系: 正しいURL形式を受け入れる', () => {
      const validUrls = [
        'https://example.com/feed.xml',
        'http://example.com/rss',
        'https://example.com/feed?format=rss',
        'https://subdomain.example.com/feed'
      ];

      validUrls.forEach(url => {
        const added = storeManager.addFeed({ url, name: 'Test' });
        expect(added).toBe(true);
        storeManager.removeFeed(url);
      });
    });
  });

  describe('設定値の範囲', () => {
    it('正常系: 設定値が適切な範囲内にある', () => {
      const settings = storeManager.getSettings();

      expect(settings.updateInterval).toBeGreaterThanOrEqual(60000); // 最小1分
      expect(settings.scrollSpeed).toBeGreaterThan(0);
      expect(settings.fontSize).toBeGreaterThanOrEqual(24);
      expect(settings.fontSize).toBeLessThanOrEqual(72);
      expect(settings.maxArticles).toBeGreaterThanOrEqual(5);
      expect(settings.maxArticles).toBeLessThanOrEqual(50);
      expect(settings.windowWidth).toBeGreaterThanOrEqual(600);
      expect(settings.windowHeight).toBeGreaterThanOrEqual(100);
    });
  });
});