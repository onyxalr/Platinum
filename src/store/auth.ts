import { create } from 'zustand';
import type { AccountPayload, AuthResponse, User } from '@shared/types';
import { api, ApiError, getToken, setToken } from '../lib/api';
import { engine, usePlayerStore } from './player';

type AuthStatus = 'idle' | 'loading' | 'anon' | 'authed';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  stats: AccountPayload['stats'] | null;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string) => Promise<boolean>;
  guest: () => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (patch: { displayName?: string; accent?: string }) => Promise<void>;
  clearError: () => void;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Неизвестная ошибка';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,
  stats: null,

  init: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading', error: null });
    if (!getToken()) {
      set({ status: 'anon' });
      return;
    }
    try {
      const payload = await api.me();
      set({ user: payload.user, stats: payload.stats, status: 'authed' });
      await hydrateLikes();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setToken(null);
      set({ status: 'anon', user: null });
    }
  },

  login: async (username, password) => {
    set({ error: null, status: 'loading' });
    try {
      const payload = await authenticate(api.login(username, password));
      set({ user: payload.user, status: 'authed', stats: null });
      await hydrateLikes();
      await get().refresh();
      return true;
    } catch (err) {
      set({ status: 'anon', error: errorMessage(err) });
      return false;
    }
  },

  register: async (username, password, displayName) => {
    set({ error: null, status: 'loading' });
    try {
      const payload = await authenticate(api.register(username, password, displayName));
      set({ user: payload.user, status: 'authed', stats: null });
      usePlayerStore.getState().setLikedTracks([]);
      await get().refresh();
      return true;
    } catch (err) {
      set({ status: 'anon', error: errorMessage(err) });
      return false;
    }
  },

  guest: async () => {
    set({ error: null, status: 'loading' });
    try {
      const payload = await authenticate(api.guest());
      set({ user: payload.user, status: 'authed', stats: null });
      await hydrateLikes();
      await get().refresh();
      return true;
    } catch (err) {
      set({ status: 'anon', error: errorMessage(err) });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      /* noop */
    }
    setToken(null);
    engine.pause();
    usePlayerStore.setState({ liked: {}, isPlaying: false });
    set({ user: null, stats: null, status: 'anon', error: null });
  },

  refresh: async () => {
    if (!get().user) return;
    try {
      const payload = await api.me();
      set({ user: payload.user, stats: payload.stats });
    } catch {
      /* noop */
    }
  },

  updateProfile: async (patch) => {
    try {
      const payload = await api.updateMe(patch);
      set({ user: payload.user, stats: payload.stats });
      if (patch.displayName) useAuthStore.setState({ error: null });
    } catch (err) {
      set({ error: errorMessage(err) });
    }
  },

  clearError: () => set({ error: null }),
}));

async function authenticate(promise: Promise<AuthResponse>): Promise<AuthResponse> {
  const payload = await promise;
  setToken(payload.token);
  return payload;
}

async function hydrateLikes() {
  try {
    const likes = await api.likes();
    usePlayerStore.getState().setLikedTracks(likes);
  } catch {
    /* noop */
  }
}
