import { create } from 'zustand';
import type { Track } from '@shared/types';

export type LibraryTab = 'playlists' | 'likes' | 'history' | 'downloads';

export type Route =
  | { name: 'home' }
  | { name: 'flow' }
  | { name: 'search'; query?: string }
  | { name: 'library'; tab?: LibraryTab }
  | { name: 'playlist'; id: string; title?: string }
  | { name: 'account' };

export type ToastKind = 'default' | 'error' | 'success';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface UiState {
  route: Route;
  stack: Route[];
  libraryVersion: number;
  searchFocus: number;
  searchSeed: string;
  trackMenu: Track | null;
  pickerTrack: Track | null;
  createPlaylistOpen: boolean;
  settingsOpen: boolean;
  playerOpen: boolean;
  playerTab: 'lyrics' | 'queue';
  toasts: Toast[];
  navigate: (route: Route) => void;
  back: () => void;
  canGoBack: () => boolean;
  bumpLibrary: () => void;
  focusSearch: () => void;
  openPlayer: (tab?: 'lyrics' | 'queue') => void;
  closePlayer: () => void;
  setPlayerTab: (tab: 'lyrics' | 'queue') => void;
  setTrackMenu: (track: Track | null) => void;
  setPickerTrack: (track: Track | null) => void;
  setCreatePlaylistOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  toast: (message: string, kind?: ToastKind) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set, get) => ({
  route: { name: 'home' },
  stack: [],
  libraryVersion: 0,
  searchFocus: 0,
  searchSeed: '',
  trackMenu: null,
  pickerTrack: null,
  createPlaylistOpen: false,
  settingsOpen: false,
  playerOpen: false,
  playerTab: 'lyrics',
  toasts: [],

  navigate: (route) => {
    const current = get().route;
    set({ route, stack: [...get().stack, current] });
  },

  back: () => {
    const stack = [...get().stack];
    const previous = stack.pop();
    if (!previous) return;
    set({ route: previous, stack });
  },

  canGoBack: () => get().stack.length > 0,

  bumpLibrary: () => set({ libraryVersion: get().libraryVersion + 1 }),

  focusSearch: () => {
    set({ searchFocus: get().searchFocus + 1 });
    if (get().route.name !== 'search') get().navigate({ name: 'search' });
  },

  openPlayer: (tab = 'lyrics') => set({ playerOpen: true, playerTab: tab }),
  closePlayer: () => set({ playerOpen: false }),
  setPlayerTab: (playerTab) => set({ playerTab }),

  setTrackMenu: (trackMenu) => set({ trackMenu }),
  setPickerTrack: (pickerTrack) => set({ pickerTrack }),
  setCreatePlaylistOpen: (createPlaylistOpen) => set({ createPlaylistOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  toast: (message, kind = 'default') => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.filter((t) => t.message !== message), { id, message, kind }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, 3200);
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export function setSearchSeed(query: string) {
  useUiStore.setState({ searchSeed: query });
}
