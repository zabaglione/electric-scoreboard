/**
 * Version management script for RSS ニュース電光掲示板アプリ
 * This script handles automatic version incrementing during the build process
 * Enhanced with metadata validation and build number management
 */

const fs = require('fs');
const path = require('path');
const packageJsonPath = path.join(__dirname, '../../package.json');

// Increment version types
const INCREMENT_TYPES = {
  MAJOR: 'major',
  MINOR: 'minor',
  PATCH: 'patch'
};

/**
 * Validates package.json metadata before version increment
 * @param {Object} packageJson - The package.json object
 * @returns {boolean} True if metadata is valid
 */
function validatePackageMetadata(packageJson) {
  const requiredFields = ['name', 'description', 'author', 'license', 'main'];
  const missingFields = requiredFields.filter(field => !packageJson[field]);
  
  if (missingFields.length > 0) {
    console.error(`❌ Missing required package.json fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Validate version format
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(packageJson.version)) {
    console.error(`❌ Invalid version format: ${packageJson.version}`);
    return false;
  }
  
  console.log('✅ Package metadata validation passed');
  return true;
}

/**
 * Generates build number based on timestamp
 * @returns {string} Build number in format YYYYMMDDHHMMSS
 */
function generateBuildNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Updates build metadata in package.json
 * @param {Object} packageJson - The package.json object
 * @returns {Object} Updated package.json with build metadata
 */
function updateBuildMetadata(packageJson) {
  const buildNumber = generateBuildNumber();
  const buildDate = new Date().toISOString();
  
  // Add build metadata
  packageJson.buildMetadata = {
    buildNumber,
    buildDate,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  console.log(`Build metadata updated: ${buildNumber} (${buildDate})`);
  return packageJson;
}

/**
 * Increments the version number in package.json
 * @param {string} type - The type of increment: 'major', 'minor', or 'patch'
 * @param {boolean} validateMetadata - Whether to validate package metadata
 * @returns {string} The new version number
 */
function incrementVersion(type = INCREMENT_TYPES.PATCH, validateMetadata = true) {
  // Read the current package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  
  // Validate metadata if requested
  if (validateMetadata && !validatePackageMetadata(packageJson)) {
    throw new Error('Package metadata validation failed');
  }
  
  // Parse the version components
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Calculate the new version based on the increment type
  let newVersion;
  switch (type) {
    case INCREMENT_TYPES.MAJOR:
      newVersion = `${major + 1}.0.0`;
      break;
    case INCREMENT_TYPES.MINOR:
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case INCREMENT_TYPES.PATCH:
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  // Update the package.json with the new version and build metadata
  packageJson.version = newVersion;
  updateBuildMetadata(packageJson);
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`Version updated from ${currentVersion} to ${newVersion}`);
  return newVersion;
}

// If this script is run directly from the command line
if (require.main === module) {
  const type = process.argv[2] || INCREMENT_TYPES.PATCH;
  if (!Object.values(INCREMENT_TYPES).includes(type)) {
    console.error(`Invalid increment type: ${type}`);
    console.error(`Valid types are: ${Object.values(INCREMENT_TYPES).join(', ')}`);
    process.exit(1);
  }
  
  incrementVersion(type);
}

/**
 * Gets the current version from package.json
 * @returns {string} Current version
 */
function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

/**
 * Gets build metadata from package.json
 * @returns {Object|null} Build metadata or null if not present
 */
function getBuildMetadata() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.buildMetadata || null;
}

module.exports = {
  incrementVersion,
  getCurrentVersion,
  getBuildMetadata,
  validatePackageMetadata,
  generateBuildNumber,
  updateBuildMetadata,
  INCREMENT_TYPES
};