import type {
  AccountPayload,
  ArtistProfile,
  AuthResponse,
  DownloadItem,
  FlowResponse,
  HistoryItem,
  HomeFeed,
  ImportResult,
  LibraryResponse,
  Lyrics,
  Playlist,
  PlaylistDetail,
  SearchResponse,
  Track,
  User,
  YtDlpStatus,
} from '@shared/types';

const bridge = typeof window !== 'undefined' ? window.platinum : undefined;

export const API_BASE =
  bridge?.apiBase ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  'http://127.0.0.1:8787';

const TOKEN_KEY = 'platinum.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const token = getToken();
  if (token) headers.set('authorization', `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: init.signal ?? AbortSignal.timeout(90_000),
    });
  } catch (err) {
    const message =
      err instanceof DOMException && err.name === 'TimeoutError'
        ? 'Превышено время ожидания'
        : 'Нет соединения с локальным сервисом';
    throw new ApiError(message, 0);
  }
  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new ApiError(data?.error || `Ошибка ${response.status}`, response.status);
  }
  return data as T;
}

function body(value: unknown) {
  return JSON.stringify(value);
}

export const api = {
  health: () => request<{ ok: boolean; version: string }>('/api/health'),

  register: (username: string, password: string, displayName: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: body({ username, password, displayName }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: body({ username, password }) }),

  guest: () => request<AuthResponse>('/api/auth/guest', { method: 'POST' }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<AccountPayload>('/api/me'),

  updateMe: (patch: { displayName?: string; accent?: string }) =>
    request<AccountPayload>('/api/me', { method: 'PATCH', body: body(patch) }),

  home: () => request<HomeFeed>('/api/home'),

  flow: (exclude: string[] = []) =>
    request<FlowResponse>(`/api/flow${exclude.length ? `?exclude=${encodeURIComponent(exclude.join(','))}` : ''}`),

  search: (query: string, limit = 24) =>
    request<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}&limit=${limit}`),

  artist: (name: string) =>
    request<ArtistProfile>(`/api/artist?name=${encodeURIComponent(name)}`),

  importPlaylist: (input: { url?: string; text?: string; name?: string }) =>
    request<ImportResult>('/api/import', {
      method: 'POST',
      body: body(input),
      signal: AbortSignal.timeout(240_000),
    }),

  suggest: (query: string) =>
    request<{ suggestions: string[] }>(`/api/suggest?q=${encodeURIComponent(query)}`),

  lyrics: (track: Track) =>
    request<Lyrics>(
      `/api/lyrics?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(
        track.artist,
      )}&duration=${Math.round(track.duration)}`,
    ),

  library: () => request<LibraryResponse>('/api/library'),

  likes: () => request<Track[]>('/api/likes'),

  like: (track: Track) =>
    request<{ liked: boolean }>(`/api/likes/${track.id}`, { method: 'PUT', body: body({ track }) }),

  unlike: (id: string) => request<{ liked: boolean }>(`/api/likes/${id}`, { method: 'DELETE' }),

  history: (limit = 40) => request<HistoryItem[]>(`/api/history?limit=${limit}`),

  recordHistory: (track: Track) =>
    request<{ ok: boolean }>('/api/history', { method: 'POST', body: body({ track }) }),

  playlists: () => request<Playlist[]>('/api/playlists'),

  playlist: (id: string) => request<PlaylistDetail>(`/api/playlists/${id}`),

  createPlaylist: (name: string, description = '') =>
    request<Playlist>('/api/playlists', { method: 'POST', body: body({ name, description }) }),

  updatePlaylist: (id: string, patch: { name?: string; description?: string }) =>
    request<PlaylistDetail>(`/api/playlists/${id}`, { method: 'PATCH', body: body(patch) }),

  deletePlaylist: (id: string) =>
    request<{ ok: boolean }>(`/api/playlists/${id}`, { method: 'DELETE' }),

  addToPlaylist: (playlistId: string, track: Track) =>
    request<PlaylistDetail>(`/api/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: body({ track }),
    }),

  removeFromPlaylist: (playlistId: string, trackId: string) =>
    request<PlaylistDetail>(`/api/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' }),

  downloads: () => request<DownloadItem[]>('/api/downloads'),

  startDownload: (track: Track) =>
    request<DownloadItem>('/api/downloads', { method: 'POST', body: body({ track }) }),

  removeDownload: (id: string) =>
    request<{ ok: boolean }>(`/api/downloads/${id}`, { method: 'DELETE' }),

  ytdlp: () => request<YtDlpStatus>('/api/ytdlp'),

  updateYtdlp: () => request<YtDlpStatus>('/api/ytdlp/update', { method: 'POST' }),

  streamUrl: (id: string) => {
    const token = getToken();
    return `${API_BASE}/stream/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  mediaUrl: (id: string) => {
    const token = getToken();
    return `${API_BASE}/media/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  user: (): User | null => null,
};
