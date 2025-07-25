#!/usr/bin/env node

/**
 * Comprehensive build script for RSS ニュース電光掲示板アプリ
 * This script handles the complete build process including:
 * - Icon generation
 * - Version management
 * - Platform-specific builds
 * - Build validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { incrementVersion } = require('./version-manager');

// Build configuration
const BUILD_CONFIG = {
  platforms: {
    mac: ['--mac'],
    win: ['--win'],
    linux: ['--linux'],
    all: ['--mac', '--win', '--linux']
  },
  
  // Environment validation
  requiredForSigning: {
    mac: ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID'],
    win: ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD']
  }
};

/**
 * Execute a command and log the output
 * @param {string} command - Command to execute
 * @param {string} description - Description of the command
 */
function executeCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    console.log(`✅ ${description} completed successfully`);
    return output;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

/**
 * Check if code signing environment variables are available
 * @param {string} platform - Platform to check (mac, win)
 * @returns {boolean} True if signing is available
 */
function checkSigningAvailability(platform) {
  const required = BUILD_CONFIG.requiredForSigning[platform];
  if (!required) return false;
  
  const available = required.every(envVar => process.env[envVar]);
  
  if (available) {
    console.log(`✅ Code signing available for ${platform}`);
  } else {
    console.log(`⚠️  Code signing not available for ${platform} (missing: ${required.filter(env => !process.env[env]).join(', ')})`);
  }
  
  return available;
}

/**
 * Validate build environment
 */
function validateEnvironment() {
  console.log('🔍 Validating build environment...');
  
  // Check Node.js version
  const nodeVersion = process.version;
  console.log(`Node.js version: ${nodeVersion}`);
  
  // Check if electron-builder is available
  try {
    execSync('npx electron-builder --version', { stdio: 'pipe' });
    console.log('✅ electron-builder is available');
  } catch (error) {
    console.error('❌ electron-builder is not available');
    throw new Error('electron-builder is required for building');
  }
  
  // Check signing availability
  checkSigningAvailability('mac');
  checkSigningAvailability('win');
  
  console.log('✅ Environment validation completed');
}

/**
 * Generate icons for all platforms
 */
async function generateIcons() {
  console.log('🎨 Generating icons for all platforms...');
  try {
    const { generateAllIcons } = require('./generate-icons');
    await generateAllIcons();
    console.log('✅ Icon generation completed');
  } catch (error) {
    console.log('⚠️  Icon generation failed, continuing with existing icons:', error.message);
  }
}

/**
 * Build for specified platforms
 * @param {string[]} platforms - Array of platform flags
 * @param {boolean} incrementVer - Whether to increment version
 */
async function buildPlatforms(platforms, incrementVer = false) {
  // Increment version if requested
  if (incrementVer) {
    console.log('📈 Incrementing version...');
    const newVersion = incrementVersion('patch');
    console.log(`✅ Version updated to ${newVersion}`);
  }
  
  // Generate icons
  await generateIcons();
  
  // Build for each platform
  const platformFlags = platforms.join(' ');
  const buildCommand = `npx electron-builder ${platformFlags}`;
  
  executeCommand(buildCommand, `Building for platforms: ${platforms.join(', ')}`);
}

/**
 * Validate build output
 */
function validateBuildOutput() {
  console.log('🔍 Validating build output...');
  
  const distDir = path.join(__dirname, '../../dist');
  
  if (!fs.existsSync(distDir)) {
    throw new Error('Build output directory not found');
  }
  
  const files = fs.readdirSync(distDir);
  console.log(`📦 Build artifacts (${files.length} files):`);
  
  files.forEach(file => {
    const filePath = path.join(distDir, file);
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  - ${file} (${sizeInMB} MB)`);
  });
  
  console.log('✅ Build output validation completed');
}

/**
 * Main build function
 */
async function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || 'all';
  const shouldIncrementVersion = args.includes('--increment-version') || args.includes('-v');
  
  console.log('🚀 Starting RSS ニュース電光掲示板アプリ build process...');
  console.log(`Platform: ${platform}`);
  console.log(`Increment version: ${shouldIncrementVersion}`);
  
  try {
    // Validate environment
    validateEnvironment();
    
    // Get platform flags
    const platformFlags = BUILD_CONFIG.platforms[platform];
    if (!platformFlags) {
      throw new Error(`Unknown platform: ${platform}. Available: ${Object.keys(BUILD_CONFIG.platforms).join(', ')}`);
    }
    
    // Build
    await buildPlatforms(platformFlags, shouldIncrementVersion);
    
    // Validate output
    validateBuildOutput();
    
    console.log('\n🎉 Build process completed successfully!');
    console.log('📦 Build artifacts are available in the dist/ directory');
    
  } catch (error) {
    console.error('\n💥 Build process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  buildPlatforms,
  validateEnvironment,
  validateBuildOutput
};