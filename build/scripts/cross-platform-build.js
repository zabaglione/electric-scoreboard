#!/usr/bin/env node

/**
 * Cross-platform build automation script for RSS ニュース電光掲示板アプリ
 * This script handles automated builds for all platforms with proper validation
 * and error handling for cross-platform compilation scenarios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { incrementVersion, getCurrentVersion, validatePackageMetadata } = require('./version-manager');

// Cross-platform build matrix
const BUILD_MATRIX = {
  // Host platform -> Supported target platforms
  darwin: {
    supported: ['mac', 'win', 'linux'],
    native: 'mac',
    limitations: {
      win: 'Windows code signing requires Windows host or CI/CD',
      linux: 'Linux builds work but may have compatibility issues'
    }
  },
  win32: {
    supported: ['win', 'mac', 'linux'],
    native: 'win',
    limitations: {
      mac: 'macOS code signing and notarization require macOS host',
      linux: 'Linux builds work but may have compatibility issues'
    }
  },
  linux: {
    supported: ['linux', 'win'],
    native: 'linux',
    limitations: {
      mac: 'macOS builds not supported on Linux',
      win: 'Windows code signing requires Windows host or CI/CD'
    }
  }
};

// Build configuration for each platform
const PLATFORM_CONFIG = {
  mac: {
    targets: ['--mac'],
    requiredEnv: ['APPLE_ID', 'APPLE_ID_PASSWORD', 'APPLE_TEAM_ID'],
    optional: true, // Code signing is optional for development
    description: 'macOS DMG and ZIP packages'
  },
  win: {
    targets: ['--win'],
    requiredEnv: ['WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD'],
    optional: true, // Code signing is optional for development
    description: 'Windows NSIS installer, portable, and MSI'
  },
  linux: {
    targets: ['--linux'],
    requiredEnv: [],
    optional: false,
    description: 'Linux AppImage, DEB, RPM, Snap, and tar.gz'
  }
};

/**
 * Get current host platform information
 * @returns {Object} Host platform info
 */
function getHostPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  const info = BUILD_MATRIX[platform];
  
  if (!info) {
    throw new Error(`Unsupported host platform: ${platform}`);
  }
  
  return {
    platform,
    arch,
    ...info
  };
}

/**
 * Check if a target platform is supported on current host
 * @param {string} targetPlatform - Target platform to check
 * @returns {Object} Support status and limitations
 */
function checkPlatformSupport(targetPlatform) {
  const host = getHostPlatform();
  const isSupported = host.supported.includes(targetPlatform);
  const isNative = host.native === targetPlatform;
  const limitations = host.limitations[targetPlatform] || null;
  
  return {
    supported: isSupported,
    native: isNative,
    limitations,
    recommended: isNative
  };
}

/**
 * Validate environment for code signing
 * @param {string} platform - Platform to validate
 * @returns {Object} Validation result
 */
function validateSigningEnvironment(platform) {
  const config = PLATFORM_CONFIG[platform];
  if (!config) {
    return { valid: false, error: `Unknown platform: ${platform}` };
  }
  
  const missingEnv = config.requiredEnv.filter(env => !process.env[env]);
  
  if (missingEnv.length > 0 && !config.optional) {
    return {
      valid: false,
      error: `Missing required environment variables for ${platform}: ${missingEnv.join(', ')}`,
      missing: missingEnv
    };
  }
  
  const hasSigningEnv = config.requiredEnv.every(env => process.env[env]);
  
  return {
    valid: true,
    signed: hasSigningEnv,
    missing: missingEnv,
    warning: missingEnv.length > 0 ? `Code signing not available for ${platform}` : null
  };
}

/**
 * Execute build command with proper error handling
 * @param {string[]} targets - Build targets
 * @param {string} description - Build description
 * @returns {Promise<void>}
 */
async function executeBuild(targets, description) {
  const command = `npx electron-builder ${targets.join(' ')}`;
  
  console.log(`\n🔄 ${description}...`);
  console.log(`Command: ${command}`);
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..'),
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        BUILD_NUMBER: require('./version-manager').generateBuildNumber()
      }
    });
    
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

/**
 * Generate build report
 * @param {string[]} platforms - Platforms that were built
 * @param {Object} results - Build results
 */
function generateBuildReport(platforms, results) {
  console.log('\n📊 Cross-Platform Build Report');
  console.log('================================');
  
  const version = getCurrentVersion();
  const hostInfo = getHostPlatform();
  
  console.log(`Version: ${version}`);
  console.log(`Host Platform: ${hostInfo.platform} (${hostInfo.arch})`);
  console.log(`Build Date: ${new Date().toISOString()}`);
  
  console.log('\nPlatform Build Status:');
  platforms.forEach(platform => {
    const result = results[platform];
    const status = result.success ? '✅' : '❌';
    const signing = result.signed ? '🔐 Signed' : '⚠️  Unsigned';
    
    console.log(`  ${status} ${platform}: ${result.description} (${signing})`);
    
    if (result.limitations) {
      console.log(`    ℹ️  ${result.limitations}`);
    }
    
    if (result.error) {
      console.log(`    ❌ Error: ${result.error}`);
    }
  });
  
  // Check dist directory
  const distDir = path.join(__dirname, '../../dist');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    console.log(`\n📦 Build Artifacts (${files.length} files):`);
    files.forEach(file => {
      const filePath = path.join(distDir, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`  - ${file} (${sizeInMB} MB)`);
    });
  }
}

/**
 * Build for specified platforms with validation
 * @param {string[]} platforms - Platforms to build
 * @param {Object} options - Build options
 */
async function buildPlatforms(platforms, options = {}) {
  const { incrementVer = false, skipValidation = false } = options;
  const results = {};
  
  console.log('🚀 Starting cross-platform build process...');
  
  // Validate package metadata
  if (!skipValidation) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
    if (!validatePackageMetadata(packageJson)) {
      throw new Error('Package metadata validation failed');
    }
  }
  
  // Increment version if requested
  if (incrementVer) {
    console.log('📈 Incrementing version...');
    const newVersion = incrementVersion('patch');
    console.log(`✅ Version updated to ${newVersion}`);
  }
  
  // Validate platform support
  const hostInfo = getHostPlatform();
  console.log(`\nHost Platform: ${hostInfo.platform} (${hostInfo.arch})`);
  
  for (const platform of platforms) {
    const support = checkPlatformSupport(platform);
    const config = PLATFORM_CONFIG[platform];
    
    console.log(`\n🔍 Validating ${platform} build...`);
    
    if (!support.supported) {
      results[platform] = {
        success: false,
        error: `Platform ${platform} not supported on ${hostInfo.platform}`,
        description: config.description,
        signed: false
      };
      console.log(`❌ ${platform} build not supported on this host`);
      continue;
    }
    
    // Check signing environment
    const signingValidation = validateSigningEnvironment(platform);
    
    if (!signingValidation.valid) {
      results[platform] = {
        success: false,
        error: signingValidation.error,
        description: config.description,
        signed: false
      };
      console.log(`❌ ${platform} build validation failed: ${signingValidation.error}`);
      continue;
    }
    
    if (signingValidation.warning) {
      console.log(`⚠️  ${signingValidation.warning}`);
    }
    
    // Perform the build
    try {
      await executeBuild(config.targets, `Building ${config.description}`);
      
      results[platform] = {
        success: true,
        description: config.description,
        signed: signingValidation.signed,
        limitations: support.limitations
      };
      
    } catch (error) {
      results[platform] = {
        success: false,
        error: error.message,
        description: config.description,
        signed: false,
        limitations: support.limitations
      };
    }
  }
  
  // Generate report
  generateBuildReport(platforms, results);
  
  // Check if any builds failed
  const failedBuilds = platforms.filter(p => !results[p].success);
  if (failedBuilds.length > 0) {
    console.log(`\n⚠️  ${failedBuilds.length} build(s) failed: ${failedBuilds.join(', ')}`);
    
    // Don't throw error if it's just signing issues
    const criticalFailures = failedBuilds.filter(p => 
      !results[p].error.includes('signing') && 
      !results[p].error.includes('environment variables')
    );
    
    if (criticalFailures.length > 0) {
      throw new Error(`Critical build failures: ${criticalFailures.join(', ')}`);
    }
  }
  
  console.log('\n🎉 Cross-platform build process completed!');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const platforms = [];
  const options = {
    incrementVer: false,
    skipValidation: false
  };
  
  for (const arg of args) {
    if (arg === '--increment-version' || arg === '-v') {
      options.incrementVer = true;
    } else if (arg === '--skip-validation') {
      options.skipValidation = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Cross-Platform Build Script for RSS ニュース電光掲示板アプリ

Usage: node cross-platform-build.js [platforms...] [options]

Platforms:
  mac     Build for macOS (DMG, ZIP)
  win     Build for Windows (NSIS, Portable, MSI)
  linux   Build for Linux (AppImage, DEB, RPM, Snap, tar.gz)
  all     Build for all supported platforms

Options:
  --increment-version, -v    Increment patch version before build
  --skip-validation         Skip package metadata validation
  --help, -h                Show this help message

Examples:
  node cross-platform-build.js mac win
  node cross-platform-build.js all --increment-version
  node cross-platform-build.js linux --skip-validation
      `);
      return;
    } else if (['mac', 'win', 'linux', 'all'].includes(arg)) {
      if (arg === 'all') {
        platforms.push('mac', 'win', 'linux');
      } else {
        platforms.push(arg);
      }
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }
  
  // Default to all platforms if none specified
  if (platforms.length === 0) {
    platforms.push('mac', 'win', 'linux');
  }
  
  // Remove duplicates
  const uniquePlatforms = [...new Set(platforms)];
  
  try {
    await buildPlatforms(uniquePlatforms, options);
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
  checkPlatformSupport,
  validateSigningEnvironment,
  getHostPlatform
};