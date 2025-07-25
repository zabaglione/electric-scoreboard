/**
 * Icon generation script for RSS ニュース電光掲示板アプリ
 * This script converts the source icon.png to platform-specific formats
 * 
 * Note: This script requires the 'sharp' package to be installed:
 * npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sourceIcon = path.join(__dirname, '../../assets/icon.png');
const iconsDir = path.join(__dirname, '../icons');

// Ensure the icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// macOS icon sizes (icns requires multiple sizes in one file)
const macOSSizes = [16, 32, 64, 128, 256, 512, 1024];

// Windows icon sizes
const windowsSizes = [16, 24, 32, 48, 64, 128, 256];

// Linux icon sizes
const linuxSizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

/**
 * Generate PNG icons of different sizes
 * @param {number[]} sizes - Array of icon sizes to generate
 * @param {string} outputDir - Directory to save the icons
 */
async function generatePngIcons(sizes, outputDir) {
  try {
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `${size}x${size}.png`);
      await sharp(sourceIcon)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated ${outputPath}`);
    }
  } catch (error) {
    console.error('Error generating PNG icons:', error);
  }
}

/**
 * Main function to generate all icons
 */
async function generateAllIcons() {
  try {
    // Create directories for each platform
    const macDir = path.join(iconsDir, 'mac');
    const winDir = path.join(iconsDir, 'win');
    const linuxDir = path.join(iconsDir, 'linux');
    
    fs.mkdirSync(macDir, { recursive: true });
    fs.mkdirSync(winDir, { recursive: true });
    fs.mkdirSync(linuxDir, { recursive: true });
    
    // Generate PNG icons for each platform
    await generatePngIcons(macOSSizes, macDir);
    await generatePngIcons(windowsSizes, winDir);
    await generatePngIcons(linuxSizes, linuxDir);
    
    // Copy the original icon to the icons directory
    fs.copyFileSync(sourceIcon, path.join(iconsDir, 'icon.png'));
    
    console.log('Icon generation completed successfully!');
    
    // Note: For actual .icns and .ico conversion, you would need additional tools
    // like 'png2icons' or 'icon-gen' packages, or use external tools like ImageMagick
    console.log('Note: For production use, convert the PNG files to .icns (macOS) and .ico (Windows) formats');
    console.log('using tools like png2icons, icon-gen, or ImageMagick.');
  } catch (error) {
    console.error('Error in icon generation:', error);
  }
}

// Run the icon generation if this script is executed directly
if (require.main === module) {
  generateAllIcons();
}

module.exports = {
  generateAllIcons
};