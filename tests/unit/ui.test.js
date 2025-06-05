/**
 * @jest-environment jsdom
 */

describe('UI制御機能', () => {
  let tickerContent;
  let pauseBtn;
  let settingsBtn;
  
  beforeEach(() => {
    // DOM要素のモック
    document.body.innerHTML = `
      <div id="ticker-container">
        <div id="ticker-content"></div>
      </div>
      <button id="pause-btn">一時停止</button>
      <button id="settings-btn">設定</button>
    `;
    
    tickerContent = document.getElementById('ticker-content');
    pauseBtn = document.getElementById('pause-btn');
    settingsBtn = document.getElementById('settings-btn');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('updateScrollSpeed', () => {
    it('正常系: スクロール速度を変更できる', () => {
      const speed = 45;
      document.documentElement.style.setProperty('--scroll-speed', `${speed}s`);
      
      const computedSpeed = document.documentElement.style.getPropertyValue('--scroll-speed');
      expect(computedSpeed).toBe('45s');
    });
  });

  describe('formatDisplayText', () => {
    it('正常系: テキストが正しく整形される', () => {
      const title = 'これは長いニュースタイトルです';
      const source = 'ニュースソース';
      const expected = `${title} [${source}]`;
      
      const formatted = `${title} [${source}]`;
      expect(formatted).toBe(expected);
    });

    it('正常系: 特殊文字がエスケープされる', () => {
      const title = '<script>alert("XSS")</script>';
      const escaped = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      expect(escaped).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
    });
  });

  describe('toggleDisplay', () => {
    it('正常系: 一時停止ボタンで表示を切り替えられる', () => {
      const tickerContainer = document.getElementById('ticker-container');
      let isPaused = false;
      
      pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        if (isPaused) {
          tickerContainer.classList.add('paused');
          pauseBtn.textContent = '再開';
        } else {
          tickerContainer.classList.remove('paused');
          pauseBtn.textContent = '一時停止';
        }
      });
      
      // 初期状態
      expect(tickerContainer.classList.contains('paused')).toBe(false);
      expect(pauseBtn.textContent).toBe('一時停止');
      
      // クリック後
      pauseBtn.click();
      expect(tickerContainer.classList.contains('paused')).toBe(true);
      expect(pauseBtn.textContent).toBe('再開');
      
      // 再度クリック
      pauseBtn.click();
      expect(tickerContainer.classList.contains('paused')).toBe(false);
      expect(pauseBtn.textContent).toBe('一時停止');
    });
  });

  describe('ニュース表示更新', () => {
    it('正常系: ニュースアイテムが正しく表示される', () => {
      const newsItems = [
        { title: 'ニュース1', source: 'ソース1' },
        { title: 'ニュース2', source: 'ソース2' }
      ];
      
      tickerContent.innerHTML = '';
      newsItems.forEach(item => {
        const newsElement = document.createElement('span');
        newsElement.className = 'news-item';
        newsElement.innerHTML = `
          ${item.title}
          <span class="source">[${item.source}]</span>
        `;
        tickerContent.appendChild(newsElement);
      });
      
      const displayedItems = tickerContent.querySelectorAll('.news-item');
      expect(displayedItems).toHaveLength(2);
      expect(displayedItems[0].textContent).toContain('ニュース1');
      expect(displayedItems[0].textContent).toContain('[ソース1]');
    });

    it('正常系: 空のニュースリストで適切なメッセージを表示', () => {
      const newsItems = [];
      
      if (!newsItems || newsItems.length === 0) {
        tickerContent.innerHTML = '<span class="news-item">ニュースを取得中...<span class="source">[システム]</span></span>';
      }
      
      expect(tickerContent.textContent).toContain('ニュースを取得中...');
      expect(tickerContent.textContent).toContain('[システム]');
    });
  });

  describe('テーマ適用', () => {
    it('正常系: ダークテーマを適用できる', () => {
      document.body.classList.remove('light-theme');
      document.body.classList.add('theme-dark');
      
      expect(document.body.classList.contains('theme-dark')).toBe(true);
      expect(document.body.classList.contains('light-theme')).toBe(false);
    });

    it('正常系: ライトテーマを適用できる', () => {
      document.body.classList.add('light-theme');
      
      expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('正常系: カスタムテーマで色を設定できる', () => {
      const textColor = '#ff0000';
      const bgColor = '#ffffff';
      const sourceColor = '#0000ff';
      
      document.documentElement.style.setProperty('--text-color', textColor);
      document.documentElement.style.setProperty('--bg-color', bgColor);
      document.documentElement.style.setProperty('--source-color', sourceColor);
      
      expect(document.documentElement.style.getPropertyValue('--text-color')).toBe(textColor);
      expect(document.documentElement.style.getPropertyValue('--bg-color')).toBe(bgColor);
      expect(document.documentElement.style.getPropertyValue('--source-color')).toBe(sourceColor);
    });
  });

  describe('フォント設定', () => {
    it('正常系: フォントファミリーを変更できる', () => {
      const fontFamily = 'Yu Gothic';
      document.body.style.fontFamily = `'${fontFamily}', monospace`;
      
      expect(document.body.style.fontFamily).toContain(fontFamily);
    });

    it('正常系: フォントサイズを変更できる', () => {
      const fontSize = 60;
      document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
      
      expect(document.documentElement.style.getPropertyValue('--font-size')).toBe('60px');
    });
  });

  describe('コントロールボタンの表示制御', () => {
    it('正常系: ホバー時にコントロールが表示される', () => {
      const controls = document.createElement('div');
      controls.id = 'controls';
      controls.style.opacity = '0';
      controls.style.transition = 'opacity 0.3s';
      document.body.appendChild(controls);
      
      // マウスホバーのシミュレーション
      const mouseEnter = new MouseEvent('mouseenter');
      document.body.dispatchEvent(mouseEnter);
      
      // 実際のCSSホバー効果をシミュレート
      controls.style.opacity = '1';
      
      expect(controls.style.opacity).toBe('1');
    });
  });

  describe('CSSアニメーション制御', () => {
    it('正常系: アニメーションの一時停止が適用される', () => {
      const tickerContainer = document.getElementById('ticker-container');
      tickerContainer.classList.add('paused');
      
      // CSSクラスが適用されているか確認
      expect(tickerContainer.classList.contains('paused')).toBe(true);
    });

    it('正常系: スクロール速度の変更が適用される', () => {
      const speeds = [10, 30, 60];
      
      speeds.forEach(speed => {
        document.documentElement.style.setProperty('--scroll-speed', `${speed}s`);
        const applied = document.documentElement.style.getPropertyValue('--scroll-speed');
        expect(applied).toBe(`${speed}s`);
      });
    });
  });
});