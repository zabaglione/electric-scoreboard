const { ipcRenderer } = require('electron');

let currentSettings = null;
let currentFeeds = [];

async function loadCurrentSettings() {
    currentSettings = await ipcRenderer.invoke('get-settings');
    currentFeeds = await ipcRenderer.invoke('get-feeds');
    
    displayFeeds();
    await displaySettings();
}

function displayFeeds() {
    const feedList = document.getElementById('feed-list');
    feedList.innerHTML = '';
    
    currentFeeds.forEach(feed => {
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <div class="feed-info">
                <div class="feed-name">${feed.name}</div>
                <div class="feed-url">${feed.url}</div>
            </div>
            <button class="remove-feed" data-url="${feed.url}">削除</button>
        `;
        feedList.appendChild(feedItem);
    });
    
    document.querySelectorAll('.remove-feed').forEach(btn => {
        btn.addEventListener('click', (e) => {
            removeFeed(e.target.dataset.url);
        });
    });
    
    // プリセットボタンの状態を更新
    updatePresetButtons();
}

function updatePresetButtons() {
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        const url = btn.dataset.url;
        const isAdded = currentFeeds.some(feed => feed.url === url);
        
        if (isAdded) {
            btn.classList.add('added');
            btn.textContent = btn.dataset.name + ' ✓';
        } else {
            btn.classList.remove('added');
            btn.textContent = btn.dataset.name;
        }
    });
}

async function displaySettings() {
    document.getElementById('theme').value = currentSettings.theme;
    document.getElementById('font-size').value = currentSettings.fontSize;
    document.getElementById('font-size-value').textContent = currentSettings.fontSize;
    document.getElementById('scroll-speed').value = currentSettings.scrollSpeed;
    document.getElementById('scroll-speed-value').textContent = currentSettings.scrollSpeed;
    document.getElementById('update-interval').value = currentSettings.updateInterval;
    document.getElementById('max-articles').value = currentSettings.maxArticles;
    
    // カスタマイズ設定
    document.getElementById('text-color').value = currentSettings.textColor;
    document.getElementById('text-color-hex').value = currentSettings.textColor;
    document.getElementById('background-color').value = currentSettings.backgroundColor;
    document.getElementById('background-color-hex').value = currentSettings.backgroundColor;
    document.getElementById('source-color').value = currentSettings.sourceColor;
    document.getElementById('source-color-hex').value = currentSettings.sourceColor;
    document.getElementById('font-family').value = currentSettings.fontFamily;
    document.getElementById('window-width').value = currentSettings.windowWidth;
    document.getElementById('window-height').value = currentSettings.windowHeight;
    document.getElementById('always-on-top').checked = currentSettings.alwaysOnTop;
    
    // 自動起動設定を取得して表示
    await displayAutostartSettings();
}

async function displayAutostartSettings() {
    const autostartCheckbox = document.getElementById('autostart');
    const autostartLabel = autostartCheckbox.parentElement.querySelector('label');
    const originalLabelText = autostartLabel.textContent;
    
    try {
        // プラットフォームサポート状況を確認
        const supportInfo = await ipcRenderer.invoke('check-autostart-support');
        
        if (!supportInfo.supported) {
            // サポートされていない場合
            autostartCheckbox.disabled = true;
            autostartCheckbox.checked = false;
            autostartLabel.textContent = `${originalLabelText} (このプラットフォームではサポートされていません)`;
            autostartLabel.style.color = '#888';
            
            console.warn('Autostart not supported:', supportInfo.error);
            return;
        }
        
        // サポートされている場合は現在の状態を取得
        const autostartEnabled = await ipcRenderer.invoke('get-autostart-status');
        autostartCheckbox.checked = autostartEnabled;
        autostartCheckbox.disabled = false;
        autostartLabel.style.color = '';
        
        console.log(`Autostart status loaded: ${autostartEnabled} (method: ${supportInfo.method})`);
        
    } catch (error) {
        console.error('自動起動設定の表示に失敗しました:', error);
        
        // エラーの場合はチェックボックスを無効化
        autostartCheckbox.disabled = true;
        autostartCheckbox.checked = false;
        autostartLabel.textContent = `${originalLabelText} (設定の読み込みに失敗)`;
        autostartLabel.style.color = '#f44';
        
        // エラーの詳細をツールチップとして表示（簡易実装）
        autostartCheckbox.title = `エラー: ${error.message}`;
    }
}

async function addFeed() {
    const url = document.getElementById('feed-url').value.trim();
    const name = document.getElementById('feed-name').value.trim();
    
    if (!url || !name) {
        alert('URLと名前を入力してください');
        return;
    }
    
    const success = await ipcRenderer.invoke('add-feed', url, name);
    if (success) {
        document.getElementById('feed-url').value = '';
        document.getElementById('feed-name').value = '';
        currentFeeds = await ipcRenderer.invoke('get-feeds');
        displayFeeds();
    } else {
        alert('このフィードは既に登録されています');
    }
}

async function removeFeed(url) {
    const success = await ipcRenderer.invoke('remove-feed', url);
    if (success) {
        currentFeeds = await ipcRenderer.invoke('get-feeds');
        displayFeeds();
    }
}

async function saveSettings() {
    const newSettings = {
        theme: document.getElementById('theme').value,
        fontSize: parseInt(document.getElementById('font-size').value),
        scrollSpeed: parseInt(document.getElementById('scroll-speed').value),
        updateInterval: parseInt(document.getElementById('update-interval').value),
        maxArticles: parseInt(document.getElementById('max-articles').value),
        textColor: document.getElementById('text-color').value,
        backgroundColor: document.getElementById('background-color').value,
        sourceColor: document.getElementById('source-color').value,
        fontFamily: document.getElementById('font-family').value,
        windowWidth: parseInt(document.getElementById('window-width').value),
        windowHeight: parseInt(document.getElementById('window-height').value),
        alwaysOnTop: document.getElementById('always-on-top').checked
    };
    
    // 自動起動設定を保存
    const autostartEnabled = document.getElementById('autostart').checked;
    try {
        await ipcRenderer.invoke('set-autostart', autostartEnabled);
    } catch (error) {
        console.error('自動起動設定の保存に失敗しました:', error);
        alert(`自動起動の設定に失敗しました: ${error.message}`);
        return; // エラーの場合は設定保存を中断
    }
    
    await ipcRenderer.invoke('update-settings', newSettings);
    window.close();
}

function resetSettings() {
    const defaults = {
        theme: 'dark',
        fontSize: 48,
        scrollSpeed: 30,
        updateInterval: 300000,
        maxArticles: 20,
        textColor: '#0ff',
        backgroundColor: '#000',
        sourceColor: '#ff0',
        fontFamily: 'Courier New',
        windowWidth: 1200,
        windowHeight: 150,
        alwaysOnTop: false
    };
    
    currentSettings = { ...currentSettings, ...defaults };
    displaySettings();
}

document.getElementById('add-feed-btn').addEventListener('click', addFeed);
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('cancel-settings').addEventListener('click', () => window.close());
document.getElementById('reset-settings').addEventListener('click', resetSettings);

document.getElementById('font-size').addEventListener('input', (e) => {
    document.getElementById('font-size-value').textContent = e.target.value;
});

document.getElementById('scroll-speed').addEventListener('input', (e) => {
    document.getElementById('scroll-speed-value').textContent = e.target.value;
});

// 自動起動チェックボックスのイベントリスナー
document.getElementById('autostart').addEventListener('change', async (e) => {
    const checkbox = e.target;
    const originalState = !checkbox.checked;
    const label = checkbox.parentElement.querySelector('label');
    const originalText = label.textContent;
    
    // 処理中の表示
    checkbox.disabled = true;
    label.textContent = `${originalText} (設定中...)`;
    label.style.color = '#888';
    
    try {
        // 設定を適用
        const result = await ipcRenderer.invoke('set-autostart', checkbox.checked);
        
        // 結果に応じてメッセージを表示
        if (result.success) {
            const baseMessage = checkbox.checked ? 
                '自動起動が有効になりました' : 
                '自動起動が無効になりました';
            
            console.log(baseMessage);
            
            // 警告がある場合は表示
            if (result.warning) {
                console.warn('警告:', result.warning);
                label.textContent = `${originalText} ⚠`;
                label.style.color = '#ff9800';
                label.title = `設定は完了しましたが、警告があります: ${result.warning}`;
                
                setTimeout(() => {
                    label.textContent = originalText;
                    label.style.color = '';
                    label.title = '';
                }, 4000);
            } else if (result.recovered) {
                console.log('回復:', result.message);
                label.textContent = `${originalText} ↻`;
                label.style.color = '#4caf50';
                label.title = result.message;
                
                setTimeout(() => {
                    label.textContent = originalText;
                    label.style.color = '';
                    label.title = '';
                }, 3000);
            } else {
                // 通常の成功
                label.textContent = `${originalText} ✓`;
                label.style.color = '#4caf50';
                
                setTimeout(() => {
                    label.textContent = originalText;
                    label.style.color = '';
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('自動起動設定の変更に失敗しました:', error);
        
        // エラー時は元の状態に戻す
        checkbox.checked = originalState;
        
        // エラーメッセージの解析と表示
        let userMessage = error.message;
        let isDetailedError = false;
        
        // JSON形式のエラー情報が含まれているかチェック
        try {
            if (error.message.includes('回復方法:')) {
                const parts = error.message.split('回復方法:');
                userMessage = parts[0].trim();
                const recoveryInfo = JSON.parse(parts[1].trim());
                isDetailedError = true;
                
                // 詳細なエラー情報を表示
                console.log('回復情報:', recoveryInfo);
                
                // 回復方法がある場合は詳細なダイアログを表示
                if (recoveryInfo.solutions) {
                    let detailedMessage = `${userMessage}\n\n解決方法:\n`;
                    recoveryInfo.solutions.forEach((solution, index) => {
                        detailedMessage += `${solution.step}. ${solution.title}\n   ${solution.description}\n`;
                        if (solution.command) {
                            detailedMessage += `   コマンド: ${solution.command}\n`;
                        }
                        detailedMessage += '\n';
                    });
                    
                    if (recoveryInfo.additionalInfo) {
                        detailedMessage += `追加情報: ${recoveryInfo.additionalInfo}`;
                    }
                    
                    userMessage = detailedMessage;
                }
            }
        } catch (parseError) {
            // JSON解析に失敗した場合は元のメッセージを使用
            console.warn('エラーメッセージの解析に失敗しました:', parseError);
        }
        
        // エラーの種類に応じた追加メッセージ
        if (!isDetailedError) {
            if (error.message.includes('サポートされていません')) {
                userMessage += '\n\nお使いのオペレーティングシステムでは自動起動機能を利用できません。手動でシステムの自動起動設定を行ってください。';
            } else if (error.message.includes('権限')) {
                userMessage += '\n\n解決方法:\n• アプリケーションを管理者権限で実行してください\n• システムのセキュリティ設定を確認してください\n• ウイルス対策ソフトの設定を確認してください';
            } else if (error.message.includes('アクセス')) {
                userMessage += '\n\n解決方法:\n• システムの自動起動設定へのアクセス権限を確認してください\n• セキュリティソフトがブロックしていないか確認してください\n• システムを再起動してから再度お試しください';
            }
        }
        
        // エラーメッセージを表示
        alert(`自動起動の設定に失敗しました:\n\n${userMessage}`);
        
        // エラーフィードバックを表示
        label.textContent = `${originalText} ✗`;
        label.style.color = '#f44336';
        label.title = `エラー: ${error.message}`;
        
        setTimeout(() => {
            label.textContent = originalText;
            label.style.color = '';
            label.title = '';
        }, 4000);
        
    } finally {
        // 処理完了後にチェックボックスを再有効化
        checkbox.disabled = false;
    }
});

document.getElementById('feed-url').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addFeed();
});

document.getElementById('feed-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addFeed();
});

// カラーピッカーとテキスト入力の同期
document.getElementById('text-color').addEventListener('input', (e) => {
    document.getElementById('text-color-hex').value = e.target.value;
});
document.getElementById('text-color-hex').addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('text-color').value = e.target.value;
    }
});

document.getElementById('background-color').addEventListener('input', (e) => {
    document.getElementById('background-color-hex').value = e.target.value;
});
document.getElementById('background-color-hex').addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('background-color').value = e.target.value;
    }
});

document.getElementById('source-color').addEventListener('input', (e) => {
    document.getElementById('source-color-hex').value = e.target.value;
});
document.getElementById('source-color-hex').addEventListener('input', (e) => {
    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        document.getElementById('source-color').value = e.target.value;
    }
});

// テーマ変更時の処理
const themePresets = {
    dark: { textColor: '#0ff', backgroundColor: '#000', sourceColor: '#ff0' },
    light: { textColor: '#333', backgroundColor: '#f0f0f0', sourceColor: '#666' },
    matrix: { textColor: '#00ff00', backgroundColor: '#000', sourceColor: '#00cc00' },
    retro: { textColor: '#ffaa00', backgroundColor: '#222', sourceColor: '#ff6600' },
    ocean: { textColor: '#66ccff', backgroundColor: '#001a33', sourceColor: '#0099ff' },
    sunset: { textColor: '#ff6b9d', backgroundColor: '#1a0033', sourceColor: '#ffd93d' },
    cyberpunk: { textColor: '#ff00ff', backgroundColor: '#0a0a0a', sourceColor: '#00ffff' },
    monochrome: { textColor: '#fff', backgroundColor: '#000', sourceColor: '#ccc' }
};

document.getElementById('theme').addEventListener('change', (e) => {
    const theme = e.target.value;
    if (theme !== 'custom' && themePresets[theme]) {
        const preset = themePresets[theme];
        document.getElementById('text-color').value = preset.textColor;
        document.getElementById('text-color-hex').value = preset.textColor;
        document.getElementById('background-color').value = preset.backgroundColor;
        document.getElementById('background-color-hex').value = preset.backgroundColor;
        document.getElementById('source-color').value = preset.sourceColor;
        document.getElementById('source-color-hex').value = preset.sourceColor;
    }
});

// DOMContentLoaded イベントで初期化
document.addEventListener('DOMContentLoaded', () => {
    loadCurrentSettings();
    
    // プリセットボタンのイベントリスナーを追加
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const url = e.target.dataset.url;
            const name = e.target.dataset.name;
            
            // 既に追加されているかチェック
            const isAdded = currentFeeds.some(feed => feed.url === url);
            
            if (isAdded) {
                // 削除
                await removeFeed(url);
            } else {
                // 追加
                const success = await ipcRenderer.invoke('add-feed', url, name);
                if (success) {
                    currentFeeds = await ipcRenderer.invoke('get-feeds');
                    displayFeeds();
                } else {
                    alert('フィードの追加に失敗しました');
                }
            }
        });
    });
});