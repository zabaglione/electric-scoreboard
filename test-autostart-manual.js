#!/usr/bin/env node

/**
 * Manual test script for AutostartManager platform-specific implementations
 * This script can be run to test the actual autostart functionality
 */

const { app } = require('electron');
const AutostartManager = require('./src/autostart-manager');
const Logger = require('./src/logger');

// Initialize logger in debug mode
const logger = new Logger(true);

async function testAutostartManager() {
  console.log('=== AutostartManager Platform-Specific Implementation Test ===\n');
  
  const autostartManager = new AutostartManager(logger);
  
  try {
    // Test platform detection
    console.log(`Current platform: ${process.platform}`);
    console.log(`Platform method: ${autostartManager.getPlatformMethod()}`);
    
    // Test platform support
    const isSupported = await autostartManager.isPlatformSupported();
    console.log(`Platform supported: ${isSupported}`);
    
    if (!isSupported) {
      console.log('Platform not supported, skipping tests');
      return;
    }
    
    // Test current status
    const initialStatus = await autostartManager.isEnabled();
    console.log(`Initial autostart status: ${initialStatus}`);
    
    // Test enable
    console.log('\n--- Testing Enable ---');
    await autostartManager.enable();
    const enabledStatus = await autostartManager.isEnabled();
    console.log(`Status after enable: ${enabledStatus}`);
    
    // Test disable
    console.log('\n--- Testing Disable ---');
    await autostartManager.disable();
    const disabledStatus = await autostartManager.isEnabled();
    console.log(`Status after disable: ${disabledStatus}`);
    
    // Test toggle
    console.log('\n--- Testing Toggle ---');
    const toggleResult1 = await autostartManager.toggle();
    console.log(`Toggle result (should enable): ${toggleResult1}`);
    const statusAfterToggle1 = await autostartManager.isEnabled();
    console.log(`Status after first toggle: ${statusAfterToggle1}`);
    
    const toggleResult2 = await autostartManager.toggle();
    console.log(`Toggle result (should disable): ${toggleResult2}`);
    const statusAfterToggle2 = await autostartManager.isEnabled();
    console.log(`Status after second toggle: ${statusAfterToggle2}`);
    
    console.log('\n=== All tests completed successfully! ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Only run if this is the main module
if (require.main === module) {
  // Initialize Electron app for testing
  app.whenReady().then(async () => {
    await testAutostartManager();
    app.quit();
  });
  
  app.on('window-all-closed', () => {
    app.quit();
  });
}

module.exports = testAutostartManager;