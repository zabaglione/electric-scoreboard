#!/usr/bin/env node

/**
 * Icon fixing script for RSS ニュース電光掲示板アプリ
 * This script converts base64-encoded icons to proper image files
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert base64 encoded icon to proper PNG file
 */
function fixIconFile() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  
  try {
    // Read the current icon file
    const iconContent = fs.readFileSync(iconPath, 'utf8').trim();
    
    // Check if it's base64 encoded
    if (iconContent.match(/^[A-Za-z0-9+/]+=*$/)) {
      console.log('Converting base64 icon to PNG...');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(iconContent, 'base64');
      
      // Write the proper PNG file
      fs.writeFileSync(iconPath, imageBuffer);
      
      console.log('✅ Icon converted successfully');
      
      // Verify the file
      const stats = fs.statSync(iconPath);
      console.log(`Icon file size: ${stats.size} bytes`);
      
    } else {
      console.log('Icon file is already in proper format');
    }
    
  } catch (error) {
    console.error('Error fixing icon:', error.message);
    throw error;
  }
}

/**
 * Create a simple fallback icon if needed
 */
function createFallbackIcon() {
  console.log('Creating fallback icon...');
  
  // Simple 16x16 PNG icon (RSS symbol)
  const fallbackIconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAEqSURBVDiNpdMxSgNBFAbgb3Z3s7sJJBgQBEELwcLGzkIQPIGFjZfwBHoCC0/gBSy8gI2NhYWFIFgIgiBYiEFBjLvZ3dlZi2STTUwU/Jth3vz/vPdm3jCcc/D/MAAQQvwJIISAUvpnAGMMAFBVFbz/ADjnsCwLQgh0XQcAaJqGKIrgeR6MMdi2DV3XAQCu6yLPc1RVhbZt0TQNAKCqKkgpYZomdF0H5xyGYUDXdViWhSzLUBQFyrJEXdfgnKNpGnDO4fs+oigCAORpiizLEIYhgiBAGIaI4xhJkiDPcwCA4zjwPA+u68I0TWiaBkVRIKWEEAJCCEgpIaWElBJKKSimaaJpGjRNg7ZtUdc1qqpCWZYoigJ5nqMsy7/fwjAMDMNw8YtN7AcYx/EL1s+5XgAAAABJRU5ErkJggg==';
  
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  const imageBuffer = Buffer.from(fallbackIconBase64, 'base64');
  
  fs.writeFileSync(iconPath, imageBuffer);
  console.log('✅ Fallback icon created');
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Fixing icon files...');
  
  try {
    fixIconFile();
    console.log('✅ Icon fixing completed');
  } catch (error) {
    console.error('❌ Icon fixing failed:', error.message);
    console.log('Creating fallback icon...');
    createFallbackIcon();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  fixIconFile,
  createFallbackIcon
};