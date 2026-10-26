import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Track } from '@shared/types';
import { api } from '../lib/api';
import { AudioEngine } from '../audio/engine';
import { useUiStore } from './ui';

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  buffering: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  error: string | null;
  liked: Record<string, boolean>;
  playQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  playNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleLike: (track?: Track) => Promise<void>;
  setLikedTracks: (tracks: Track[]) => void;
  dismissError: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      current: null,
      isPlaying: false,
      position: 0,
      duration: 0,
      buffering: false,
      volume: 0.8,
      muted: false,
      shuffle: false,
      repeat: 'off',
      error: null,
      liked: {},

      playQueue: (tracks, startIndex = 0) => {
        if (!tracks.length) return;
        const index = Math.max(0, Math.min(startIndex, tracks.length - 1));
        const track = tracks[index];
        set({
          queue: tracks,
          index,
          current: track,
          position: 0,
          duration: track.duration || 0,
          error: null,
          buffering: true,
        });
        engine.setVolume(get().volume);
        engine.load(track, true);
        void api.recordHistory(track).catch(() => undefined);
        document.title = `${track.title} — ${track.artist} · Platinum`;
      },

      playTrack: (track, queue) => {
        const targetQueue = queue && queue.length ? queue : [track];
        const index = targetQueue.findIndex((item) => item.id === track.id);
        get().playQueue(targetQueue, index >= 0 ? index : 0);
      },

      toggle: () => {
        const { current, isPlaying } = get();
        if (!current) return;
        if (!engine.hasSource()) {
          engine.setVolume(get().volume);
          engine.load(current, true);
          void api.recordHistory(current).catch(() => undefined);
          document.title = `${current.title} — ${current.artist} · Platinum`;
          return;
        }
        engine.toggle();
      },

      next: (auto = false) => {
        const { queue, index, repeat, shuffle } = get();
        if (!queue.length) return;
        if (auto && repeat === 'one') {
          engine.seek(0);
          void engine.play();
          return;
        }
        let nextIndex = index + 1;
        if (shuffle && queue.length > 1) {
          do {
            nextIndex = Math.floor(Math.random() * queue.length);
          } while (nextIndex === index);
        }
        if (nextIndex >= queue.length) {
          if (repeat === 'all') nextIndex = 0;
          else {
            engine.pause();
            engine.seek(0);
            set({ isPlaying: false, position: 0 });
            return;
          }
        }
        get().playQueue(queue, nextIndex);
      },

      prev: () => {
        const { queue, index, position } = get();
        if (!queue.length) return;
        if (position > 3.5) {
          engine.seek(0);
          return;
        }
        let prevIndex = index - 1;
        if (prevIndex < 0) prevIndex = get().repeat === 'all' ? queue.length - 1 : 0;
        get().playQueue(queue, prevIndex);
      },

      seek: (seconds) => {
        engine.seek(seconds);
        set({ position: seconds });
      },

      setVolume: (value) => {
        const volume = Math.max(0, Math.min(1, value));
        engine.setVolume(volume);
        engine.setMuted(volume === 0);
        set({ volume, muted: volume === 0 });
      },

      toggleMute: () => {
        const muted = !get().muted;
        engine.setMuted(muted);
        set({ muted });
      },

      toggleShuffle: () => set({ shuffle: !get().shuffle }),

      cycleRepeat: () => {
        const order: RepeatMode[] = ['off', 'all', 'one'];
        const nextMode = order[(order.indexOf(get().repeat) + 1) % order.length];
        set({ repeat: nextMode });
      },

      addToQueue: (track) => {
        const { queue } = get();
        if (!queue.length) {
          get().playQueue([track], 0);
          return;
        }
        set({ queue: [...queue, track] });
        useUiStore.getState().toast('Добавлено в очередь');
      },

      playNext: (track) => {
        const { queue, index } = get();
        if (!queue.length) {
          get().playQueue([track], 0);
          return;
        }
        const nextQueue = [...queue];
        nextQueue.splice(index + 1, 0, track);
        set({ queue: nextQueue });
        useUiStore.getState().toast('Будет играть следующим');
      },

      removeFromQueue: (removeIndex) => {
        const { queue, index } = get();
        if (removeIndex < 0 || removeIndex >= queue.length) return;
        if (queue.length === 1) {
          engine.pause();
          set({ queue: [], index: 0, current: null, isPlaying: false, position: 0 });
          document.title = 'Platinum';
          return;
        }
        const nextQueue = queue.filter((_, i) => i !== removeIndex);
        if (removeIndex === index) {
          const nextIndex = Math.min(removeIndex, nextQueue.length - 1);
          set({ queue: nextQueue });
          get().playQueue(nextQueue, nextIndex);
          return;
        }
        set({
          queue: nextQueue,
          index: removeIndex < index ? index - 1 : index,
        });
      },

      clearQueue: () => {
        const { current } = get();
        if (!current) return;
        set({ queue: [current], index: 0 });
        useUiStore.getState().toast('Очередь очищена');
      },

      toggleLike: async (track) => {
        const target = track ?? get().current;
        if (!target) return;
        const wasLiked = !!get().liked[target.id];
        const liked = { ...get().liked };
        if (wasLiked) delete liked[target.id];
        else liked[target.id] = true;
        set({ liked });
        try {
          if (wasLiked) await api.unlike(target.id);
          else await api.like(target);
          useUiStore.getState().toast(wasLiked ? 'Убрано из любимого' : 'Добавлено в любимое');
          useUiStore.getState().bumpLibrary();
        } catch {
          set({ liked: { ...liked, [target.id]: wasLiked } });
          useUiStore.getState().toast('Не удалось обновить любимое', 'error');
        }
      },

      setLikedTracks: (tracks) => {
        const liked: Record<string, boolean> = {};
        for (const track of tracks) liked[track.id] = true;
        set({ liked });
      },

      dismissError: () => set({ error: null }),
    }),
    {
      name: 'platinum.player',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        current: state.current,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.duration = state.current?.duration || 0;
        state.position = 0;
      },
    },
  ),
);

export const engine = new AudioEngine({
  onTime: (position, duration) => {
    usePlayerStore.setState((state) => ({
      position,
      duration: duration > 0 ? duration : state.duration,
    }));
  },
  onDuration: (duration) => usePlayerStore.setState({ duration }),
  onPlayState: (playing) => {
    usePlayerStore.setState({ isPlaying: playing });
    engine.setPlaybackState(playing ? 'playing' : 'paused');
  },
  onBuffering: (buffering) => usePlayerStore.setState({ buffering }),
  onEnded: () => usePlayerStore.getState().next(true),
  onError: (message) => {
    usePlayerStore.setState({ error: message, isPlaying: false });
    useUiStore.getState().toast(message, 'error');
  },
  onNext: () => usePlayerStore.getState().next(),
  onPrev: () => usePlayerStore.getState().prev(),
  onToggle: () => usePlayerStore.getState().toggle(),
  onSeek: (seconds) => usePlayerStore.getState().seek(seconds),
});
