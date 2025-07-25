#!/usr/bin/env node

/**
 * Build workflow testing script for RSS ニュース電光掲示板アプリ
 * This script tests the complete build-to-distribution workflow
 * including version management, cross-platform builds, and validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getCurrentVersion, getBuildMetadata } = require('./version-manager');

/**
 * Execute command and capture output
 * @param {string} command - Command to execute
 * @param {string} description - Description for logging
 * @returns {string} Command output
 */
function executeCommand(command, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`Command: ${command}`);
  
  try {
    const output = execSync(command, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8',
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    console.log(`✅ ${description} - PASSED`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} - FAILED`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

/**
 * Test version management functionality
 */
function testVersionManagement() {
  console.log('\n📋 Testing Version Management');
  console.log('==============================');
  
  // Get current version
  const initialVersion = getCurrentVersion();
  console.log(`Initial version: ${initialVersion}`);
  
  // Test version increment (dry run by backing up and restoring)
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const packageBackup = fs.readFileSync(packageJsonPath, 'utf8');
  
  try {
    // Test patch increment
    executeCommand('npm run version:patch', 'Patch version increment');
    const patchVersion = getCurrentVersion();
    console.log(`After patch increment: ${patchVersion}`);
    
    // Test minor increment
    executeCommand('npm run version:minor', 'Minor version increment');
    const minorVersion = getCurrentVersion();
    console.log(`After minor increment: ${minorVersion}`);
    
    // Test major increment
    executeCommand('npm run version:major', 'Major version increment');
    const majorVersion = getCurrentVersion();
    console.log(`After major increment: ${majorVersion}`);
    
    // Check build metadata
    const buildMetadata = getBuildMetadata();
    if (buildMetadata) {
      console.log(`✅ Build metadata present: ${buildMetadata.buildNumber}`);
    } else {
      console.log('⚠️  No build metadata found');
    }
    
  } finally {
    // Restore original package.json
    fs.writeFileSync(packageJsonPath, packageBackup);
    console.log(`Restored version to: ${getCurrentVersion()}`);
  }
}

/**
 * Test build configuration validation
 */
function testBuildValidation() {
  console.log('\n🔍 Testing Build Validation');
  console.log('============================');
  
  executeCommand('npm run build:validate', 'Build configuration validation');
}

/**
 * Test quick build (directory only)
 */
function testQuickBuild() {
  console.log('\n⚡ Testing Quick Build');
  console.log('======================');
  
  executeCommand('npm run build:quick', 'Quick build (directory only)');
  
  // Check if build output exists
  const distDir = path.join(__dirname, '../../dist');
  if (fs.existsSync(distDir)) {
    const contents = fs.readdirSync(distDir);
    console.log(`✅ Build output directory contains ${contents.length} items`);
    
    // Look for main application files
    const hasMainFiles = contents.some(item => 
      item.includes('RSS') || 
      item.includes('rss-news-ticker') ||
      item.endsWith('.app') ||
      item.endsWith('.exe')
    );
    
    if (hasMainFiles) {
      console.log('✅ Application files found in build output');
    } else {
      console.log('⚠️  No recognizable application files found');
    }
  } else {
    throw new Error('Build output directory not found');
  }
}

/**
 * Test cross-platform build detection
 */
function testCrossPlatformDetection() {
  console.log('\n🌐 Testing Cross-Platform Detection');
  console.log('====================================');
  
  const { getHostPlatform, checkPlatformSupport } = require('./cross-platform-build');
  
  const hostInfo = getHostPlatform();
  console.log(`Host platform: ${hostInfo.platform} (${hostInfo.arch})`);
  console.log(`Supported targets: ${hostInfo.supported.join(', ')}`);
  console.log(`Native target: ${hostInfo.native}`);
  
  // Test platform support checking
  const platforms = ['mac', 'win', 'linux'];
  platforms.forEach(platform => {
    const support = checkPlatformSupport(platform);
    const status = support.supported ? '✅' : '❌';
    const native = support.native ? ' (native)' : '';
    
    console.log(`${status} ${platform}${native}`);
    
    if (support.limitations) {
      console.log(`  ℹ️  ${support.limitations}`);
    }
  });
}

/**
 * Test build scripts availability
 */
function testBuildScripts() {
  console.log('\n📜 Testing Build Scripts');
  console.log('=========================');
  
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
  const buildScripts = Object.keys(packageJson.scripts).filter(script => 
    script.startsWith('build') || 
    script.startsWith('release') || 
    script.startsWith('version')
  );
  
  console.log(`Found ${buildScripts.length} build-related scripts:`);
  buildScripts.forEach(script => {
    console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`);
  });
  
  // Test script files exist
  const scriptFiles = [
    'build/scripts/version-manager.js',
    'build/scripts/build-all.js',
    'build/scripts/cross-platform-build.js',
    'build/scripts/validate-build.js',
    'build/scripts/generate-icons.js'
  ];
  
  console.log('\nBuild script files:');
  scriptFiles.forEach(scriptFile => {
    const exists = fs.existsSync(path.join(__dirname, '../..', scriptFile));
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${scriptFile}`);
  });
}

/**
 * Test environment detection
 */
function testEnvironmentDetection() {
  console.log('\n🔧 Testing Environment Detection');
  console.log('=================================');
  
  // Check Node.js version
  console.log(`Node.js version: ${process.version}`);
  
  // Check npm version
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`npm version: ${npmVersion}`);
  } catch (error) {
    console.log('❌ npm not available');
  }
  
  // Check electron-builder
  try {
    const builderVersion = execSync('npx electron-builder --version', { encoding: 'utf8' }).trim();
    console.log(`electron-builder version: ${builderVersion}`);
  } catch (error) {
    console.log('❌ electron-builder not available');
  }
  
  // Check code signing environment
  const signingEnvs = {
    macOS: ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID', 'APPLE_IDENTITY'],
    Windows: ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD']
  };
  
  console.log('\nCode signing environment:');
  Object.entries(signingEnvs).forEach(([platform, envVars]) => {
    const available = envVars.filter(env => process.env[env]);
    const status = available.length > 0 ? '✅' : '⚠️ ';
    console.log(`  ${status} ${platform}: ${available.length}/${envVars.length} variables set`);
  });
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  console.log('\n📊 Build Workflow Test Report');
  console.log('==============================');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  ❌ ${result.name}: ${result.error}`);
    });
  }
  
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`\nSuccess rate: ${successRate}%`);
  
  if (successRate >= 80) {
    console.log('🎉 Build workflow is ready for production use!');
  } else if (successRate >= 60) {
    console.log('⚠️  Build workflow has some issues but is functional');
  } else {
    console.log('❌ Build workflow needs significant fixes');
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🚀 Starting Build Workflow Test Suite');
  console.log('======================================');
  
  const tests = [
    { name: 'Environment Detection', fn: testEnvironmentDetection },
    { name: 'Build Scripts', fn: testBuildScripts },
    { name: 'Cross-Platform Detection', fn: testCrossPlatformDetection },
    { name: 'Build Validation', fn: testBuildValidation },
    { name: 'Version Management', fn: testVersionManagement },
    { name: 'Quick Build', fn: testQuickBuild }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, passed: true });
    } catch (error) {
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }
  
  generateTestReport(results);
  
  const failedCount = results.filter(r => !r.passed).length;
  if (failedCount > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testVersionManagement,
  testBuildValidation,
  testQuickBuild,
  testCrossPlatformDetection,
  testBuildScripts,
  testEnvironmentDetection
};