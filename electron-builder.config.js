/**
 * electron-builder configuration for RSS ニュース電光掲示板アプリ
 * Platform-specific build configurations for macOS, Windows, and Linux
 */

module.exports = {
  appId: "com.rss-news-ticker.app",
  productName: "RSS ニュース電光掲示板",
  copyright: "Copyright © 2025",
  
  // Build directories
  directories: {
    output: "dist",
    buildResources: "build"
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
    "assets/**/*",
    "node_modules/**/*",
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
    "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
  ],
  
  // Files to exclude from the build
  extraFiles: [],
  
  // macOS configuration
  mac: {
    category: "public.app-category.news",
    icon: "assets/icon.png",
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
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist"
  },
  
  // macOS DMG configuration
  dmg: {
    title: "${productName} ${version}",
    icon: "assets/icon.png",
    background: null,
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
      }
    ],
    icon: "assets/icon.png",
    publisherName: "RSS News Ticker",
    verifyUpdateCodeSignature: false
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
    include: "build/installer.nsh",
    script: "build/installer.nsh"
  },
  
  // Linux configuration
  linux: {
    target: [
      {
        target: "AppImage",
        arch: ["x64"]
      },
      {
        target: "deb",
        arch: ["x64"]
      },
      {
        target: "rpm",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.png",
    category: "Network;News",
    desktop: {
      Name: "RSS ニュース電光掲示板",
      Comment: "RSS feed electric scoreboard display",
      GenericName: "RSS News Ticker",
      Keywords: "RSS;News;Ticker;Feed;",
      StartupWMClass: "RSS ニュース電光掲示板"
    }
  },
  
  // AppImage configuration
  appImage: {
    license: "LICENSE"
  },
  
  // Debian package configuration
  deb: {
    priority: "optional",
    depends: []
  },
  
  // RPM package configuration
  rpm: {
    license: "MIT",
    requires: []
  },
  
  // Publish configuration (for future auto-updater support)
  publish: null,
  
  // Compression settings
  compression: "normal",
  
  // Build metadata
  buildVersion: process.env.BUILD_NUMBER || undefined,
  
  // Artifact naming
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
  
  // Additional metadata
  extraMetadata: {
    homepage: "https://github.com/your-username/rss-news-ticker",
    repository: {
      type: "git",
      url: "https://github.com/your-username/rss-news-ticker.git"
    },
    bugs: {
      url: "https://github.com/your-username/rss-news-ticker/issues"
    }
  }
};