# Project Structure

## Root Level Files
- **main.js**: Electron main process entry point - handles app lifecycle, window management, IPC, system integration
- **renderer.js**: Main window renderer process - ticker display logic, news scrolling, UI interactions
- **index.html**: Main application window - electric scoreboard display
- **settings.html**: Settings window UI
- **settings.js**: Settings window renderer process
- **package.json**: Dependencies and npm scripts

## Source Code (`src/`)
- **rss-manager.js**: RSS feed fetching, parsing, and management class
- **store-manager.js**: Settings persistence using electron-store
- **logger.js**: Conditional logging utility (debug mode only)

## Styling
- **styles.css**: Main application styles with CSS custom properties
- **themes.css**: Theme presets (dark, light, matrix, retro, ocean, etc.)
- **settings.css**: Settings window specific styles

## Testing (`tests/`)
- **unit/**: Jest unit tests for core functionality
  - `rss.test.js`: RSS manager tests
  - `storage.test.js`: Store manager tests  
  - `ui.test.js`: UI component tests
- **integration/**: Playwright E2E tests
  - `app-startup.spec.js`: Application startup tests
  - `display.spec.js`: Display functionality tests
  - `settings.spec.js`: Settings window tests
- **__mocks__/**: Mock implementations for Electron APIs

## Assets
- **assets/**: Application icons (icon.png, tray-icon.png)

## Configuration Files
- **jest.config.js**: Unit test configuration with Electron mocks
- **playwright.config.js**: E2E test configuration for Electron apps
- **.nvmrc**: Node.js version specification

## Generated Directories
- **coverage/**: Jest test coverage reports
- **test-results/**: Playwright test artifacts and traces
- **playwright-report/**: HTML test reports
- **node_modules/**: Dependencies

## File Naming Conventions
- **Kebab-case**: For main files (rss-manager.js, store-manager.js)
- **Camel-case**: For class names and methods
- **Japanese**: UI text and comments
- **English**: Variable names and technical identifiers