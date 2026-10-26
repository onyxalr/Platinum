import { contextBridge, ipcRenderer } from 'electron';

function arg(name: string): string {
  const prefix = `--${name}=`;
  const found = process.argv.find((value) => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

const api = {
  apiBase: arg('api-base'),
  version: arg('app-version'),
  platform: process.platform,
  isDesktop: true,
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      const listener = (_event: unknown, value: boolean) => callback(value);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
  info: () => ipcRenderer.invoke('app:info'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  openPath: (target: string) => ipcRenderer.invoke('app:open-path', target),
  showItem: (target: string) => ipcRenderer.invoke('app:show-item', target),
};

contextBridge.exposeInMainWorld('platinum', api);

export type PlatinumBridge = typeof api;
