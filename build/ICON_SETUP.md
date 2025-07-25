# Icon Setup Guide

RSS ニュース電光掲示板アプリのアイコン設定ガイド

## Current Status

⚠️ **Icon Issue**: 現在、アイコンファイルに問題があり、ビルドプロセスでエラーが発生しています。

## Problem Description

electron-builderのapp-builderバイナリがアイコンファイルを処理する際に以下のエラーが発生:
```
flate: corrupt input before offset 80
```

これは、PNGファイルの圧縮データに問題があることを示しています。

## Temporary Solution

現在、アイコンは一時的に無効化されています:
- `electron-builder.config.js`でアイコン設定をコメントアウト
- ビルドプロセスはアイコンなしで動作

## Proper Icon Setup

### Requirements

1. **Format**: PNG format
2. **Size**: 1024x1024 pixels (recommended)
3. **Color Depth**: 32-bit RGBA
4. **Compression**: Standard PNG compression (not corrupted)

### Creating a Proper Icon

#### Method 1: Using ImageMagick

```bash
# Create a simple RSS icon
magick -size 1024x1024 xc:transparent \
  -fill "#4A90E2" -draw "circle 512,512 512,100" \
  -fill white -gravity center -pointsize 300 \
  -font Arial-Bold -annotate +0+0 "RSS" \
  build/icon.png
```

#### Method 2: Using Online Tools

1. Visit [favicon.io](https://favicon.io/) or similar
2. Create or upload your design
3. Download as PNG (1024x1024)
4. Save as `build/icon.png`

#### Method 3: Using Design Software

1. Create 1024x1024 canvas in Photoshop/GIMP/Figma
2. Design your icon
3. Export as PNG with transparency
4. Ensure file is not corrupted

### Validation

After creating the icon, validate it:

```bash
# Check file format
file build/icon.png

# Should output: PNG image data, 1024 x 1024, 8-bit/color RGBA, non-interlaced

# Test with ImageMagick
magick identify build/icon.png

# Should not show any errors
```

### Platform-Specific Icon Generation

Once you have a proper `build/icon.png`, the build system will automatically generate platform-specific formats:

```bash
# Generate icons for all platforms
node build/scripts/generate-icons.js
```

This creates:
- **macOS**: Multiple PNG sizes for .icns conversion
- **Windows**: Multiple PNG sizes for .ico conversion  
- **Linux**: Various PNG sizes

### Enabling Icons in Build

After fixing the icon file:

1. Edit `electron-builder.config.js`
2. Uncomment the icon lines:
   ```javascript
   // Change from:
   // icon: "build/icon.png", // Temporarily disabled
   
   // To:
   icon: "build/icon.png",
   ```

3. Test the build:
   ```bash
   npm run build:quick
   ```

### Troubleshooting

#### Common Issues

1. **Corrupt PNG**: Use `magick identify` to check
2. **Wrong Size**: Resize to 1024x1024
3. **Wrong Format**: Convert to PNG with transparency
4. **File Permissions**: Ensure file is readable

#### Debug Commands

```bash
# Check PNG integrity
pngcheck build/icon.png

# Repair PNG if needed
magick build/icon.png -strip build/icon_fixed.png

# Test with electron-builder
npx electron-builder --dir
```

## Future Improvements

1. **Professional Icon**: Create a proper RSS-themed icon
2. **Multiple Formats**: Provide .ico and .icns directly
3. **Automated Validation**: Add icon validation to build process
4. **Fallback Icons**: Provide backup icons if main icon fails

## Resources

- [Electron Builder Icons](https://www.electron.build/icons)
- [PNG Specification](http://www.libpng.org/pub/png/spec/1.2/PNG-Contents.html)
- [Icon Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos/icons-and-images/app-icon/)