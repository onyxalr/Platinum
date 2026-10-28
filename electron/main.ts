import { app, BrowserWindow, ipcMain, Menu, shell, session, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { Db } from './db';
import { YtDlp } from './ytdlp';
import { createApiServer } from './server';
import { SPLASH_URL } from './splash';

app.setName('Platinum');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('force-color-profile', 'srgb');
// Caelestia/Hyprland runs natively on Wayland. Let Chromium pick the native
// backend automatically instead of silently falling back to XWayland.
if (
  process.env.PLATINUM_DISABLE_WAYLAND !== '1' &&
  (process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY))
) {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}
// Trim Chromium services that are irrelevant to a local player. This removes
// background timers, network chatter and compositor work on low-end laptops.
app.commandLine.appendSwitch(
  'disable-features',
  [
    'MediaRouter',
    'GlobalMediaControls',
    'Translate',
    'OptimizationHints',
    'AutofillServerCommunication',
    'InterestFeedContentSuggestions',
    'CalculateNativeWinOcclusion',
    'HeavyAdPrivacyMitigations',
  ].join(','),
);
app.commandLine.appendSwitch('disable-background-networking');
if (process.env.PLATINUM_DISABLE_GPU === '1') app.disableHardwareAcceleration();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let splashStartedAt = 0;
let splashTimer: NodeJS.Timeout | null = null;
const SPLASH_MIN_MS = 1500;
const SPLASH_MAX_MS = 12_000;
let db: Db | null = null;
let api: Awaited<ReturnType<typeof createApiServer>> | null = null;

function createSplash() {
  splashStartedAt = Date.now();
  const win = new BrowserWindow({
    width: 400,
    height: 264,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    title: 'Platinum',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.once('ready-to-show', () => {
    if (!win.isDestroyed() && splashWindow === win) win.showInactive();
  });
  win.on('closed', () => {
    if (splashWindow === win) splashWindow = null;
  });
  void win.loadURL(SPLASH_URL);
  splashWindow = win;

  // Never let a slow renderer keep the desktop splash on screen forever.
  splashTimer = setTimeout(() => {
    if (mainWindow) revealMain(mainWindow);
    else closeSplash();
  }, SPLASH_MAX_MS);
  return win;
}

function closeSplash() {
  if (splashTimer) {
    clearTimeout(splashTimer);
    splashTimer = null;
  }
  const win = splashWindow;
  splashWindow = null;
  if (!win || win.isDestroyed()) return;

  let opacity = 1;
  const timer = setInterval(() => {
    if (win.isDestroyed()) {
      clearInterval(timer);
      return;
    }
    opacity -= 0.13;
    if (opacity <= 0) {
      clearInterval(timer);
      win.destroy();
      return;
    }
    win.setOpacity(opacity);
  }, 26);
}

function revealMain(win: BrowserWindow) {
  const delay = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStartedAt));
  setTimeout(() => {
    if (win.isDestroyed()) {
      closeSplash();
      return;
    }
    if (!win.isVisible()) win.show();
    win.focus();
    closeSplash();
  }, delay);
}

function createWindow(apiBase: string) {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(app.getAppPath(), 'build', 'icon.png');
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 700,
    show: false,
    frame: false,
    backgroundColor: '#070708',
    title: 'Platinum',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: false,
      v8CacheOptions: 'bypassHeatCheck',
      additionalArguments: [`--api-base=${apiBase}`, `--app-version=${app.getVersion()}`],
    },
  });

  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) revealMain(win);
    else win.show();
  });

  win.on('maximize', () => win.webContents.send('window:maximized', true));
  win.on('unmaximize', () => win.webContents.send('window:maximized', false));
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith('http://127.0.0.1:5273') : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  const shot = process.env.PLATINUM_SHOT;
  if (shot) {
    const delay = Number(process.env.PLATINUM_SHOT_DELAY || 6000);
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const image = await win.webContents.capturePage();
          fs.mkdirSync(path.dirname(shot), { recursive: true });
          fs.writeFileSync(shot, image.toPNG());
          console.log('[screenshot]', shot);
        } catch (err) {
          console.error('[screenshot]', err);
        } finally {
          app.quit();
        }
      }, delay);
    });
  }

  mainWindow = win;
  return win;
}

function registerIpc() {
  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMain.handle('window:is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    userData: app.getPath('userData'),
    downloadsDir: path.join(app.getPath('userData'), 'downloads'),
    isDev,
  }));

  ipcMain.handle('app:open-external', (_event, url: unknown) => {
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return shell.openExternal(url);
    return false;
  });

  ipcMain.handle('app:open-path', (_event, target: unknown) => {
    if (typeof target === 'string') return shell.openPath(target);
    return 'invalid path';
  });

  ipcMain.handle('app:show-item', (_event, target: unknown) => {
    if (typeof target === 'string') shell.showItemInFolder(target);
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  session.defaultSession.setSpellCheckerEnabled(false);

  // The native splash appears above the desktop immediately, before SQLite,
  // the local server and the renderer are ready.
  if (!process.env.PLATINUM_SHOT) createSplash();

  const userData = app.getPath('userData');
  const downloadsDir = path.join(userData, 'downloads');
  fs.mkdirSync(downloadsDir, { recursive: true });

  db = new Db(path.join(userData, 'platinum.db'));
  const resourcesDir = app.isPackaged ? process.resourcesPath : app.getAppPath();
  const ytdlp = new YtDlp(userData, resourcesDir);

  try {
    api = await createApiServer({
      db,
      ytdlp,
      downloadsDir,
      version: app.getVersion(),
    });
  } catch (err) {
    console.error('[api] failed to start', err);
    dialog.showErrorBox('Platinum', 'Не удалось запустить локальный сервер. Подробности в консоли.');
    app.quit();
    return;
  }

  registerIpc();
  createWindow(api.url);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && api) createWindow(api.url);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (splashTimer) {
    clearTimeout(splashTimer);
    splashTimer = null;
  }
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = null;
  api?.server.close();
  db?.close();
  api = null;
  db = null;
});
