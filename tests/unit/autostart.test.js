// Mock Electron app module first
const mockApp = {
  getPath: jest.fn(),
  getLoginItemSettings: jest.fn(),
  setLoginItemSettings: jest.fn()
};

jest.mock('electron', () => ({
  app: mockApp
}));

// Mock logger
jest.mock('../../src/logger', () => ({
  debug: jest.fn(),
  error: jest.fn()
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}));

const AutostartManager = require('../../src/autostart-manager');
const fs = require('fs').promises;
const os = require('os');

describe('AutostartManager', () => {
  let autostartManager;
  let originalPlatform;

  beforeEach(() => {
    originalPlatform = process.platform;
    jest.clearAllMocks();
    
    mockApp.getPath.mockReturnValue('/path/to/app');
    mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
    
    autostartManager = new AutostartManager();
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(autostartManager.platform).toBe(process.platform);
      expect(autostartManager.appName).toBe('RSS ニュース電光掲示板');
      expect(autostartManager.appPath).toBe('/path/to/app');
    });
  });

  describe('getPlatformMethod', () => {
    it('should return loginItems for macOS', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      autostartManager = new AutostartManager();
      expect(autostartManager.getPlatformMethod()).toBe('loginItems');
    });

    it('should return registry for Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      autostartManager = new AutostartManager();
      expect(autostartManager.getPlatformMethod()).toBe('registry');
    });

    it('should return desktop for Linux', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      autostartManager = new AutostartManager();
      expect(autostartManager.getPlatformMethod()).toBe('desktop');
    });

    it('should throw error for unsupported platform', () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      autostartManager = new AutostartManager();
      expect(() => autostartManager.getPlatformMethod()).toThrow('Unsupported platform: freebsd');
    });
  });

  describe('isEnabled', () => {
    describe('on macOS', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        autostartManager = new AutostartManager();
      });

      it('should return true when autostart is enabled', async () => {
        mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
        const result = await autostartManager.isEnabled();
        expect(result).toBe(true);
      });

      it('should return false when autostart is disabled', async () => {
        mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
        const result = await autostartManager.isEnabled();
        expect(result).toBe(false);
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        autostartManager = new AutostartManager();
      });

      it('should return true when autostart is enabled', async () => {
        mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
        const result = await autostartManager.isEnabled();
        expect(result).toBe(true);
      });

      it('should return false when autostart is disabled', async () => {
        mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
        const result = await autostartManager.isEnabled();
        expect(result).toBe(false);
      });
    });

    describe('on Linux', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        autostartManager = new AutostartManager();
      });

      it('should return true when desktop file exists', async () => {
        fs.access.mockResolvedValue();
        const result = await autostartManager.isEnabled();
        expect(result).toBe(true);
      });

      it('should return false when desktop file does not exist', async () => {
        fs.access.mockRejectedValue(new Error('ENOENT'));
        const result = await autostartManager.isEnabled();
        expect(result).toBe(false);
      });
    });

    it('should return false on error', async () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      autostartManager = new AutostartManager();
      mockApp.getLoginItemSettings.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = await autostartManager.isEnabled();
      expect(result).toBe(false);
    });

    it('should return false for unsupported platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      autostartManager = new AutostartManager();
      
      const result = await autostartManager.isEnabled();
      expect(result).toBe(false);
    });
  });

  describe('enable', () => {
    describe('on macOS', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        autostartManager = new AutostartManager();
      });

      it('should call setLoginItemSettings with correct parameters', async () => {
        await autostartManager.enable();
        expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
          openAtLogin: true,
          openAsHidden: true,
          name: 'RSS ニュース電光掲示板'
        });
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        autostartManager = new AutostartManager();
      });

      it('should call setLoginItemSettings with correct parameters', async () => {
        await autostartManager.enable();
        expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
          openAtLogin: true,
          openAsHidden: true,
          name: 'RSS ニュース電光掲示板'
        });
      });
    });

    describe('on Linux', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        autostartManager = new AutostartManager();
        jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      });

      it('should create autostart directory and desktop file', async () => {
        fs.mkdir.mockResolvedValue();
        fs.writeFile.mockResolvedValue();

        await autostartManager.enable();

        expect(fs.mkdir).toHaveBeenCalledWith('/home/user/.config/autostart', { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(
          '/home/user/.config/autostart/rss-news-ticker.desktop',
          expect.stringContaining('[Desktop Entry]'),
          'utf8'
        );
      });

      it('should handle existing directory gracefully', async () => {
        const existsError = new Error('Directory exists');
        existsError.code = 'EEXIST';
        fs.mkdir.mockRejectedValue(existsError);
        fs.writeFile.mockResolvedValue();

        await expect(autostartManager.enable()).resolves.not.toThrow();
      });

      it('should throw error if directory creation fails', async () => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        fs.mkdir.mockRejectedValue(error);

        await expect(autostartManager.enable()).rejects.toThrow('Permission denied');
      });
    });

    it('should throw error for unsupported platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      autostartManager = new AutostartManager();

      await expect(autostartManager.enable()).rejects.toThrow('Unsupported platform: freebsd');
    });
  });

  describe('disable', () => {
    describe('on macOS', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        autostartManager = new AutostartManager();
      });

      it('should call setLoginItemSettings with disabled parameters', async () => {
        await autostartManager.disable();
        expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
          openAtLogin: false,
          openAsHidden: false,
          name: 'RSS ニュース電光掲示板'
        });
      });
    });

    describe('on Windows', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        autostartManager = new AutostartManager();
      });

      it('should call setLoginItemSettings with disabled parameters', async () => {
        await autostartManager.disable();
        expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
          openAtLogin: false,
          openAsHidden: false,
          name: 'RSS ニュース電光掲示板'
        });
      });
    });

    describe('on Linux', () => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        autostartManager = new AutostartManager();
        jest.spyOn(os, 'homedir').mockReturnValue('/home/user');
      });

      it('should remove desktop file', async () => {
        fs.unlink.mockResolvedValue();

        await autostartManager.disable();

        expect(fs.unlink).toHaveBeenCalledWith('/home/user/.config/autostart/rss-news-ticker.desktop');
      });

      it('should handle non-existent file gracefully', async () => {
        const error = new Error('File not found');
        error.code = 'ENOENT';
        fs.unlink.mockRejectedValue(error);

        await expect(autostartManager.disable()).resolves.not.toThrow();
      });

      it('should throw error for other file system errors', async () => {
        const error = new Error('Permission denied');
        error.code = 'EACCES';
        fs.unlink.mockRejectedValue(error);

        await expect(autostartManager.disable()).rejects.toThrow('Permission denied');
      });
    });

    it('should throw error for unsupported platform', async () => {
      Object.defineProperty(process, 'platform', { value: 'freebsd' });
      autostartManager = new AutostartManager();

      await expect(autostartManager.disable()).rejects.toThrow('Unsupported platform: freebsd');
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      autostartManager = new AutostartManager();
    });

    it('should enable autostart when currently disabled', async () => {
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
      
      const result = await autostartManager.toggle();
      
      expect(result).toBe(true);
      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: true,
        openAsHidden: true,
        name: 'RSS ニュース電光掲示板'
      });
    });

    it('should disable autostart when currently enabled', async () => {
      mockApp.getLoginItemSettings.mockReturnValue({ openAtLogin: true });
      
      const result = await autostartManager.toggle();
      
      expect(result).toBe(false);
      expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: false,
        openAsHidden: false,
        name: 'RSS ニュース電光掲示板'
      });
    });
  });

  describe('_generateLinuxDesktopFileContent', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      autostartManager = new AutostartManager();
    });

    it('should generate correct desktop file content', () => {
      const content = autostartManager._generateLinuxDesktopFileContent();
      
      expect(content).toContain('[Desktop Entry]');
      expect(content).toContain('Type=Application');
      expect(content).toContain('Name=RSS ニュース電光掲示板');
      expect(content).toContain('Comment=RSS feed electric scoreboard display');
      expect(content).toContain('Exec="/path/to/app"');
      expect(content).toContain('Icon=rss-news-ticker');
      expect(content).toContain('X-GNOME-Autostart-enabled=true');
    });
  });

  describe('_getLinuxDesktopFilePath', () => {
    beforeEach(() => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      autostartManager = new AutostartManager();
      jest.spyOn(os, 'homedir').mockReturnValue('/home/testuser');
    });

    it('should return correct desktop file path', () => {
      const filePath = autostartManager._getLinuxDesktopFilePath();
      expect(filePath).toBe('/home/testuser/.config/autostart/rss-news-ticker.desktop');
    });
  });
});