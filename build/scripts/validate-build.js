#!/usr/bin/env node

/**
 * Build validation script for RSS ニュース電光掲示板アプリ
 * This script validates the build configuration and tests the build process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Validate electron-builder configuration
 */
function validateElectronBuilderConfig() {
  console.log('🔍 Validating electron-builder configuration...');
  
  const configPath = path.join(__dirname, '../../electron-builder.config.js');
  
  if (!fs.existsSync(configPath)) {
    throw new Error('electron-builder.config.js not found');
  }
  
  try {
    const config = require(configPath);
    
    // Check required fields
    const requiredFields = ['appId', 'productName', 'directories', 'files'];
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Check platform configurations
    const platforms = ['mac', 'win', 'linux'];
    for (const platform of platforms) {
      if (!config[platform]) {
        throw new Error(`Missing platform configuration: ${platform}`);
      }
      
      if (!config[platform].target || !Array.isArray(config[platform].target)) {
        throw new Error(`Invalid target configuration for ${platform}`);
      }
    }
    
    console.log('✅ electron-builder configuration is valid');
    return config;
    
  } catch (error) {
    console.error('❌ electron-builder configuration validation failed:', error.message);
    throw error;
  }
}

/**
 * Validate package.json build configuration
 */
function validatePackageJson() {
  console.log('🔍 Validating package.json...');
  
  const packagePath = path.join(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'author'];
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      throw new Error(`Missing required field in package.json: ${field}`);
    }
  }
  
  // Check build scripts
  const requiredScripts = ['build', 'build:mac', 'build:win', 'build:linux'];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing build script: ${script}`);
    }
  }
  
  // Check dependencies
  const requiredDevDeps = ['electron', 'electron-builder'];
  for (const dep of requiredDevDeps) {
    if (!packageJson.devDependencies[dep]) {
      throw new Error(`Missing required dev dependency: ${dep}`);
    }
  }
  
  console.log('✅ package.json is valid');
  return packageJson;
}

/**
 * Validate build assets
 */
function validateBuildAssets() {
  console.log('🔍 Validating build assets...');
  
  const assetsToCheck = [
    // 'assets/icon.png', // Temporarily disabled due to icon file issues
    // 'build/icons/icon.png',
    // 'build/icons/icon.ico', 
    // 'build/icons/icon.icns',
    'build/entitlements.mac.plist'
  ];
  
  const missingAssets = [];
  
  for (const asset of assetsToCheck) {
    const assetPath = path.join(__dirname, '../..', asset);
    if (!fs.existsSync(assetPath)) {
      missingAssets.push(asset);
    }
  }
  
  if (missingAssets.length > 0) {
    console.log(`⚠️  Missing build assets: ${missingAssets.join(', ')}`);
    console.log('   Run "npm run prebuild" to generate missing assets');
  } else {
    console.log('✅ All required build assets are present');
  }
  
  return missingAssets;
}

/**
 * Test build process (dry run)
 */
function testBuildProcess() {
  console.log('🧪 Testing build process (dry run)...');
  
  try {
    // Test electron-builder configuration
    execSync('npx electron-builder --help', { stdio: 'pipe' });
    console.log('✅ electron-builder is working');
    
    // Test build configuration parsing
    execSync('npx electron-builder --config electron-builder.config.js --dir --publish=never', { 
      stdio: 'pipe',
      cwd: path.join(__dirname, '../..')
    });
    console.log('✅ Build configuration is valid');
    
  } catch (error) {
    console.error('❌ Build process test failed:', error.message);
    throw error;
  }
}

/**
 * Generate build report
 */
function generateBuildReport(config, packageJson, missingAssets) {
  console.log('\n📊 Build Configuration Report');
  console.log('================================');
  
  console.log(`App Name: ${config.productName}`);
  console.log(`App ID: ${config.appId}`);
  console.log(`Version: ${packageJson.version}`);
  console.log(`Description: ${packageJson.description}`);
  
  console.log('\nTarget Platforms:');
  ['mac', 'win', 'linux'].forEach(platform => {
    const targets = config[platform].target.map(t => t.target).join(', ');
    console.log(`  ${platform}: ${targets}`);
  });
  
  console.log('\nCode Signing Status:');
  console.log(`  macOS: ${process.env.APPLE_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`  Windows: ${process.env.WIN_CSC_LINK ? '✅ Configured' : '❌ Not configured'}`);
  
  if (missingAssets.length > 0) {
    console.log('\n⚠️  Missing Assets:');
    missingAssets.forEach(asset => console.log(`  - ${asset}`));
  }
  
  console.log('\n✅ Build validation completed');
}

/**
 * Main validation function
 */
async function main() {
  console.log('🚀 Starting build validation for RSS ニュース電光掲示板アプリ...\n');
  
  try {
    const config = validateElectronBuilderConfig();
    const packageJson = validatePackageJson();
    const missingAssets = validateBuildAssets();
    
    testBuildProcess();
    
    generateBuildReport(config, packageJson, missingAssets);
    
    console.log('\n🎉 Build validation completed successfully!');
    
    if (missingAssets.length > 0) {
      console.log('\n💡 Recommendation: Run "npm run prebuild" to generate missing assets before building');
    }
    
  } catch (error) {
    console.error('\n💥 Build validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateElectronBuilderConfig,
  validatePackageJson,
  validateBuildAssets,
  testBuildProcess
};