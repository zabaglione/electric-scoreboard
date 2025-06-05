const RSSManager = require('./src/rss-manager');

async function testRSSFeeds() {
    const rssManager = new RSSManager();
    
    const testFeeds = [
        { url: 'https://b.hatena.ne.jp/hotentry.rss', name: 'はてなブックマーク' },
        { url: 'https://news.livedoor.com/topics/rss/top.xml', name: 'ライブドアニュース' },
        { url: 'http://kaigainohannoublog.blog55.fc2.com/?xml', name: '海外の反応ブログ' },
        { url: 'http://blog.livedoor.jp/zzcj/index.rdf', name: 'ZZCJ' },
        { url: 'https://news.yahoo.co.jp/rss/categories/science.xml', name: 'Yahoo!科学' },
        { url: 'https://news.yahoo.co.jp/rss/categories/domestic.xml', name: 'Yahoo!国内' },
        { url: 'https://news.yahoo.co.jp/rss/categories/world.xml', name: 'Yahoo!国際' },
        { url: 'https://news.yahoo.co.jp/rss/categories/it.xml', name: 'Yahoo!IT' },
        { url: 'http://www.asahi.com/rss/asahi/newsheadlines.rdf', name: '朝日新聞' },
        { url: 'https://www.lifehacker.jp/feed/index.xml', name: 'ライフハッカー' },
        { url: 'https://gigazine.net/news/rss_2.0/', name: 'GIGAZINE' },
        { url: 'https://rss.itmedia.co.jp/rss/2.0/itmedia_all.xml', name: 'ITmedia全記事' },
        { url: 'https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml', name: 'ITmediaニュース' },
        { url: 'https://rss.itmedia.co.jp/rss/2.0/pcuser.xml', name: 'ITmedia PC USER' },
        { url: 'https://www.st.ryukoku.ac.jp/~kjm/security/memo/memop.rdf', name: 'セキュリティメモ' },
        { url: 'https://softantenna.com/blog/feed/', name: 'ソフトアンテナ' }
    ];
    
    console.log(`=== RSSフィードテスト開始 ===`);
    console.log(`テスト対象: ${testFeeds.length}個のフィード\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const feed of testFeeds) {
        try {
            console.log(`テスト中: ${feed.name} (${feed.url})`);
            const result = await rssManager.fetchRSSFeed(feed.url, feed.name);
            
            if (result.success) {
                successCount++;
                console.log(`✅ 成功: ${result.articles.length}件の記事を取得`);
                
                // 最初の記事のタイトルを表示
                if (result.articles.length > 0) {
                    console.log(`   最新記事: "${result.articles[0].title}"`);
                }
                
                results.push({
                    name: feed.name,
                    url: feed.url,
                    status: 'success',
                    articles: result.articles.length,
                    feedTitle: result.feedTitle
                });
            } else {
                errorCount++;
                console.log(`❌ 失敗: ${result.error}`);
                results.push({
                    name: feed.name,
                    url: feed.url,
                    status: 'error',
                    error: result.error
                });
            }
        } catch (error) {
            errorCount++;
            console.log(`❌ 例外: ${error.message}`);
            results.push({
                name: feed.name,
                url: feed.url,
                status: 'exception',
                error: error.message
            });
        }
        
        console.log(''); // 空行
    }
    
    // 結果サマリー
    console.log(`=== テスト結果サマリー ===`);
    console.log(`成功: ${successCount}/${testFeeds.length} (${Math.round(successCount/testFeeds.length*100)}%)`);
    console.log(`失敗: ${errorCount}/${testFeeds.length} (${Math.round(errorCount/testFeeds.length*100)}%)`);
    
    // 成功したフィードの詳細
    console.log(`\n=== 成功したフィード ===`);
    results.filter(r => r.status === 'success').forEach(r => {
        console.log(`${r.name}: ${r.articles}件 (${r.feedTitle || 'タイトル不明'})`);
    });
    
    // 失敗したフィードの詳細
    const failedFeeds = results.filter(r => r.status !== 'success');
    if (failedFeeds.length > 0) {
        console.log(`\n=== 失敗したフィード ===`);
        failedFeeds.forEach(r => {
            console.log(`${r.name}: ${r.error}`);
        });
    }
    
    // 全体テスト結果の評価
    if (successCount === testFeeds.length) {
        console.log(`\n🎉 すべてのRSSフィードが正常に動作しています！`);
    } else if (successCount >= testFeeds.length * 0.8) {
        console.log(`\n⚠️  多くのRSSフィードが動作していますが、一部に問題があります。`);
    } else {
        console.log(`\n⚠️  多数のRSSフィードで問題が発生しています。ネットワーク接続やフィード形式を確認してください。`);
    }
    
    return results;
}

// スクリプトが直接実行された場合
if (require.main === module) {
    testRSSFeeds().catch(console.error);
}

module.exports = testRSSFeeds;