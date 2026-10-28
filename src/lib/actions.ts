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

export async function copyTrackLink(track: Track) {
  const text = `${track.artist} — ${track.title}`;
  try {
    await navigator.clipboard.writeText(text);
    useUiStore.getState().toast('Название скопировано');
  } catch {
    useUiStore.getState().toast('Не удалось скопировать', 'error');
  }
}
