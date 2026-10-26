import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  DownloadItem,
  HistoryItem,
  Playlist,
  PlaylistDetail,
  Track,
  User,
} from '../shared/types';

const ACCENTS = ['#C9B8FF', '#B9E6C9', '#F3C9B8', '#B8D8F3', '#E8D7A8', '#F0B8C8'];

type Row = Record<string, any>;

function now() {
  return Date.now();
}

export function mapTrack(row: Row): Track {
  return {
    id: String(row.video_id ?? row.id),
    title: String(row.title ?? ''),
    artist: String(row.artist ?? ''),
    duration: Number(row.duration ?? 0),
    thumbnail: String(row.thumbnail ?? ''),
  };
}

export class Db {
  private db: DatabaseSync;

  constructor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    this.cleanupSessions();
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        password_hash TEXT,
        salt TEXT,
        accent TEXT NOT NULL DEFAULT '#C9B8FF',
        is_guest INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

      CREATE TABLE IF NOT EXISTS likes (
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        thumbnail TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, video_id)
      );

      CREATE TABLE IF NOT EXISTS history (
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        thumbnail TEXT NOT NULL DEFAULT '',
        played_at INTEGER NOT NULL,
        play_count INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (user_id, video_id)
      );
      CREATE INDEX IF NOT EXISTS history_recent ON history(user_id, played_at DESC);

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS playlists_user ON playlists(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        thumbnail TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, video_id)
      );

      CREATE TABLE IF NOT EXISTS downloads (
        user_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        duration INTEGER NOT NULL DEFAULT 0,
        thumbnail TEXT NOT NULL DEFAULT '',
        file_path TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, video_id)
      );

      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  private cleanupSessions() {
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());
  }

  close() {
    try {
      this.db.close();
    } catch {
      /* noop */
    }
  }

  /* ── users ─────────────────────────────────────────────── */

  countUsers(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM users').get() as Row;
    return Number(row.n);
  }

  findUserByUsername(username: string): Row | undefined {
    return this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(username.trim()) as Row | undefined;
  }

  findUserById(id: string): Row | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as Row | undefined;
  }

  createUser(input: {
    username: string;
    displayName: string;
    passwordHash: string | null;
    salt: string | null;
    isGuest: boolean;
  }): Row {
    const id = crypto.randomUUID();
    const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
    this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, password_hash, salt, accent, is_guest, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.username,
        input.displayName,
        input.passwordHash,
        input.salt,
        accent,
        input.isGuest ? 1 : 0,
        now(),
      );
    return this.findUserById(id)!;
  }

  ensureGuest(): Row {
    const existing = this.db.prepare('SELECT * FROM users WHERE is_guest = 1 LIMIT 1').get() as
      | Row
      | undefined;
    if (existing) return existing;
    return this.db
      .prepare(
        `INSERT INTO users (id, username, display_name, password_hash, salt, accent, is_guest, created_at)
         VALUES (?, ?, ?, NULL, NULL, ?, 1, ?)`,
      )
      .run('guest', 'guest', 'Гость', ACCENTS[0], now()) && this.findUserById('guest')!;
  }

  updateUser(id: string, patch: { displayName?: string; accent?: string }) {
    if (patch.displayName !== undefined) {
      this.db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(patch.displayName, id);
    }
    if (patch.accent !== undefined) {
      this.db.prepare('UPDATE users SET accent = ? WHERE id = ?').run(patch.accent, id);
    }
  }

  publicUser(row: Row): User {
    return {
      id: String(row.id),
      username: String(row.username),
      displayName: String(row.display_name),
      accent: String(row.accent),
      isGuest: Number(row.is_guest) === 1,
      createdAt: Number(row.created_at),
    };
  }

  /* ── sessions ──────────────────────────────────────────── */

  createSession(tokenHash: string, userId: string, ttlMs: number) {
    const ts = now();
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(tokenHash, userId, ts, ts + ttlMs);
  }

  findSession(tokenHash: string): Row | undefined {
    return this.db
      .prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?')
      .get(tokenHash, now()) as Row | undefined;
  }

  deleteSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  /* ── likes ─────────────────────────────────────────────── */

  like(userId: string, t: Track) {
    this.db
      .prepare(
        `INSERT INTO likes (user_id, video_id, title, artist, duration, thumbnail, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, video_id) DO UPDATE SET title=excluded.title, artist=excluded.artist,
           duration=excluded.duration, thumbnail=excluded.thumbnail`,
      )
      .run(userId, t.id, t.title, t.artist, Math.round(t.duration), t.thumbnail, now());
  }

  unlike(userId: string, videoId: string) {
    this.db.prepare('DELETE FROM likes WHERE user_id = ? AND video_id = ?').run(userId, videoId);
  }

  likes(userId: string): Track[] {
    const rows = this.db
      .prepare('SELECT * FROM likes WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Row[];
    return rows.map(mapTrack);
  }

  /* ── history ───────────────────────────────────────────── */

  recordPlay(userId: string, t: Track) {
    this.db
      .prepare(
        `INSERT INTO history (user_id, video_id, title, artist, duration, thumbnail, played_at, play_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(user_id, video_id) DO UPDATE SET
           played_at = excluded.played_at,
           play_count = history.play_count + 1,
           title = excluded.title,
           artist = excluded.artist,
           duration = excluded.duration,
           thumbnail = excluded.thumbnail`,
      )
      .run(userId, t.id, t.title, t.artist, Math.round(t.duration), t.thumbnail, now());
  }

  history(userId: string, limit = 50): HistoryItem[] {
    const rows = this.db
      .prepare('SELECT * FROM history WHERE user_id = ? ORDER BY played_at DESC LIMIT ?')
      .all(userId, limit) as Row[];
    return rows.map((r) => ({
      ...mapTrack(r),
      playedAt: Number(r.played_at),
      playCount: Number(r.play_count),
    }));
  }

  stats(userId: string) {
    const plays = this.db
      .prepare('SELECT COALESCE(SUM(play_count), 0) AS plays, COALESCE(SUM(duration * play_count), 0) AS seconds FROM history WHERE user_id = ?')
      .get(userId) as Row;
    const liked = this.db
      .prepare('SELECT COUNT(*) AS n FROM likes WHERE user_id = ?')
      .get(userId) as Row;
    const playlists = this.db
      .prepare('SELECT COUNT(*) AS n FROM playlists WHERE user_id = ?')
      .get(userId) as Row;
    const downloads = this.db
      .prepare('SELECT COUNT(*) AS n FROM downloads WHERE user_id = ?')
      .get(userId) as Row;
    return {
      liked: Number(liked.n),
      playlists: Number(playlists.n),
      downloads: Number(downloads.n),
      plays: Number(plays.plays),
      minutes: Math.round(Number(plays.seconds) / 60),
    };
  }

  /* ── playlists ─────────────────────────────────────────── */

  private playlistRow(row: Row): Playlist {
    const count = this.db
      .prepare('SELECT COUNT(*) AS n FROM playlist_tracks WHERE playlist_id = ?')
      .get(String(row.id)) as Row;
    const first = this.db
      .prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position LIMIT 1')
      .get(String(row.id)) as Row | undefined;
    return {
      id: String(row.id),
      name: String(row.name),
      description: String(row.description ?? ''),
      cover: first ? mapTrack(first) : null,
      trackCount: Number(count.n),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
    };
  }

  playlists(userId: string): Playlist[] {
    const rows = this.db
      .prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userId) as Row[];
    return rows.map((r) => this.playlistRow(r));
  }

  playlist(userId: string, id: string): PlaylistDetail | null {
    const row = this.db
      .prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?')
      .get(id, userId) as Row | undefined;
    if (!row) return null;
    const base = this.playlistRow(row);
    const tracks = this.db
      .prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? ORDER BY position')
      .all(id) as Row[];
    return { ...base, tracks: tracks.map(mapTrack) };
  }

  createPlaylist(userId: string, name: string, description = ''): Playlist {
    const id = crypto.randomUUID();
    const ts = now();
    this.db
      .prepare(
        'INSERT INTO playlists (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, userId, name.trim(), description.trim(), ts, ts);
    return this.playlist(userId, id)!;
  }

  updatePlaylist(userId: string, id: string, patch: { name?: string; description?: string }) {
    const current = this.playlist(userId, id);
    if (!current) return null;
    const name = patch.name?.trim() ?? current.name;
    const description = patch.description?.trim() ?? current.description;
    this.db
      .prepare('UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(name, description, now(), id, userId);
    return this.playlist(userId, id);
  }

  deletePlaylist(userId: string, id: string) {
    this.db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(id);
    this.db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?').run(id, userId);
  }

  addToPlaylist(userId: string, playlistId: string, t: Track): PlaylistDetail | null {
    const pl = this.playlist(userId, playlistId);
    if (!pl) return null;
    const next = this.db
      .prepare('SELECT COALESCE(MAX(position), 0) + 1 AS pos FROM playlist_tracks WHERE playlist_id = ?')
      .get(playlistId) as Row;
    this.db
      .prepare(
        `INSERT INTO playlist_tracks (playlist_id, video_id, title, artist, duration, thumbnail, position, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(playlist_id, video_id) DO NOTHING`,
      )
      .run(playlistId, t.id, t.title, t.artist, Math.round(t.duration), t.thumbnail, Number(next.pos), now());
    this.db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
    return this.playlist(userId, playlistId);
  }

  removeFromPlaylist(userId: string, playlistId: string, videoId: string): PlaylistDetail | null {
    const pl = this.playlist(userId, playlistId);
    if (!pl) return null;
    this.db
      .prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND video_id = ?')
      .run(playlistId, videoId);
    this.db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
    return this.playlist(userId, playlistId);
  }

  /* ── downloads ─────────────────────────────────────────── */

  saveDownload(userId: string, t: Track, filePath: string, size: number) {
    this.db
      .prepare(
        `INSERT INTO downloads (user_id, video_id, title, artist, duration, thumbnail, file_path, size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, video_id) DO UPDATE SET file_path=excluded.file_path, size=excluded.size,
           created_at=excluded.created_at, title=excluded.title, artist=excluded.artist,
           duration=excluded.duration, thumbnail=excluded.thumbnail`,
      )
      .run(userId, t.id, t.title, t.artist, Math.round(t.duration), t.thumbnail, filePath, size, now());
  }

  downloads(userId: string): DownloadItem[] {
    const rows = this.db
      .prepare('SELECT * FROM downloads WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Row[];
    return rows.map((r) => ({
      ...mapTrack(r),
      filePath: String(r.file_path),
      size: Number(r.size),
      createdAt: Number(r.created_at),
      status: 'ready' as const,
      progress: 100,
    }));
  }

  download(userId: string, videoId: string): DownloadItem | undefined {
    return this.downloads(userId).find((d) => d.id === videoId);
  }

  removeDownload(userId: string, videoId: string) {
    this.db.prepare('DELETE FROM downloads WHERE user_id = ? AND video_id = ?').run(userId, videoId);
  }

  /* ── generic cache ─────────────────────────────────────── */

  getCache<T>(key: string): T | null {
    const row = this.db
      .prepare('SELECT value, updated_at FROM cache WHERE key = ?')
      .get(key) as Row | undefined;
    if (!row) return null;
    return JSON.parse(String(row.value)) as T;
  }

  setCache(key: string, value: unknown) {
    this.db
      .prepare('INSERT INTO cache (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at')
      .run(key, JSON.stringify(value), now());
  }

  clearCache() {
    this.db.prepare('DELETE FROM cache').run();
  }
}
