module.exports = {
  app: {
    getName: jest.fn(() => 'electric-scoreboard'),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn(() => '/mock/path'),
    quit: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    getLoginItemSettings: jest.fn(() => ({ openAtLogin: false })),
    setLoginItemSettings: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      send: jest.fn()
    },
    show: jest.fn(),
    hide: jest.fn(),
    isVisible: jest.fn(() => true),
    setSize: jest.fn(),
    setAlwaysOnTop: jest.fn()
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  Menu: {
    buildFromTemplate: jest.fn(() => ({
      popup: jest.fn()
    }))
  },
  shell: {
    openExternal: jest.fn()
  },
  globalShortcut: {
    register: jest.fn(),
    unregisterAll: jest.fn()
  },
  Tray: jest.fn().mockImplementation(() => ({
    setToolTip: jest.fn(),
    setContextMenu: jest.fn(),
    on: jest.fn()
  }))
};