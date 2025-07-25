# Implementation Plan

- [x] 1. Set up build configuration and dependencies
  - Install electron-builder as development dependency
  - Create electron-builder.config.js with platform-specific configurations
  - Update package.json with build scripts and metadata
  - Configure output directories and file inclusion patterns
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_

- [x] 2. Implement AutostartManager core functionality
  - Create src/autostart-manager.js with cross-platform autostart management
  - Implement platform detection and method selection logic
  - Add isEnabled(), enable(), disable(), and toggle() methods
  - Write unit tests for AutostartManager class functionality
  - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 3.5_

- [x] 3. Integrate autostart settings into UI
  - Add autostart checkbox to settings.html with Japanese label "OS起動時に自動起動する"
  - Update settings.js to handle autostart toggle interactions
  - Implement IPC communication between renderer and main process for autostart operations
  - Add error handling and user feedback for autostart failures
  - _Requirements: 2.1, 2.6, 3.4_

- [x] 4. Update main process for autostart integration
  - Initialize AutostartManager instance in main.js
  - Handle autostart-related IPC messages from settings window
  - Implement startup behavior detection (launched via autostart vs manual)
  - Add system tray minimization when started via autostart
  - _Requirements: 2.4, 2.5_

- [x] 5. Implement platform-specific autostart methods
  - Add macOS Login Items implementation using app.setLoginItemSettings()
  - Add Windows Registry implementation using app.setLoginItemSettings()
  - Add Linux .desktop file creation for ~/.config/autostart/ directory
  - Test platform-specific implementations with proper error handling
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Add comprehensive error handling and logging
  - Implement error handling for permission denied scenarios
  - Add fallback behavior for unsupported platforms
  - Integrate with existing logger.js for debug output
  - Create user-friendly error messages in Japanese
  - _Requirements: 3.4_

- [x] 7. Create unit tests for autostart functionality
  - Write tests/unit/autostart.test.js for AutostartManager methods
  - Test platform detection and method selection logic
  - Test enable/disable operations with mocked system calls
  - Test error handling scenarios and edge cases
  - _Requirements: 2.2, 2.3, 3.5_

- [x] 8. Create integration tests for autostart UI
  - Write tests/integration/autostart.spec.js for end-to-end autostart functionality
  - Test settings UI checkbox interactions
  - Test IPC communication between processes
  - Test error handling and user feedback flows
  - _Requirements: 2.1, 2.6, 3.4_

- [x] 9. Configure build process for distribution
  - Set up platform-specific build configurations in electron-builder.config.js
  - Configure code signing settings for macOS and Windows
  - Set up proper app metadata and icons for installers
  - Test build process for all target platforms
  - _Requirements: 1.1, 1.2, 4.2, 4.4_

- [x] 10. Test installation and uninstallation process
  - Create tests/integration/packaging.spec.js for build validation
  - Test installer creation for macOS (.dmg), Windows (.exe), and Linux (.AppImage)
  - Verify application appears in system menus after installation
  - Test proper cleanup during uninstallation process
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 11. Implement version management and build automation
  - Configure automatic version incrementing in build process
  - Set up build scripts for cross-platform compilation
  - Add package metadata validation
  - Test complete build-to-distribution workflow
  - _Requirements: 4.5_

- [x] 12. Final integration and system testing
  - Test complete autostart workflow from installation to system boot
  - Verify settings persistence across application restarts
  - Test system tray minimization behavior on autostart
  - Validate cross-platform consistency of autostart functionality
  - _Requirements: 2.4, 2.5, 2.6, 3.1, 3.2, 3.3_