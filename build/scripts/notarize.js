/**
 * macOS notarization script for RSS ニュース電光掲示板アプリ
 * This script is executed after signing to notarize the app with Apple
 */

const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');

exports.default = async function notarizing(context) {
  // Only notarize on macOS builds
  if (process.platform !== 'darwin' || !process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
    console.log('Skipping notarization: Not on macOS or credentials not available');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    console.error(`Cannot find application at: ${appPath}`);
    return;
  }

  console.log(`Notarizing ${appName} at ${appPath}`);

  try {
    await notarize({
      appBundleId: 'com.rss-news-ticker.app',
      appPath: appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_ID_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log(`Successfully notarized ${appName}`);
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};