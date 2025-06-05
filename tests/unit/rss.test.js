const RSSManager = require('../../src/rss-manager');
const Parser = require('rss-parser');

jest.mock('rss-parser');

describe('RSSManager', () => {
  let rssManager;
  let mockParseURL;

  beforeEach(() => {
    mockParseURL = jest.fn();
    Parser.mockImplementation(() => ({
      parseURL: mockParseURL
    }));
    rssManager = new RSSManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRSSFeed', () => {
    it('正常系: RSSフィードを正常に取得できる', async () => {
      const mockFeed = {
        title: 'Test Feed',
        items: [
          {
            title: 'Test Article 1',
            link: 'https://example.com/article1',
            pubDate: '2023-12-01T00:00:00Z',
            guid: 'guid1'
          },
          {
            title: 'Test Article 2',
            link: 'https://example.com/article2',
            pubDate: '2023-12-02T00:00:00Z',
            guid: 'guid2'
          }
        ]
      };

      mockParseURL.mockResolvedValue(mockFeed);

      const result = await rssManager.fetchRSSFeed('https://example.com/feed.xml', 'Test Feed');

      expect(result.success).toBe(true);
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0]).toEqual({
        title: 'Test Article 1',
        link: 'https://example.com/article1',
        pubDate: '2023-12-01T00:00:00Z',
        source: 'Test Feed',
        guid: 'guid1'
      });
    });

    it('異常系: ネットワークエラー時にエラーを返す', async () => {
      mockParseURL.mockRejectedValue(new Error('Network error'));

      const result = await rssManager.fetchRSSFeed('https://example.com/feed.xml', 'Test Feed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.articles).toEqual([]);
    });

    it('正常系: 記事数を10件に制限する', async () => {
      const items = Array(15).fill(null).map((_, i) => ({
        title: `Article ${i + 1}`,
        link: `https://example.com/article${i + 1}`,
        pubDate: new Date().toISOString(),
        guid: `guid${i + 1}`
      }));

      mockParseURL.mockResolvedValue({ title: 'Test Feed', items });

      const result = await rssManager.fetchRSSFeed('https://example.com/feed.xml', 'Test Feed');

      expect(result.articles).toHaveLength(10);
    });

    it('正常系: 不完全なデータを正規化する', async () => {
      const mockFeed = {
        items: [
          {
            title: null,
            link: null,
            pubDate: null,
            guid: null
          }
        ]
      };

      mockParseURL.mockResolvedValue(mockFeed);

      const result = await rssManager.fetchRSSFeed('https://example.com/feed.xml', 'Test Feed');

      expect(result.articles[0].title).toBe('タイトルなし');
      expect(result.articles[0].link).toBe('');
      expect(result.articles[0].pubDate).toBeTruthy();
      expect(result.articles[0].guid).toBeTruthy();
    });
  });

  describe('fetchAllFeeds', () => {
    it('正常系: 複数のフィードを取得できる', async () => {
      rssManager.addFeed('https://feed1.com', 'Feed 1');
      rssManager.addFeed('https://feed2.com', 'Feed 2');

      mockParseURL
        .mockResolvedValueOnce({
          items: [{ title: 'Article 1', link: 'link1', pubDate: '2023-12-02', guid: '1' }]
        })
        .mockResolvedValueOnce({
          items: [{ title: 'Article 2', link: 'link2', pubDate: '2023-12-01', guid: '2' }]
        });

      const result = await rssManager.fetchAllFeeds();

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].title).toBe('Article 1'); // 新しい順にソート
      expect(result.errors).toHaveLength(0);
    });

    it('正常系: デフォルトフィードを使用する', async () => {
      mockParseURL.mockResolvedValue({ items: [] });

      const result = await rssManager.fetchAllFeeds();

      expect(mockParseURL).toHaveBeenCalledTimes(5); // デフォルト5つ
    });

    it('異常系: 一部のフィードでエラーが発生してもエラー配列に格納される', async () => {
      rssManager.addFeed('https://feed1.com', 'Feed 1');
      rssManager.addFeed('https://feed2.com', 'Feed 2');

      mockParseURL
        .mockResolvedValueOnce({
          items: [{ title: 'Article 1', link: 'link1', pubDate: '2023-12-01', guid: '1' }]
        })
        .mockRejectedValueOnce(new Error('Feed error'));

      const result = await rssManager.fetchAllFeeds();

      expect(result.articles).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        feed: 'Feed 2',
        error: 'Feed error'
      });
    });
  });

  describe('フィード管理機能', () => {
    it('正常系: フィードを追加できる', () => {
      const added = rssManager.addFeed('https://example.com/feed', 'Example Feed');
      
      expect(added).toBe(true);
      expect(rssManager.getFeeds()).toContainEqual({
        url: 'https://example.com/feed',
        name: 'Example Feed'
      });
    });

    it('正常系: 重複したフィードは追加されない', () => {
      rssManager.addFeed('https://example.com/feed', 'Example Feed');
      const added = rssManager.addFeed('https://example.com/feed', 'Example Feed 2');
      
      expect(added).toBe(false);
      expect(rssManager.getFeeds()).toHaveLength(1);
    });

    it('正常系: フィードを削除できる', () => {
      rssManager.addFeed('https://example.com/feed', 'Example Feed');
      const removed = rssManager.removeFeed('https://example.com/feed');
      
      expect(removed).toBe(true);
      expect(rssManager.getFeeds()).toHaveLength(0);
    });

    it('正常系: 存在しないフィードの削除は失敗する', () => {
      const removed = rssManager.removeFeed('https://nonexistent.com/feed');
      
      expect(removed).toBe(false);
    });

    it('正常系: フィードが無い場合は空配列を返す', () => {
      const feeds = rssManager.getFeeds();
      
      expect(feeds).toHaveLength(0);
    });
  });

  describe('記事管理機能', () => {
    it('正常系: 記事を取得できる', async () => {
      rssManager.addFeed('https://example.com/feed', 'Example Feed');
      mockParseURL.mockResolvedValue({
        items: [{ title: 'Test', link: 'link', pubDate: '2023-12-01', guid: '1' }]
      });

      await rssManager.fetchAllFeeds();
      const articles = rssManager.getArticles();

      expect(articles).toHaveLength(1); // 1フィード × 1記事
    });

    it('正常系: 初期状態では記事が空', () => {
      const articles = rssManager.getArticles();
      
      expect(articles).toEqual([]);
    });
  });
});