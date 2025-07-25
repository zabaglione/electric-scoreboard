# Build Automation Documentation

RSS ニュース電光掲示板アプリの自動ビルドシステム完全ガイド

## Overview

このドキュメントでは、RSS ニュース電光掲示板アプリケーションの完全自動化されたビルドシステムについて説明します。バージョン管理、クロスプラットフォームビルド、配布パッケージ生成、品質保証を含む包括的なワークフローを提供します。

## Build System Architecture

```
Build Automation System
├── Version Management
│   ├── Automatic version incrementing
│   ├── Build metadata generation
│   └── Package validation
├── Cross-Platform Compilation
│   ├── Platform detection
│   ├── Target validation
│   └── Environment checking
├── Build Validation
│   ├── Configuration validation
│   ├── Asset verification
│   └── Output testing
└── Distribution Workflow
    ├── Code signing
    ├── Package generation
    └── Artifact validation
```

## Version Management System

### Automatic Version Incrementing

The build system supports semantic versioning with automatic increment:

```bash
# Increment patch version (1.0.0 → 1.0.1)
npm run version:patch

# Increment minor version (1.0.0 → 1.1.0)
npm run version:minor

# Increment major version (1.0.0 → 2.0.0)
npm run version:major

# Check current version
npm run version:current
```

### Build Metadata

Each build automatically generates metadata:

```json
{
  "buildMetadata": {
    "buildNumber": "20250125143022",
    "buildDate": "2025-01-25T14:30:22.123Z",
    "nodeVersion": "v20.15.0",
    "platform": "darwin",
    "arch": "arm64"
  }
}
```

### Package Validation

Before version increment, the system validates:
- Required package.json fields
- Version format compliance
- Metadata completeness
- Build script availability

## Cross-Platform Build System

### Platform Support Matrix

| Host Platform | macOS | Windows | Linux | Notes |
|---------------|-------|---------|-------|-------|
| macOS         | ✅ Native | ✅ Cross | ✅ Cross | Full signing support |
| Windows       | ⚠️ Limited | ✅ Native | ✅ Cross | No macOS signing |
| Linux         | ❌ No | ⚠️ Limited | ✅ Native | No macOS builds |

### Build Commands

#### Standard Builds
```bash
# Build for all platforms
npm run build:all

# Platform-specific builds
npm run build:mac
npm run build:win
npm run build:linux

# Quick development build
npm run build:quick
```

#### Cross-Platform Builds
```bash
# Enhanced cross-platform build
npm run build:cross

# Platform-specific cross builds
npm run build:cross:mac
npm run build:cross:win
npm run build:cross:linux
```

#### Release Builds
```bash
# Release with version increment
npm run release:all
npm run release:cross

# Platform-specific releases
npm run release:mac
npm run release:win
npm run release:linux
```

### Platform-Specific Configurations

#### macOS
- **Targets**: DMG installer, ZIP archive
- **Architectures**: x64 (Intel), arm64 (Apple Silicon)
- **Code Signing**: Developer ID Application certificate
- **Notarization**: Apple notarization service
- **Requirements**: macOS 10.14+ (Mojave)

#### Windows
- **Targets**: NSIS installer, Portable executable, MSI package
- **Architectures**: x64, ia32 (32-bit)
- **Code Signing**: Authenticode certificate
- **Installer Features**: Custom installation directory, desktop shortcuts
- **Requirements**: Windows 7+

#### Linux
- **Targets**: AppImage, DEB, RPM, Snap, tar.gz
- **Architectures**: x64, arm64
- **Desktop Integration**: .desktop files, system menu entries
- **Dependencies**: libnotify, libxtst, nss
- **Requirements**: Modern Linux distributions

## Build Validation System

### Pre-Build Validation

```bash
# Comprehensive build validation
npm run build:validate

# Test complete build workflow
npm run build:test
```

The validation system checks:

1. **Environment Validation**
   - Node.js version compatibility
   - electron-builder availability
   - Platform-specific tools

2. **Configuration Validation**
   - electron-builder.config.js syntax
   - Required configuration fields
   - Platform-specific settings

3. **Asset Validation**
   - Application icons
   - Build scripts
   - Required files

4. **Code Signing Validation**
   - Certificate availability
   - Environment variables
   - Platform compatibility

### Post-Build Validation

After build completion, the system validates:
- Build artifact generation
- File sizes and formats
- Package integrity
- Installation compatibility

## Code Signing Integration

### Environment Setup

#### macOS Code Signing
```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
export APPLE_IDENTITY="Developer ID Application: Your Name"
```

#### Windows Code Signing
```bash
export WIN_CSC_LINK="/path/to/certificate.p12"
export WIN_CSC_KEY_PASSWORD="certificate-password"
```

### Signing Status Detection

The build system automatically detects:
- Available signing certificates
- Environment variable configuration
- Platform-specific signing capabilities
- Fallback to unsigned builds when necessary

## Build Artifacts

### Output Structure

```
dist/
├── macOS/
│   ├── RSS ニュース電光掲示板-1.0.0-arm64.dmg
│   ├── RSS ニュース電光掲示板-1.0.0-x64.dmg
│   ├── RSS ニュース電光掲示板-1.0.0-arm64-mac.zip
│   └── RSS ニュース電光掲示板-1.0.0-x64-mac.zip
├── Windows/
│   ├── RSS ニュース電光掲示板 Setup 1.0.0.exe
│   ├── RSS ニュース電光掲示板 1.0.0.exe
│   └── RSS ニュース電光掲示板-1.0.0.msi
└── Linux/
    ├── RSS ニュース電光掲示板-1.0.0.AppImage
    ├── rss-news-ticker_1.0.0_amd64.deb
    ├── rss-news-ticker-1.0.0.x86_64.rpm
    ├── rss-news-ticker_1.0.0_amd64.snap
    └── RSS ニュース電光掲示板-1.0.0.tar.gz
```

### Artifact Naming Convention

- **Product Name**: RSS ニュース電光掲示板
- **Version**: Semantic versioning (major.minor.patch)
- **Architecture**: x64, arm64, ia32
- **Platform**: mac, win, linux
- **Format**: Platform-specific extensions

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Validate build configuration
      run: npm run build:validate
    
    - name: Test build workflow
      run: npm run build:test
    
    - name: Build application
      run: npm run build:cross
      env:
        APPLE_ID: ${{ secrets.APPLE_ID }}
        APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
        APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        WIN_CSC_LINK: ${{ secrets.WIN_CSC_LINK }}
        WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CSC_KEY_PASSWORD }}
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: dist-${{ matrix.os }}
        path: dist/
        retention-days: 30
```

### Environment Variables for CI/CD

Required secrets for automated builds:

#### macOS Signing
- `APPLE_ID`: Apple Developer account email
- `APPLE_ID_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

#### Windows Signing
- `WIN_CSC_LINK`: Base64-encoded certificate file
- `WIN_CSC_KEY_PASSWORD`: Certificate password

## Build Performance Optimization

### Parallel Builds

The system supports parallel builds for different architectures:
```bash
# Build multiple architectures simultaneously
npm run build:cross -- --parallel
```

### Incremental Builds

For development, use quick builds:
```bash
# Directory-only build (no packaging)
npm run build:quick

# Skip validation for faster builds
npm run build:cross -- --skip-validation
```

### Build Caching

Optimize build times with:
- Node.js module caching
- electron-builder cache
- Platform-specific optimizations

## Error Handling and Recovery

### Common Build Issues

#### Code Signing Failures
```bash
# Check signing environment
npm run build:validate

# Build without signing
npm run build:cross -- --skip-signing
```

#### Platform Compatibility Issues
```bash
# Check platform support
node build/scripts/cross-platform-build.js --help

# Build for current platform only
npm run build:cross:$(uname -s | tr '[:upper:]' '[:lower:]')
```

#### Missing Dependencies
```bash
# Reinstall dependencies
npm ci

# Rebuild native modules
npm rebuild
```

### Recovery Procedures

1. **Build Failure Recovery**
   - Check error logs
   - Validate environment
   - Clean build cache
   - Retry with verbose logging

2. **Version Rollback**
   ```bash
   # Restore from git if version increment fails
   git checkout -- package.json
   ```

3. **Clean Build Environment**
   ```bash
   # Remove build artifacts
   rm -rf dist/
   rm -rf node_modules/
   npm ci
   ```

## Monitoring and Reporting

### Build Metrics

The system tracks:
- Build duration per platform
- Artifact sizes
- Success/failure rates
- Code signing status

### Build Reports

Automated reports include:
- Platform compatibility matrix
- Code signing status
- Build artifact inventory
- Performance metrics

### Logging

Comprehensive logging covers:
- Build process steps
- Error conditions
- Performance metrics
- Environment details

## Security Considerations

### Certificate Management

- Store certificates securely
- Use environment variables for passwords
- Rotate certificates before expiration
- Monitor certificate validity

### Build Environment Security

- Use isolated build environments
- Validate dependencies
- Scan for vulnerabilities
- Implement access controls

### Distribution Security

- Sign all release builds
- Verify artifact integrity
- Use secure distribution channels
- Monitor for tampering

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Monthly**
   - Update dependencies
   - Check certificate expiration
   - Review build performance

2. **Quarterly**
   - Update build tools
   - Review platform support
   - Optimize build scripts

3. **Annually**
   - Renew code signing certificates
   - Review security practices
   - Update documentation

### Upgrade Procedures

When updating the build system:
1. Test in development environment
2. Validate with existing projects
3. Update documentation
4. Train team members
5. Deploy to production

## Troubleshooting Guide

### Build System Diagnostics

```bash
# Run comprehensive diagnostics
npm run build:test

# Check specific components
npm run build:validate
npm run version:current
npm run build:metadata
```

### Common Solutions

| Issue | Solution |
|-------|----------|
| Version increment fails | Check package.json syntax |
| Code signing fails | Verify certificates and environment |
| Cross-platform build fails | Check platform support matrix |
| Build artifacts missing | Verify build completion |
| Performance issues | Use parallel builds and caching |

### Support Resources

- [Build System Documentation](./BUILD.md)
- [Code Signing Guide](./CODE_SIGNING.md)
- [electron-builder Documentation](https://www.electron.build/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

## Future Enhancements

### Planned Features

1. **Advanced Version Management**
   - Pre-release versioning
   - Branch-specific versioning
   - Changelog generation

2. **Enhanced Cross-Platform Support**
   - Docker-based builds
   - Cloud build services
   - ARM architecture support

3. **Improved Monitoring**
   - Build analytics dashboard
   - Performance trending
   - Automated alerts

4. **Security Enhancements**
   - Vulnerability scanning
   - Supply chain security
   - Automated certificate renewal

This build automation system provides a robust, scalable foundation for distributing the RSS ニュース電光掲示板アプリ across all major desktop platforms with professional-grade quality assurance and security practices.