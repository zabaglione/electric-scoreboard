# Design Document - App Distribution and Autostart

## Overview

This design document outlines the implementation of application distribution and autostart functionality for the RSS ニュース電光掲示板アプリ. The solution will transform the current development-only Electron application into a distributable desktop application with cross-platform autostart capabilities.

The design focuses on two main areas:
1. **Application Packaging**: Using electron-builder to create platform-specific installers
2. **Autostart Management**: Cross-platform system integration for automatic startup

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Distribution Layer                        │
├─────────────────────────────────────────────────────────────┤
│  electron-builder  │  Platform Installers  │  Code Signing  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│     Main Process    │    Settings UI     │   Autostart     │
│    (main.js)        │  (settings.js)     │   Manager       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   System Integration                        │
├─────────────────────────────────────────────────────────────┤
│  macOS Login Items  │  Windows Registry  │  Linux Desktop  │
└─────────────────────────────────────────────────────────────┘
```

### Build System Architecture

The build system will use electron-builder as the primary packaging tool, configured to generate platform-specific installers with proper metadata and signing.

## Components and Interfaces

### 1. Build Configuration Component

**Purpose**: Configure electron-builder for multi-platform distribution

**Key Files**:
- `electron-builder.config.js` - Main build configuration
- Updated `package.json` - Build scripts and metadata

**Configuration Structure**:
```javascript
{
  appId: "com.rss-news-ticker.app",
  productName: "RSS ニュース電光掲示板",
  directories: {
    output: "dist"
  },
  files: [...],
  mac: { /* macOS specific config */ },
  win: { /* Windows specific config */ },
  linux: { /* Linux specific config */ }
}
```

### 2. Autostart Manager Component

**Purpose**: Cross-platform autostart functionality management

**Location**: `src/autostart-manager.js`

**Interface**:
```javascript
class AutostartManager {
  async isEnabled()           // Check if autostart is currently enabled
  async enable()              // Enable autostart for current platform
  async disable()             // Disable autostart for current platform
  async toggle()              // Toggle autostart state
  getPlatformMethod()         // Get current platform's autostart method
}
```

**Platform-Specific Implementations**:
- **macOS**: Uses `app.setLoginItemSettings()` for Login Items
- **Windows**: Registry manipulation via `app.setLoginItemSettings()`
- **Linux**: Creates `.desktop` file in `~/.config/autostart/`

### 3. Settings Integration Component

**Purpose**: UI integration for autostart toggle

**Location**: `settings.js` (existing file)

**New Elements**:
- Checkbox input for autostart toggle
- Status indicator for current autostart state
- Error handling for autostart failures

**Interface Updates**:
```javascript
// Add to existing settings object
settings.autostart = {
  enabled: false,
  toggle: async function() { /* implementation */ },
  updateUI: function() { /* implementation */ }
}
```

### 4. Main Process Integration

**Purpose**: Initialize autostart manager and handle IPC

**Location**: `main.js` (existing file)

**New Functionality**:
- Initialize AutostartManager instance
- Handle autostart-related IPC messages
- Manage startup behavior when launched via autostart

## Data Models

### Build Metadata Model

```javascript
{
  name: "rss-news-ticker",
  productName: "RSS ニュース電光掲示板",
  version: "1.0.0",
  description: "RSS feed electric scoreboard display",
  author: "Developer Name",
  main: "main.js",
  build: {
    appId: "com.rss-news-ticker.app",
    // Platform-specific configurations
  }
}
```

### Autostart Settings Model

```javascript
{
  autostart: {
    enabled: boolean,           // Current autostart state
    platform: string,           // Current platform (darwin/win32/linux)
    method: string,             // Platform-specific method used
    lastError: string | null    // Last error encountered
  }
}
```

### Platform Configuration Model

```javascript
{
  darwin: {
    method: "loginItems",
    settings: {
      openAtLogin: boolean,
      openAsHidden: boolean
    }
  },
  win32: {
    method: "registry",
    settings: {
      openAtLogin: boolean,
      openAsHidden: boolean,
      path: string,
      args: string[]
    }
  },
  linux: {
    method: "desktop",
    settings: {
      desktopFile: string,
      autostartDir: string
    }
  }
}
```

## Error Handling

### Build Process Errors

1. **Missing Dependencies**: Validate required build tools before starting
2. **Platform Compatibility**: Handle cross-platform build limitations
3. **Code Signing Failures**: Graceful degradation when signing certificates unavailable
4. **Output Directory Issues**: Ensure proper permissions and disk space

### Autostart Errors

1. **Permission Denied**: Handle cases where system doesn't allow autostart registration
2. **Platform Detection**: Fallback behavior for unsupported platforms
3. **Registry Access**: Windows-specific error handling for registry operations
4. **File System Errors**: Linux desktop file creation failures

**Error Handling Strategy**:
```javascript
try {
  await autostartManager.enable();
  showSuccessMessage("自動起動が有効になりました");
} catch (error) {
  logger.error("Autostart enable failed:", error);
  showErrorMessage(`自動起動の設定に失敗しました: ${error.message}`);
  // Revert UI state
  updateAutostartCheckbox(false);
}
```

## Testing Strategy

### Unit Tests

**New Test Files**:
- `tests/unit/autostart.test.js` - AutostartManager functionality
- `tests/unit/build-config.test.js` - Build configuration validation

**Test Coverage Areas**:
- Platform detection logic
- Autostart enable/disable operations
- Settings persistence
- Error handling scenarios

### Integration Tests

**New Test Files**:
- `tests/integration/autostart.spec.js` - End-to-end autostart functionality
- `tests/integration/packaging.spec.js` - Build process validation

**Test Scenarios**:
- Settings UI autostart toggle
- Application startup behavior
- Cross-platform compatibility
- Error recovery flows

### Build Testing

**Automated Build Validation**:
- Platform-specific installer generation
- Package integrity verification
- Installation/uninstallation testing
- Autostart functionality after installation

## Implementation Decisions and Rationales

### 1. electron-builder Choice

**Decision**: Use electron-builder instead of electron-packager or electron-forge

**Rationale**:
- Comprehensive platform support with minimal configuration
- Built-in code signing and notarization support
- Active maintenance and extensive documentation
- Seamless integration with existing Electron applications

### 2. Cross-Platform Autostart Strategy

**Decision**: Use Electron's built-in `app.setLoginItemSettings()` where possible, with custom Linux implementation

**Rationale**:
- Leverages Electron's native platform abstractions
- Reduces external dependencies
- Consistent API across macOS and Windows
- Linux requires custom implementation due to Electron limitations

### 3. Settings Integration Approach

**Decision**: Extend existing settings system rather than creating separate autostart configuration

**Rationale**:
- Maintains consistency with existing UI patterns
- Leverages existing electron-store persistence
- Reduces code duplication
- Familiar user experience

### 4. Startup Behavior Design

**Decision**: Start minimized to system tray when launched via autostart

**Rationale**:
- Non-intrusive user experience
- Follows desktop application conventions
- Allows users to access the application when needed
- Reduces visual clutter on system startup

### 5. Error Handling Philosophy

**Decision**: Graceful degradation with user feedback

**Rationale**:
- Autostart is a convenience feature, not critical functionality
- Users should be informed of failures but application should continue working
- Provides troubleshooting information for support
- Maintains application stability

## Security Considerations

### Code Signing

- **macOS**: Developer ID Application certificate required for distribution
- **Windows**: Code signing certificate recommended for Windows Defender compatibility
- **Linux**: GPG signing for package integrity

### Permission Requirements

- **macOS**: No special permissions required for Login Items
- **Windows**: Standard user permissions sufficient for registry access
- **Linux**: File system access to user's autostart directory

### Privacy Implications

- Autostart registration is stored in system-specific locations
- No network communication required for autostart functionality
- Settings stored locally using existing electron-store mechanism