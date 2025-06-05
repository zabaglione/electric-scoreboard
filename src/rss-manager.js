const Parser = require('rss-parser');

class RSSManager {
    constructor() {
        this.parser = new Parser();
        this.feeds = [];
        this.articles = [];
        this.defaultFeeds = [
            { url: 'https://b.hatena.ne.jp/hotentry.rss', name: 'はてなブックマーク' },
            { url: 'https://news.livedoor.com/topics/rss/top.xml', name: 'ライブドアニュース' },
            { url: 'https://news.yahoo.co.jp/rss/categories/it.xml', name: 'Yahoo!IT' },
            { url: 'https://gigazine.net/news/rss_2.0/', name: 'GIGAZINE' },
            { url: 'https://rss.itmedia.co.jp/rss/2.0/itmedia_all.xml', name: 'ITmedia全記事' }
        ];
    }

    async fetchRSSFeed(feedUrl, feedName = 'Unknown') {
        try {
            console.log(`Fetching RSS feed from: ${feedUrl}`);
            const feed = await this.parser.parseURL(feedUrl);
            
            const normalizedArticles = feed.items.slice(0, 10).map(item => ({
                title: item.title || 'タイトルなし',
                link: item.link || '',
                pubDate: item.pubDate || new Date().toISOString(),
                source: feedName,
                guid: item.guid || item.link || Math.random().toString()
            }));

            return {
                success: true,
                articles: normalizedArticles,
                feedTitle: feed.title || feedName
            };
        } catch (error) {
            console.error(`Error fetching RSS feed from ${feedUrl}:`, error);
            return {
                success: false,
                error: error.message,
                articles: []
            };
        }
    }

    async fetchAllFeeds() {
        const feedsToFetch = this.feeds.length > 0 ? this.feeds : this.defaultFeeds;
        const allArticles = [];
        const errors = [];

        for (const feed of feedsToFetch) {
            const result = await this.fetchRSSFeed(feed.url, feed.name);
            if (result.success) {
                allArticles.push(...result.articles);
            } else {
                errors.push({
                    feed: feed.name,
                    error: result.error
                });
            }
        }

        this.articles = allArticles.sort((a, b) => 
            new Date(b.pubDate) - new Date(a.pubDate)
        );

        return {
            articles: this.articles,
            errors: errors
        };
    }

    addFeed(url, name) {
        if (!this.feeds.find(feed => feed.url === url)) {
            this.feeds.push({ url, name });
            return true;
        }
        return false;
    }

    removeFeed(url) {
        const index = this.feeds.findIndex(feed => feed.url === url);
        if (index !== -1) {
            this.feeds.splice(index, 1);
            return true;
        }
        return false;
    }

    getFeeds() {
        return this.feeds;
    }

    getArticles() {
        return this.articles;
    }
}

module.exports = RSSManager;