# Code Signing Setup Guide

RSS ニュース電光掲示板アプリのコード署名設定ガイド

## Overview

このガイドでは、macOSとWindows向けのコード署名設定について説明します。コード署名は、アプリケーションの信頼性を確保し、セキュリティ警告を回避するために重要です。

## macOS Code Signing

### Prerequisites

1. **Apple Developer Account**: 有効なApple Developer Programアカウント
2. **Developer ID Application Certificate**: Mac App Store外での配布用証明書
3. **Xcode Command Line Tools**: `xcode-select --install`

### Step 1: Certificate Setup

1. Apple Developer Portalにログイン
2. Certificates, Identifiers & Profiles → Certificates
3. "Developer ID Application" 証明書を作成
4. 証明書をダウンロードしてKeychain Accessにインストール

### Step 2: Environment Variables

以下の環境変数を設定:

```bash
# Apple ID (notarization用)
export APPLE_ID="your-apple-id@example.com"

# App-specific password (Apple IDの2要素認証用)
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Team ID (Developer Portal → Membership → Team ID)
export APPLE_TEAM_ID="XXXXXXXXXX"

# Code signing identity (Keychain Accessで確認)
export APPLE_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"
```

### Step 3: App-Specific Password

1. Apple ID管理ページ (appleid.apple.com) にアクセス
2. サインイン → セキュリティ → App用パスワード
3. 新しいApp用パスワードを生成
4. `APPLE_ID_PASSWORD`に設定

### Step 4: Verification

```bash
# 証明書の確認
security find-identity -v -p codesigning

# 環境変数の確認
echo $APPLE_ID
echo $APPLE_TEAM_ID
```

## Windows Code Signing

### Prerequisites

1. **Code Signing Certificate**: 信頼できるCA（DigiCert、Sectigo等）から取得
2. **Certificate File**: .p12または.pfx形式
3. **Windows SDK**: signtool.exeが必要（Visual Studio Build Toolsに含まれる）

### Step 1: Certificate Acquisition

推奨CA:
- **DigiCert**: 業界標準、高い信頼性
- **Sectigo (旧Comodo)**: コストパフォーマンス良好
- **GlobalSign**: 国際的に認知

### Step 2: Certificate Installation

#### Method 1: Certificate File (.p12/.pfx)

```bash
# 証明書ファイルのパス
export WIN_CSC_LINK="/path/to/certificate.p12"

# 証明書のパスワード
export WIN_CSC_KEY_PASSWORD="certificate-password"
```

#### Method 2: Windows Certificate Store

```bash
# 証明書のSubject Name
export WIN_CSC_SUBJECT_NAME="Your Company Name"

# 証明書のSHA1ハッシュ
export WIN_CSC_SHA1="1234567890abcdef1234567890abcdef12345678"
```

### Step 3: Verification

```bash
# 証明書の確認 (Windows)
certlm.msc

# signtoolの確認
signtool.exe /?
```

## Environment Setup Scripts

### macOS Setup Script

```bash
#!/bin/bash
# setup-macos-signing.sh

echo "Setting up macOS code signing..."

# Check if certificates are installed
if security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo "✅ Developer ID Application certificate found"
else
    echo "❌ Developer ID Application certificate not found"
    echo "Please install your certificate in Keychain Access"
    exit 1
fi

# Set environment variables
read -p "Enter your Apple ID: " APPLE_ID
read -s -p "Enter your app-specific password: " APPLE_ID_PASSWORD
echo
read -p "Enter your Team ID: " APPLE_TEAM_ID

export APPLE_ID="$APPLE_ID"
export APPLE_ID_PASSWORD="$APPLE_ID_PASSWORD"
export APPLE_TEAM_ID="$APPLE_TEAM_ID"

# Find and set identity
IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -1 | sed 's/.*) "//' | sed 's/".*//')
export APPLE_IDENTITY="$IDENTITY"

echo "✅ macOS code signing setup complete"
echo "Identity: $APPLE_IDENTITY"
```

### Windows Setup Script

```powershell
# setup-windows-signing.ps1

Write-Host "Setting up Windows code signing..."

# Check for signtool
if (Get-Command signtool.exe -ErrorAction SilentlyContinue) {
    Write-Host "✅ signtool.exe found"
} else {
    Write-Host "❌ signtool.exe not found"
    Write-Host "Please install Windows SDK or Visual Studio Build Tools"
    exit 1
}

# Certificate setup
$CertPath = Read-Host "Enter path to certificate file (.p12/.pfx)"
$CertPassword = Read-Host "Enter certificate password" -AsSecureString

$env:WIN_CSC_LINK = $CertPath
$env:WIN_CSC_KEY_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($CertPassword))

Write-Host "✅ Windows code signing setup complete"
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        # macOS signing
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        
        # Windows signing
        WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
        WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist-${{ matrix.os }}
        path: dist/
```

### Environment Variables in CI

GitHub Secrets設定:
- `APPLE_ID`: Apple ID
- `APPLE_ID_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `WIN_CSC_LINK`: Base64エンコードされた証明書ファイル
- `WIN_CSC_KEY_PASSWORD`: 証明書パスワード

## Troubleshooting

### Common macOS Issues

#### Certificate Not Found
```bash
# 証明書の確認
security find-identity -v -p codesigning

# Keychainの修復
security unlock-keychain ~/Library/Keychains/login.keychain
```

#### Notarization Failures
```bash
# Notarization履歴の確認
xcrun notarytool history --apple-id $APPLE_ID --password $APPLE_ID_PASSWORD

# 詳細ログの取得
xcrun notarytool log <submission-id> --apple-id $APPLE_ID --password $APPLE_ID_PASSWORD
```

### Common Windows Issues

#### Certificate Issues
```powershell
# 証明書の確認
Get-ChildItem -Path Cert:\CurrentUser\My

# 証明書の詳細表示
certutil -dump certificate.p12
```

#### Signing Failures
```bash
# 手動署名テスト
signtool.exe sign /f certificate.p12 /p password /t http://timestamp.digicert.com test.exe

# 署名の確認
signtool.exe verify /pa test.exe
```

## Security Best Practices

1. **Certificate Storage**: 証明書は安全な場所に保管
2. **Password Management**: パスワードは環境変数やシークレット管理ツールを使用
3. **Access Control**: 署名権限は必要最小限のユーザーに制限
4. **Backup**: 証明書とパスワードのバックアップを作成
5. **Expiration Monitoring**: 証明書の有効期限を監視

## Cost Considerations

### macOS
- Apple Developer Program: $99/年
- 追加費用なし（notarizationも含む）

### Windows
- Code Signing Certificate: $200-500/年（CAにより異なる）
- EV Certificate: $300-800/年（より高い信頼性）

## Support Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Microsoft Code Signing Guide](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [electron-builder Code Signing](https://www.electron.build/code-signing)