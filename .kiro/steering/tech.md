# Technology Stack

## Core Framework
- **Electron 36.4.0**: Desktop application framework
- **Node.js 20.15.0+**: Runtime environment

## Dependencies
- **rss-parser 3.13.0**: RSS feed parsing and fetching
- **electron-store 10.0.1**: Settings persistence and data storage

## Development Tools
- **Jest 29.7.0**: Unit testing framework with jsdom environment
- **Playwright 1.52.0**: End-to-end integration testing
- **@types/jest**: TypeScript definitions for Jest

## Architecture Pattern
- **Main Process**: Electron main process (`main.js`) handles system integration, RSS management, and IPC
- **Renderer Process**: Frontend UI (`renderer.js`, `settings.js`) handles display logic and user interactions
- **Modular Services**: Separate classes for RSS management, storage, and logging

## Common Commands

### Development
```bash
npm start              # Start the application
npm run dev           # Development mode with detailed logging
npm run debug         # Debug mode with console output
```

### Testing
```bash
npm test              # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:integration    # Run Playwright E2E tests
npm run test:integration:ui # Run E2E tests with UI
npm run test:all      # Run all tests (unit + integration)
```

### Debug Options
```bash
electron . --debug    # Enable debug logging
electron . -d         # Short form debug flag
DEBUG_MODE=true electron .  # Environment variable debug
```

## Code Quality Standards
- **100% Test Coverage**: All functionality must be covered by unit tests
- **E2E Testing**: Critical user flows tested with Playwright
- **Error Handling**: Graceful degradation for RSS fetch failures
- **Logging**: Conditional debug logging (off by default, enabled in dev/debug modes)