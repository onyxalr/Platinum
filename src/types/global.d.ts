import type { PlatinumBridge } from '../../electron/preload';

declare global {
  interface Window {
    platinum?: PlatinumBridge;
  }
}

export {};
