/**
 * electron-builder configuration for RSS ニュース電光掲示板アプリ
 * Platform-specific build configurations for macOS, Windows, and Linux
 * 
 * This configuration implements the requirements for app distribution and autostart:
 * - Platform-specific installers (macOS .dmg, Windows .exe, Linux .AppImage)
 * - Code signing for macOS and Windows
 * - Proper app metadata and icons
 * - Cross-platform build support
 * 
 * Environment Variables for Code Signing:
 * 
 * macOS:
 * - APPLE_ID: Apple ID for notarization
 * - APPLE_ID_PASSWORD: App-specific password for Apple ID
 * - APPLE_TEAM_ID: Apple Developer Team ID
 * - APPLE_IDENTITY: Code signing identity (e.g., "Developer ID Application: Your Name")
 * 
 * Windows:
 * - WIN_CSC_LINK: Path to .p12/.pfx certificate file
 * - WIN_CSC_KEY_PASSWORD: Certificate password
 * - WIN_CSC_SUBJECT_NAME: Certificate subject name (alternative to file)
 * - WIN_CSC_SHA1: Certificate SHA1 hash (alternative to file)
 * 
 * General:
 * - BUILD_NUMBER: Build number for versioning
 * - NODE_ENV: Build environment (development/production)
 */

module.exports = {
  appId: "com.rss-news-ticker.app",
  productName: "RSS ニュース電光掲示板",
  copyright: "Copyright © 2025",
  
  // Build directories
  directories: {
    output: "dist"
  },
  
  // Files to include in the build
  files: [
    "main.js",
    "renderer.js",
    "settings.js",
    "index.html",
    "settings.html",
    "styles.css",
    "themes.css",
    "settings.css",
    "src/**/*",
    "node_modules/**/*",
    "LICENSE",
    "!node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
    "!node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
    "!node_modules/*.d.ts",
    "!node_modules/.bin",
    "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
    "!.editorconfig",
    "!**/._*",
    "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
    "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
    "!**/{appveyor.yml,.travis.yml,circle.yml}",
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}",
    "!{.kiro,tests,coverage,playwright-report,test-results,assets,build}/**/*"
  ],
  
  // macOS configuration
  mac: {
    category: "public.app-category.news",
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"]
      },
      {
        target: "zip",
        arch: ["x64", "arm64"]
      }
    ],
    // icon: "build/icons/icon.png", // Temporarily disabled due to icon processing issues
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
    // Code signing for macOS
    identity: process.env.APPLE_IDENTITY || null,
    // Notarization settings
    notarize: process.env.APPLE_ID && process.env.APPLE_ID_PASSWORD ? {
      teamId: process.env.APPLE_TEAM_ID
    } : false,
    minimumSystemVersion: "10.14.0", // Minimum macOS version (Mojave)
    // Additional macOS metadata
    bundleVersion: process.env.BUILD_NUMBER || "1",
    bundleShortVersion: process.env.npm_package_version || "1.0.0"
  },
  
  // macOS DMG configuration
  dmg: {
    title: "${productName} ${version}",
    contents: [
      {
        x: 130,
        y: 220
      },
      {
        x: 410,
        y: 220,
        type: "link",
        path: "/Applications"
      }
    ],
    window: {
      width: 540,
      height: 380
    }
  },
  
  // Windows configuration
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64", "ia32"]
      },
      {
        target: "portable",
        arch: ["x64", "ia32"]
      },
      {
        target: "msi",
        arch: ["x64"]
      }
    ],
    // icon: "build/icons/icon.png", // Temporarily disabled due to icon processing issues
    verifyUpdateCodeSignature: false,
    // Code signing for Windows
    cscLink: process.env.WIN_CSC_LINK || null,
    cscKeyPassword: process.env.WIN_CSC_KEY_PASSWORD || null,
    signAndEditExecutable: process.env.WIN_CSC_LINK ? true : false,
    // Additional Windows-specific settings
    legalTrademarks: "RSS News Ticker",
    requestedExecutionLevel: "asInvoker"
  },
  
  // Windows NSIS installer configuration
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "${productName}",
    runAfterFinish: true,
    artifactName: "${productName}-Setup-${version}.${ext}"
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64", "arm64"]
      },
      {
        target: "deb",
        arch: ["x64", "arm64"]
      },
      {
        target: "rpm",
        arch: ["x64"]
      },
      {
        target: "snap",
        arch: ["x64"]
      },
      {
        target: "tar.gz",
        arch: ["x64", "arm64"]
      }
    ],
    // icon: "build/icons/icon.png", // Temporarily disabled due to icon processing issues
    category: "Network",
    maintainer: "RSS News Ticker Developer <developer@example.com>",
    vendor: "RSS News Ticker",
    synopsis: "RSS feed electric scoreboard display",
    executableName: "rss-news-ticker"
  },
  
  // AppImage configuration
  appImage: {
    license: "LICENSE"
  },
  
  // Debian package configuration
  deb: {
    priority: "optional",
    depends: ["libnotify4", "libxtst6", "libnss3"]
  },
  
  // RPM package configuration
  rpm: {
    depends: ["libnotify", "libXtst", "nss"]
  },
  
  // Snap configuration
  snap: {
    confinement: "strict",
    summary: "RSS feed electric scoreboard display",
    grade: "stable"
  },
  
  // Publish configuration (for future auto-updater support)
  publish: null,
  
  // Compression settings
  compression: "maximum",
  
  // Build metadata
  buildVersion: process.env.BUILD_NUMBER || process.env.CI_BUILD_NUMBER || undefined,
  
  // Artifact naming
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
  
  // Build hooks
  beforeBuild: () => {
    // This function will be called before the build starts
    const version = require('./package.json').version;
    console.log(`Building RSS ニュース電光掲示板 version ${version}`);
    console.log(`Build timestamp: ${new Date().toISOString()}`);
    return null;
  },
  
  // macOS notarization hook
  afterSign: process.platform === 'darwin' ? require('./build/scripts/notarize.js').default : undefined,
  
  // Additional metadata
  extraMetadata: {
    homepage: "https://github.com/your-username/rss-news-ticker",
    repository: {
      type: "git",
      url: "https://github.com/your-username/rss-news-ticker.git"
    },
    bugs: {
      url: "https://github.com/your-username/rss-news-ticker/issues"
    },
    buildDate: new Date().toISOString(),
    buildEnvironment: process.env.NODE_ENV || 'production'
  },
  
  // Automatic version incrementing
  generateUpdatesFilesForAllChannels: true,
  releaseInfo: {
    releaseNotes: "See CHANGELOG.md for details"
  }
};