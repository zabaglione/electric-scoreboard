# Build Configuration Documentation

RSS ニュース電光掲示板アプリの配布用ビルド設定ドキュメント

## Overview

このドキュメントでは、RSS ニュース電光掲示板アプリケーションの配布用ビルドプロセスについて説明します。electron-builderを使用して、macOS、Windows、Linuxの各プラットフォーム向けのインストーラーを生成します。

## Build System Architecture

```
build/
├── scripts/
│   ├── build-all.js          # メインビルドスクリプト
│   ├── notarize.js           # macOS公証処理
│   ├── generate-icons.js     # アイコン生成
│   ├── version-manager.js    # バージョン管理
│   └── validate-build.js     # ビルド検証
├── entitlements.mac.plist    # macOS権限設定
├── icon.png                  # アプリケーションアイコン
└── BUILD.md                  # このドキュメント
```

## Platform-Specific Configurations

### macOS
- **Targets**: DMG, ZIP
- **Architectures**: x64, arm64 (Apple Silicon)
- **Code Signing**: Developer ID Application certificate
- **Notarization**: Apple notarization service
- **Category**: News (public.app-category.news)
- **Minimum Version**: macOS 10.14 (Mojave)

### Windows
- **Targets**: NSIS installer, Portable, MSI
- **Architectures**: x64, ia32
- **Code Signing**: Authenticode certificate
- **Installer**: NSIS with custom options
- **Registry**: Autostart integration

### Linux
- **Targets**: AppImage, DEB, RPM, Snap, tar.gz
- **Architectures**: x64, arm64
- **Categories**: Network/Utility
- **Desktop Integration**: .desktop files
- **Dependencies**: libnotify, libxtst, nss

## Build Commands

### Development Builds
```bash
# Quick build (unpacked)
npm run build:quick

# Platform-specific builds
npm run build:mac
npm run build:win
npm run build:linux

# All platforms
npm run build:all
```

### Release Builds
```bash
# Release with version increment
npm run release:all

# Platform-specific releases
npm run release:mac
npm run release:win
npm run release:linux
```

### Validation
```bash
# Validate build configuration
npm run build:validate

# Test build process
npm run build:quick
```

## Code Signing Setup

### macOS Code Signing

Required environment variables:
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
export APPLE_IDENTITY="Developer ID Application: Your Name"
```

Steps to set up:
1. Obtain Developer ID Application certificate from Apple Developer Portal
2. Install certificate in Keychain Access
3. Generate app-specific password for Apple ID
4. Set environment variables

### Windows Code Signing

Required environment variables:
```bash
export WIN_CSC_LINK="/path/to/certificate.p12"
export WIN_CSC_KEY_PASSWORD="certificate-password"
```

Alternative (for certificates in Windows Certificate Store):
```bash
export WIN_CSC_SUBJECT_NAME="Certificate Subject Name"
export WIN_CSC_SHA1="certificate-sha1-hash"
```

Steps to set up:
1. Obtain code signing certificate from trusted CA
2. Install certificate or save as .p12/.pfx file
3. Set environment variables

## Build Artifacts

After successful build, the following artifacts are generated in `dist/`:

### macOS
- `RSS ニュース電光掲示板-1.0.0-arm64.dmg` - DMG installer for Apple Silicon
- `RSS ニュース電光掲示板-1.0.0-x64.dmg` - DMG installer for Intel Macs
- `RSS ニュース電光掲示板-1.0.0-arm64-mac.zip` - ZIP archive for Apple Silicon
- `RSS ニュース電光掲示板-1.0.0-x64-mac.zip` - ZIP archive for Intel Macs

### Windows
- `RSS ニュース電光掲示板 Setup 1.0.0.exe` - NSIS installer
- `RSS ニュース電光掲示板 1.0.0.exe` - Portable executable
- `RSS ニュース電光掲示板-1.0.0.msi` - MSI installer

### Linux
- `RSS ニュース電光掲示板-1.0.0.AppImage` - AppImage (universal)
- `rss-news-ticker_1.0.0_amd64.deb` - Debian package
- `rss-news-ticker-1.0.0.x86_64.rpm` - RPM package
- `rss-news-ticker_1.0.0_amd64.snap` - Snap package
- `RSS ニュース電光掲示板-1.0.0.tar.gz` - Compressed archive

## Icon Configuration

The application uses `build/icon.png` as the source icon. The build process automatically converts this to platform-specific formats:

- **macOS**: .icns format with multiple resolutions (16x16 to 1024x1024)
- **Windows**: .ico format with multiple resolutions (16x16 to 256x256)
- **Linux**: PNG format with various sizes

## Build Validation

The build system includes comprehensive validation:

1. **Environment Check**: Validates Node.js version and electron-builder availability
2. **Configuration Validation**: Checks electron-builder.config.js and package.json
3. **Asset Validation**: Ensures required build assets are present
4. **Code Signing Check**: Validates signing certificate availability
5. **Output Validation**: Verifies build artifacts after completion

## Troubleshooting

### Common Issues

#### Code Signing Failures
- **macOS**: Ensure Developer ID certificate is installed and valid
- **Windows**: Check certificate file path and password
- **Solution**: Verify environment variables and certificate validity

#### Build Failures
- **Missing Dependencies**: Run `npm install` to ensure all dependencies are installed
- **Platform Issues**: Some targets may not be available on all host platforms
- **Solution**: Use platform-specific build commands or CI/CD for cross-platform builds

#### Icon Issues
- **Missing Icons**: Ensure `build/icon.png` exists and is valid
- **Format Issues**: Icon should be PNG format, preferably 1024x1024 pixels
- **Solution**: Regenerate icons using `node build/scripts/generate-icons.js`

### Debug Mode

Enable debug output for troubleshooting:
```bash
DEBUG=electron-builder npm run build:all
```

## CI/CD Integration

For automated builds in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Build for all platforms
  run: npm run build:all
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
    WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
```

## Version Management

The build system supports automatic version management:

```bash
# Increment patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Increment minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Increment major version (1.0.0 -> 2.0.0)
npm run version:major
```

## Security Considerations

1. **Code Signing**: Always sign releases for distribution
2. **Notarization**: Required for macOS Gatekeeper compatibility
3. **Certificate Storage**: Store certificates securely, use environment variables
4. **Build Environment**: Use clean, isolated build environments for releases

## Performance Optimization

1. **Compression**: Maximum compression is enabled for smaller installers
2. **File Exclusion**: Development files and unnecessary dependencies are excluded
3. **Architecture Targeting**: Separate builds for different CPU architectures
4. **Incremental Builds**: Use `--dir` flag for faster development builds

## Support

For build-related issues:
1. Check this documentation
2. Validate configuration with `npm run build:validate`
3. Test with quick build: `npm run build:quick`
4. Check electron-builder documentation: https://www.electron.build/