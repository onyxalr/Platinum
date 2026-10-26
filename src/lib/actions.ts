import type { Track } from '@shared/types';
import { api, ApiError } from './api';
import { useUiStore } from '../store/ui';

export function downloadTrack(track: Track) {
  api
    .startDownload(track)
    .then(() => {
      useUiStore.getState().toast('Загрузка началась — прогресс в библиотеке');
      useUiStore.getState().bumpLibrary();
    })
    .catch((err) => {
      const message = err instanceof ApiError ? err.message : 'Не удалось начать загрузку';
      useUiStore.getState().toast(message, 'error');
    });
}

export function openOnYouTube(track: Track) {
  const url = `https://www.youtube.com/watch?v=${track.id}`;
  if (window.platinum) void window.platinum.openExternal(url);
  else window.open(url, '_blank');
}

export async function copyTrackLink(track: Track) {
  const url = `https://www.youtube.com/watch?v=${track.id}`;
  try {
    await navigator.clipboard.writeText(url);
    useUiStore.getState().toast('Ссылка скопирована');
  } catch {
    useUiStore.getState().toast('Не удалось скопировать ссылку', 'error');
  }
}
