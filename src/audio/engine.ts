import { api } from '../lib/api';
import type { Track } from '@shared/types';

export interface EngineCallbacks {
  onTime: (position: number, duration: number) => void;
  onDuration: (duration: number) => void;
  onPlayState: (playing: boolean) => void;
  onBuffering: (buffering: boolean) => void;
  onEnded: () => void;
  onError: (message: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggle: () => void;
  onSeek: (seconds: number) => void;
}

export class AudioEngine {
  private audio: HTMLAudioElement;
  private callbacks: EngineCallbacks;
  private currentId: string | null = null;
  private retried = false;
  private lastPositionUpdate = 0;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    this.audio.volume = 0.8;
    this.bind();
    this.bindMediaSession();
  }

  private bind() {
    const audio = this.audio;
    audio.addEventListener('timeupdate', () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      this.callbacks.onTime(audio.currentTime, duration);
      const now = Date.now();
      if (now - this.lastPositionUpdate > 900 && duration > 0 && 'mediaSession' in navigator) {
        this.lastPositionUpdate = now;
        try {
          navigator.mediaSession.setPositionState({
            duration,
            position: Math.min(audio.currentTime, duration),
            playbackRate: 1,
          });
        } catch {
          /* noop */
        }
      }
    });
    audio.addEventListener('durationchange', () => {
      if (Number.isFinite(audio.duration)) this.callbacks.onDuration(audio.duration);
    });
    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration)) this.callbacks.onDuration(audio.duration);
    });
    audio.addEventListener('playing', () => {
      this.callbacks.onPlayState(true);
      this.callbacks.onBuffering(false);
    });
    audio.addEventListener('play', () => this.callbacks.onPlayState(true));
    audio.addEventListener('pause', () => this.callbacks.onPlayState(false));
    audio.addEventListener('waiting', () => this.callbacks.onBuffering(true));
    audio.addEventListener('canplay', () => this.callbacks.onBuffering(false));
    audio.addEventListener('stalled', () => this.callbacks.onBuffering(true));
    audio.addEventListener('ended', () => this.callbacks.onEnded());
    audio.addEventListener('error', () => {
      if (!this.currentId) return;
      if (!this.retried) {
        this.retried = true;
        const id = this.currentId;
        window.setTimeout(() => {
          if (this.currentId !== id) return;
          this.audio.src = `${api.streamUrl(id)}&retry=${Date.now()}`;
          this.audio.load();
          void this.play();
        }, 600);
        return;
      }
      this.callbacks.onBuffering(false);
      this.callbacks.onPlayState(false);
      this.callbacks.onError('Не удалось воспроизвести трек. Попробуйте другой.');
    });
  }

  private bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => this.callbacks.onToggle());
      navigator.mediaSession.setActionHandler('pause', () => this.callbacks.onToggle());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.callbacks.onNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.callbacks.onPrev());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') this.callbacks.onSeek(details.seekTime);
      });
    } catch {
      /* noop */
    }
  }

  load(track: Track, autoplay = true) {
    if (this.currentId === track.id) {
      if (autoplay) void this.play();
      return;
    }
    this.currentId = track.id;
    this.retried = false;
    this.audio.src = api.streamUrl(track.id);
    this.audio.load();
    this.setMediaSession(track);
    if (autoplay) void this.play();
  }

  play(): Promise<void> {
    return this.audio.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        this.callbacks.onPlayState(false);
        return;
      }
      this.callbacks.onPlayState(false);
    });
  }

  pause() {
    this.audio.pause();
  }

  toggle() {
    if (this.audio.paused) void this.play();
    else this.audio.pause();
  }

  seek(seconds: number) {
    if (!Number.isFinite(seconds)) return;
    const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : seconds;
    this.audio.currentTime = Math.max(0, Math.min(seconds, duration));
    this.callbacks.onTime(this.audio.currentTime, duration);
  }

  setVolume(value: number) {
    this.audio.volume = Math.max(0, Math.min(1, value));
  }

  setMuted(muted: boolean) {
    this.audio.muted = muted;
  }

  hasSource() {
    return this.currentId !== null;
  }

  get currentTrackId() {
    return this.currentId;
  }

  setMediaSession(track: Track) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Platinum',
        artwork: [{ src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }],
      });
      navigator.mediaSession.playbackState = 'playing';
    } catch {
      /* noop */
    }
  }

  setPlaybackState(state: 'none' | 'paused' | 'playing') {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = state;
      } catch {
        /* noop */
      }
    }
  }
}
