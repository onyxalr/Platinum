import { create } from 'zustand';
import type { YtDlpStatus } from '@shared/types';
import { api } from '../lib/api';

export interface AppInfo {
  version: string;
  platform: string;
  userData: string;
  downloadsDir: string;
  isDev: boolean;
}

interface RuntimeState {
  ytdlp: YtDlpStatus | null;
  info: AppInfo | null;
  loading: boolean;
  refreshYtdlp: () => Promise<void>;
  updateYtdlp: () => Promise<void>;
  loadInfo: () => Promise<void>;
}

export const useRuntimeStore = create<RuntimeState>((set, get) => ({
  ytdlp: null,
  info: null,
  loading: false,

  refreshYtdlp: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const ytdlp = await api.ytdlp();
      set({ ytdlp });
    } catch {
      /* noop */
    } finally {
      set({ loading: false });
    }
  },

  updateYtdlp: async () => {
    try {
      await api.updateYtdlp();
      await get().refreshYtdlp();
    } catch {
      /* noop */
    }
  },

  loadInfo: async () => {
    if (get().info) return;
    if (window.platinum) {
      try {
        const info = await window.platinum.info();
        set({ info });
      } catch {
        /* noop */
      }
    } else {
      set({
        info: {
          version: '0.1.0',
          platform: 'web',
          userData: '—',
          downloadsDir: '—',
          isDev: true,
        },
      });
    }
  },
}));
