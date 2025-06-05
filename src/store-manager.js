const Store = require('electron-store').default || require('electron-store');

class StoreManager {
    constructor() {
        this.store = new Store({
            name: 'electric-scoreboard-config',
            defaults: {
                feeds: [],
                settings: {
                    updateInterval: 300000, // 5分
                    scrollSpeed: 50, // 50ピクセル/秒でゆっくり読める
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
                }
            }
        });
    }

    getFeeds() {
        return this.store.get('feeds', []);
    }

    setFeeds(feeds) {
        this.store.set('feeds', feeds);
    }

    addFeed(feed) {
        const feeds = this.getFeeds();
        if (!feeds.find(f => f.url === feed.url)) {
            feeds.push(feed);
            this.setFeeds(feeds);
            return true;
        }
        return false;
    }

    removeFeed(url) {
        const feeds = this.getFeeds();
        const newFeeds = feeds.filter(f => f.url !== url);
        if (feeds.length !== newFeeds.length) {
            this.setFeeds(newFeeds);
            return true;
        }
        return false;
    }

    getSettings() {
        return this.store.get('settings');
    }

    updateSettings(newSettings) {
        const currentSettings = this.getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        this.store.set('settings', updatedSettings);
        return updatedSettings;
    }

    getSetting(key) {
        return this.store.get(`settings.${key}`);
    }

    setSetting(key, value) {
        this.store.set(`settings.${key}`, value);
    }

    clear() {
        this.store.clear();
    }
}

module.exports = StoreManager;