export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  album?: string;
  /** Verified channel metadata helps Platinum link tracks to artist pages. */
  channelId?: string;
  channelName?: string;
  verified?: boolean;
}

export interface ArtistSummary {
  name: string;
  channelId?: string;
  thumbnail: string;
  verified: boolean;
  trackCount: number;
  tracks: Track[];
}

export interface ArtistProfile {
  name: string;
  channelId?: string;
  thumbnail: string;
  verified: boolean;
  tracks: Track[];
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  accent: string;
  isGuest: boolean;
  createdAt: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface HistoryItem extends Track {
  playedAt: number;
  playCount: number;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  cover: Track | null;
  trackCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistDetail extends Playlist {
  tracks: Track[];
}

export interface DownloadItem extends Track {
  filePath: string;
  size: number;
  createdAt: number;
  status: 'queued' | 'downloading' | 'ready' | 'error';
  progress: number;
  error?: string;
}

export interface Mood {
  id: string;
  title: string;
  subtitle: string;
  query: string;
  colors: [string, string];
}

export interface HomeFeed {
  greeting: string;
  dailyMix: Track[];
  forYou: Track[];
  fresh: Track[];
  recently: HistoryItem[];
  moods: Mood[];
  artists: ArtistSummary[];
}

export interface LyricLine {
  time: number;
  text: string;
}

export interface Lyrics {
  synced: LyricLine[] | null;
  plain: string | null;
  source: string;
}

export interface SearchResponse {
  query: string;
  tracks: Track[];
  top: Track | null;
  artists: ArtistSummary[];
}

export interface ImportEntry {
  title: string;
  artist: string;
  duration?: number;
}

export interface ImportResult {
  playlist: PlaylistDetail;
  matched: number;
  total: number;
  skipped: string[];
  source: string;
}

export interface FlowResponse {
  tracks: Track[];
  seed: string;
}

export interface LibraryResponse {
  likes: Track[];
  playlists: Playlist[];
  history: HistoryItem[];
}

export interface YtDlpStatus {
  state: 'ready' | 'missing' | 'downloading' | 'error';
  version: string | null;
  progress: number;
  error?: string;
  path?: string | null;
}

export interface AppStats {
  liked: number;
  playlists: number;
  plays: number;
  minutes: number;
  downloads: number;
}

export interface AccountPayload {
  user: User;
  stats: AppStats;
}

export interface AppSettings {
  volume: number;
  crossfade: boolean;
  reduceMotion: boolean;
}

export interface TrackLikePayload {
  track: Track;
}
