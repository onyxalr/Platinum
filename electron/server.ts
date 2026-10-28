import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  ArtistSummary,
  DownloadItem,
  FlowResponse,
  HomeFeed,
  ImportResult,
  LibraryResponse,
  Mood,
  PlaylistDetail,
  SearchResponse,
  Track,
} from '../shared/types';
import { Db } from './db';
import { parseImportSource } from './import';
import { YtDlp } from './ytdlp';
import { hashPassword, hashToken, newToken, sessionTtl, validatePassword, validateUsername, verifyPassword } from './auth';
import { lookupLyrics } from './lyrics';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

const MOODS: Mood[] = [
  {
    id: 'night',
    title: 'Ночной драйв',
    subtitle: 'Синтвейв и неон',
    query: 'synthwave night drive music',
    colors: ['#3B2A6B', '#0B0B12'],
  },
  {
    id: 'focus',
    title: 'Фокус',
    subtitle: 'Лоу-фай для работы',
    query: 'lofi hip hop beats to study',
    colors: ['#1C3A30', '#0A0B0B'],
  },
  {
    id: 'energy',
    title: 'Энергия',
    subtitle: 'Фонк и бас',
    query: 'phonk drift music',
    colors: ['#4A1D22', '#0B0B0B'],
  },
  {
    id: 'soft',
    title: 'Мягкий вечер',
    subtitle: 'R&B и соул',
    query: 'rnb soul evening music',
    colors: ['#3C2436', '#0B0B0B'],
  },
];

const ACCENTS = ['#C9B8FF', '#B9E6C9', '#F3C9B8', '#B8D8F3', '#E8D7A8', '#F0B8C8'];

/*
 * YouTube search has no usable music-only filter in this region, so discovery
 * starts from artist seeds rather than mood keywords that surface long radios.
 * Search results are still ranked and filtered by the yt-dlp layer.
 */
const CURATED_ARTISTS = [
  'The Weeknd',
  'Dua Lipa',
  'Tame Impala',
  'Frank Ocean',
  'SZA',
  'Arctic Monkeys',
  'Radiohead',
  'Nirvana',
  'Deftones',
  'Massive Attack',
  'Bonobo',
  'Fred again..',
  'ODESZA',
  'M83',
  'Men I Trust',
  'Cigarettes After Sex',
  'Lana Del Rey',
  'Mac DeMarco',
  'Kendrick Lamar',
  'Billie Eilish',
  'Bring Me The Horizon',
  'Aphex Twin',
  'Кино',
  'Молчат Дома',
  'Земфира',
  'Скриптонит',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash;
}

function curatedArtist(seed: string, offset = 0): string {
  return CURATED_ARTISTS[(hashString(seed) + offset * 7) % CURATED_ARTISTS.length];
}

function pickArtist(seed: string, offset: number, exclude: string[] = []): string {
  for (let i = 0; i < CURATED_ARTISTS.length; i++) {
    const candidate = curatedArtist(seed, offset + i);
    if (!exclude.includes(candidate)) return candidate;
  }
  return CURATED_ARTISTS[0];
}

function playableTrack(track: Track): boolean {
  return track.duration > 0 && track.duration <= 12 * 60;
}

function artistKey(name: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .trim();
}

/**
 * Home and search both surface a small, verified artist shelf. Only artists
 * whose tracks came from official Topic/VEVO/verified channels are included,
 * so the shelf never advertises a random re-upload.
 */
function collectArtists(tracks: Track[], limit = 6): ArtistSummary[] {
  const map = new Map<string, ArtistSummary>();
  for (const track of tracks) {
    if (!track.verified) continue;
    // The official channel is a more stable artist identity than the credit
    // string, which may list several collaborators for a single track.
    const displayName = (track.channelName || track.artist || '').trim();
    if (!displayName) continue;
    const key = artistKey(displayName);
    const creditKey = artistKey(track.artist);
    if (!key || !creditKey) continue;
    // Verified networks and label channels also upload music, but they are not
    // artists. Only surface a channel when it is the credited act or a member of
    // the credited collaboration (official channel vs. featured artists).
    const officialChannel =
      key === creditKey || creditKey.includes(key) || key.includes(creditKey);
    if (!officialChannel) continue;
    const existing = map.get(key);
    if (existing) {
      existing.trackCount += 1;
      if (existing.tracks.length < 12) existing.tracks.push(track);
      if (!existing.thumbnail) existing.thumbnail = track.thumbnail;
      existing.verified = existing.verified || Boolean(track.verified);
      existing.channelId = existing.channelId || track.channelId;
    } else {
      map.set(key, {
        name: displayName,
        channelId: track.channelId,
        thumbnail: track.thumbnail,
        verified: Boolean(track.verified),
        trackCount: 1,
        tracks: [track],
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.trackCount - a.trackCount)
    .slice(0, limit);
}

interface ServerContext {
  db: Db;
  ytdlp: YtDlp;
  downloadsDir: string;
  version: string;
}

interface DownloadJob {
  track: Track;
  status: 'queued' | 'downloading' | 'error';
  progress: number;
  error?: string;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const jobs = new Map<string, DownloadJob>();
const loginAttempts = new Map<string, number[]>();

function json(res: ServerResponse, status: number, payload: unknown) {
  if (res.headersSent) return;
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(body);
}

function cors(res: ServerResponse) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'authorization,content-type,range');
  res.setHeader('access-control-expose-headers', 'content-range,accept-ranges,content-length');
}

async function readJson(req: IncomingMessage): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new HttpError(413, 'Слишком большой запрос');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Некорректный JSON');
  }
}

function sanitizeTrack(value: any): Track | null {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.id || '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  const title = String(value.title || '').slice(0, 300).trim();
  if (!title) return null;
  const channelId = String(value.channelId || '').slice(0, 80);
  const channelName = String(value.channelName || '').slice(0, 200).trim();
  return {
    id,
    title,
    artist: String(value.artist || 'Неизвестный исполнитель').slice(0, 200).trim() || 'Неизвестный исполнитель',
    duration: Math.max(0, Math.min(24 * 60 * 60, Number(value.duration) || 0)),
    thumbnail: String(value.thumbnail || '').slice(0, 1000),
    ...(channelId ? { channelId } : {}),
    ...(channelName ? { channelName } : {}),
    ...(value.verified === true ? { verified: true } : {}),
  };
}

function authToken(req: IncomingMessage, url: URL): string | null {
  const header = req.headers.authorization;
  if (header && header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  const query = url.searchParams.get('token');
  return query || null;
}

function bucket(ms: number): number {
  return Math.floor(Date.now() / ms);
}

function dedupe(tracks: Track[], used: Set<string>, limit?: number): Track[] {
  const out: Track[] = [];
  for (const track of tracks) {
    if (used.has(track.id)) continue;
    used.add(track.id);
    out.push(track);
    if (limit && out.length >= limit) break;
  }
  return out;
}

export function createApiServer(ctx: ServerContext) {
  const { db, ytdlp, downloadsDir, version } = ctx;

  function userFrom(req: IncomingMessage, url: URL): any | null {
    const token = authToken(req, url);
    if (!token) return null;
    const session = db.findSession(hashToken(token));
    if (!session) return null;
    return db.findUserById(String(session.user_id)) ?? null;
  }

  function issueToken(user: any): string {
    const { token, hash } = newToken();
    db.createSession(hash, String(user.id), sessionTtl);
    return token;
  }

  function accountPayload(user: any) {
    return { user: db.publicUser(user), stats: db.stats(String(user.id)) };
  }

  function downloadItem(userId: string, videoId: string): DownloadItem | undefined {
    const key = `${userId}:${videoId}`;
    const job = jobs.get(key);
    if (job) {
      return {
        ...job.track,
        filePath: '',
        size: 0,
        createdAt: Date.now(),
        status: job.status === 'error' ? 'error' : job.status === 'queued' ? 'queued' : 'downloading',
        progress: job.progress,
        error: job.error,
      };
    }
    return db.download(userId, videoId);
  }

  function localFile(userId: string, videoId: string): string | null {
    const item = db.download(userId, videoId);
    if (!item) return null;
    if (fs.existsSync(item.filePath)) return item.filePath;
    db.removeDownload(userId, videoId);
    return null;
  }

  // History may contain old long mixes and non-music from before strict
  // filtering. Keep that raw history in the library, but never let it leak
  // back into the home feed or steer recommendations.
  function musicHistory(userId: string, limit: number) {
    return db
      .history(userId, Math.max(limit * 3, 40))
      .filter(playableTrack)
      .slice(0, limit);
  }

  async function serveLocal(
    req: IncomingMessage,
    res: ServerResponse,
    filePath: string,
  ): Promise<void> {
    const stat = await fsp.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === '.m4a' || ext === '.mp4'
        ? 'audio/mp4'
        : ext === '.webm'
          ? 'audio/webm'
          : ext === '.mp3'
            ? 'audio/mpeg'
            : ext === '.opus'
              ? 'audio/ogg'
              : 'application/octet-stream';
    const range = req.headers.range;
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        start = match[1] ? Number(match[1]) : 0;
        end = match[2] ? Number(match[2]) : stat.size - 1;
        if (start > end || start >= stat.size) {
          res.writeHead(416, { 'content-range': `bytes */${stat.size}` });
          res.end();
          return;
        }
        status = 206;
      }
    }
    res.writeHead(status, {
      'content-type': type,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      ...(status === 206 ? { 'content-range': `bytes ${start}-${end}/${stat.size}` } : {}),
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }

  async function proxyAudio(
    videoId: string,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt === 1) ytdlp.invalidateStream(videoId);
      const upstreamUrl = await ytdlp.resolveStream(videoId);
      try {
        await new Promise<void>((resolve, reject) => {
          const target = new URL(upstreamUrl);
          const headers: Record<string, string> = {
            'user-agent': UA,
            accept: '*/*',
            'accept-language': 'en-US,en;q=0.9',
          };
          if (req.headers.range) headers.range = String(req.headers.range);
          const upstream = https.request(
            {
              protocol: target.protocol,
              hostname: target.hostname,
              port: target.port || 443,
              path: `${target.pathname}${target.search}`,
              method: req.method === 'HEAD' ? 'HEAD' : 'GET',
              headers,
            },
            (up) => {
              const status = up.statusCode || 502;
              if (status === 403 || status === 410 || status === 429) {
                up.resume();
                reject(new Error(`upstream ${status}`));
                return;
              }
              if (status >= 400) {
                up.resume();
                reject(new Error(`upstream ${status}`));
                return;
              }
              res.writeHead(status, {
                'content-type': up.headers['content-type'] || 'audio/mp4',
                'content-length': up.headers['content-length'] || '',
                'content-range': up.headers['content-range'] || '',
                'accept-ranges': up.headers['accept-ranges'] || 'bytes',
                'cache-control': 'no-store',
                'access-control-allow-origin': '*',
              });
              up.pipe(res);
              up.on('error', () => res.destroy());
              up.on('end', resolve);
              res.on('close', () => up.destroy());
            },
          );
          upstream.on('error', reject);
          req.on('aborted', () => upstream.destroy());
          res.on('close', () => upstream.destroy());
          upstream.end();
        });
        return;
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
  }

  async function serveAudio(
    req: IncomingMessage,
    res: ServerResponse,
    user: any,
    videoId: string,
  ) {
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) throw new HttpError(400, 'Некорректный трек');
    const file = localFile(String(user.id), videoId);
    if (file) {
      await serveLocal(req, res, file);
      return;
    }
    try {
      await proxyAudio(videoId, req, res);
    } catch (err) {
      if (!res.headersSent) {
        throw new HttpError(502, 'Не удалось получить аудиопоток');
      }
      res.destroy();
    }
  }

  async function homeFeed(user: any): Promise<HomeFeed> {
    const userId = String(user.id);
    const cacheKey = `home:v6:${userId}:${bucket(1000 * 60 * 20)}`;
    const cached = db.getCache<HomeFeed>(cacheKey);
    if (cached) {
      return {
        ...cached,
        recently: musicHistory(userId, 8),
        artists: cached.artists?.length ? cached.artists : collectArtists([...cached.dailyMix, ...cached.forYou, ...cached.fresh]),
      };
    }

    const likes = db.likes(userId);
    const history = musicHistory(userId, 100);
    const artistScore = new Map<string, number>();
    for (const track of likes) artistScore.set(track.artist, (artistScore.get(track.artist) || 0) + 3);
    for (const track of history) artistScore.set(track.artist, (artistScore.get(track.artist) || 0) + 1);
    const rankedArtists = [...artistScore.entries()].sort((a, b) => b[1] - a[1]);
    // One accidental play should not define the entire front page.
    const topArtist = rankedArtists[0] && rankedArtists[0][1] >= 5 ? rankedArtists[0][0] : null;

    const seed = `${userId}:${bucket(1000 * 60 * 60 * 6)}`;
    const dailyArtist = topArtist || pickArtist(seed, 0);
    const secondArtist = pickArtist(seed, 1, [dailyArtist]);
    const thirdArtist = pickArtist(seed, 2, [dailyArtist, secondArtist]);
    const queries = [
      `${dailyArtist} official audio`,
      `${secondArtist} official audio`,
      `${thirdArtist} official audio`,
    ];

    const results = await Promise.allSettled(
      queries.map((q) => ytdlp.search(q, 14)),
    );

    const used = new Set<string>();
    const sections = results.map((r) =>
      (r.status === 'fulfilled' ? r.value : []).filter(playableTrack),
    );
    const dailyMix = dedupe(sections[0], used, 10);
    const forYou = dedupe(sections[1], used, 10);
    const fresh = dedupe(sections[2], used, 10);
    const failed = results.every((r) => r.status === 'rejected');
    if (failed) {
      const reason = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      const message = reason?.reason instanceof Error ? reason.reason.message : 'Музыкальный каталог недоступен';
      throw new HttpError(503, message);
    }

    const feed: HomeFeed = {
      greeting: '',
      dailyMix,
      forYou,
      fresh,
      recently: musicHistory(userId, 8),
      moods: MOODS,
      artists: collectArtists([...dailyMix, ...forYou, ...fresh]),
    };
    db.setCache(cacheKey, feed);
    return feed;
  }

  async function flowFeed(user: any, exclude: Set<string>): Promise<FlowResponse> {
    const userId = String(user.id);
    const likes = db.likes(userId);
    const history = musicHistory(userId, 60);
    const artistScore = new Map<string, number>();
    for (const track of likes) artistScore.set(track.artist, (artistScore.get(track.artist) || 0) + 3);
    for (const track of history) artistScore.set(track.artist, (artistScore.get(track.artist) || 0) + 1);
    const rankedArtists = [...artistScore.entries()].sort((a, b) => b[1] - a[1]);
    const topArtist = rankedArtists[0] && rankedArtists[0][1] >= 4 ? rankedArtists[0][0] : null;
    const seed = `${userId}:${bucket(1000 * 60 * 60 * 3)}`;
    const firstArtist = topArtist || pickArtist(seed, 3);
    const secondArtist = pickArtist(seed, 4, [firstArtist]);
    const thirdArtist = pickArtist(seed, 5, [firstArtist, secondArtist]);
    const queries = [
      `${firstArtist} official audio`,
      `${secondArtist} official audio`,
      `${thirdArtist} official audio`,
    ];
    const results = await Promise.allSettled(queries.map((q) => ytdlp.search(q, 12)));
    const found = results
      .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      .filter(playableTrack);
    const personal = [...likes, ...history];
    for (let i = personal.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [personal[i], personal[j]] = [personal[j], personal[i]];
    }
    const used = new Set<string>(exclude);
    const tracks = dedupe([...personal, ...found], used, 24);
    if (!tracks.length && results.every((r) => r.status === 'rejected')) {
      throw new HttpError(503, 'Не удалось собрать ленту');
    }
    return { tracks, seed: topArtist || 'platinum' };
  }

  async function handle(req: IncomingMessage, res: ServerResponse) {
    cors(res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = decodeURIComponent(url.pathname);
    const method = req.method || 'GET';

    if (pathname === '/api/health') {
      return json(res, 200, { ok: true, version });
    }

    const streamMatch = /^\/stream\/([A-Za-z0-9_-]+)$/.exec(pathname);
    if (streamMatch) {
      const user = userFrom(req, url);
      if (!user) return json(res, 401, { error: 'Требуется вход' });
      return serveAudio(req, res, user, streamMatch[1]);
    }

    const mediaMatch = /^\/media\/([A-Za-z0-9_-]+)$/.exec(pathname);
    if (mediaMatch) {
      const user = userFrom(req, url);
      if (!user) return json(res, 401, { error: 'Требуется вход' });
      const file = localFile(String(user.id), mediaMatch[1]);
      if (!file) return json(res, 404, { error: 'Файл не найден' });
      return serveLocal(req, res, file);
    }

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readJson(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const displayName = String(body.displayName || username).trim().slice(0, 40) || username;
      const usernameError = validateUsername(username);
      if (usernameError) throw new HttpError(400, usernameError);
      const passwordError = validatePassword(password);
      if (passwordError) throw new HttpError(400, passwordError);
      if (db.findUserByUsername(username)) throw new HttpError(409, 'Это имя уже занято');
      const { hash, salt } = hashPassword(password);
      const user = db.createUser({
        username,
        displayName,
        passwordHash: hash,
        salt,
        isGuest: false,
      });
      const account = db.publicUser(user);
      return json(res, 201, { token: issueToken(user), user: account });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJson(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const key = `${username.toLowerCase()}:${req.socket.remoteAddress || ''}`;
      const attempts = (loginAttempts.get(key) || []).filter((t) => Date.now() - t < 1000 * 60 * 10);
      if (attempts.length >= 8) throw new HttpError(429, 'Слишком много попыток. Попробуйте позже');
      const row = db.findUserByUsername(username);
      if (!row || Number(row.is_guest) === 1 || !row.password_hash || !row.salt) {
        loginAttempts.set(key, [...attempts, Date.now()]);
        throw new HttpError(401, 'Неверное имя пользователя или пароль');
      }
      if (!verifyPassword(password, String(row.salt), String(row.password_hash))) {
        loginAttempts.set(key, [...attempts, Date.now()]);
        throw new HttpError(401, 'Неверное имя пользователя или пароль');
      }
      loginAttempts.delete(key);
      return json(res, 200, { token: issueToken(row), user: db.publicUser(row) });
    }

    if (pathname === '/api/auth/guest' && method === 'POST') {
      const guest = db.ensureGuest();
      return json(res, 200, { token: issueToken(guest), user: db.publicUser(guest) });
    }

    if (pathname === '/api/ytdlp' && method === 'GET') {
      return json(res, 200, ytdlp.status());
    }

    const user = userFrom(req, url);
    if (!user) return json(res, 401, { error: 'Требуется вход' });
    const userId = String(user.id);

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const token = authToken(req, url);
      if (token) db.deleteSession(hashToken(token));
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/me' && method === 'GET') {
      return json(res, 200, accountPayload(user));
    }

    if (pathname === '/api/me' && method === 'PATCH') {
      const body = await readJson(req);
      const patch: { displayName?: string; accent?: string } = {};
      if (body.displayName !== undefined) {
        const name = String(body.displayName).trim().slice(0, 40);
        if (!name) throw new HttpError(400, 'Имя не может быть пустым');
        patch.displayName = name;
      }
      if (body.accent !== undefined) {
        const accent = String(body.accent);
        if (!/^#[0-9a-fA-F]{6}$/.test(accent)) throw new HttpError(400, 'Некорректный цвет');
        patch.accent = accent;
      }
      db.updateUser(userId, patch);
      return json(res, 200, accountPayload(db.findUserById(userId)!));
    }

    if (pathname === '/api/ytdlp/update' && method === 'POST') {
      ytdlp.update().catch(() => undefined);
      return json(res, 202, ytdlp.status());
    }

    if (pathname === '/api/library' && method === 'GET') {
      const payload: LibraryResponse = {
        likes: db.likes(userId),
        playlists: db.playlists(userId),
        history: db.history(userId, 60),
      };
      return json(res, 200, payload);
    }

    if (pathname === '/api/home' && method === 'GET') {
      const feed = await homeFeed(user);
      return json(res, 200, feed);
    }

    if (pathname === '/api/flow' && method === 'GET') {
      const exclude = new Set(
        (url.searchParams.get('exclude') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      );
      const feed = await flowFeed(user, exclude);
      return json(res, 200, feed);
    }

    if (pathname === '/api/search' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json(res, 200, { query: '', tracks: [], top: null, artists: [] } satisfies SearchResponse);
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 24, 1), 40);
      const tracks = await ytdlp.search(q, limit);
      const payload: SearchResponse = {
        query: q,
        tracks,
        top: tracks[0] ?? null,
        artists: collectArtists(tracks, 4),
      };
      return json(res, 200, payload);
    }

    if (pathname === '/api/artist' && method === 'GET') {
      const name = (url.searchParams.get('name') || '').trim().slice(0, 120);
      if (!name) throw new HttpError(400, 'Не указан исполнитель');
      const profile = await ytdlp.artist(name);
      if (!profile || !profile.tracks.length) throw new HttpError(404, 'Исполнитель не найден');
      return json(res, 200, profile);
    }

    if (pathname === '/api/import' && method === 'POST') {
      const body = await readJson(req);
      const parsed = await parseImportSource({
        url: typeof body.url === 'string' ? body.url : undefined,
        text: typeof body.text === 'string' ? body.text : undefined,
      });
      const entries = parsed.entries.slice(0, 40);
      const resolved = await ytdlp.resolveMany(entries, 3);
      const tracks: Track[] = [];
      const used = new Set<string>();
      const skipped: string[] = [];
      entries.forEach((entry, index) => {
        const track = resolved[index];
        if (!track) {
          skipped.push(`${entry.artist ? `${entry.artist} — ` : ''}${entry.title}`);
          return;
        }
        if (used.has(track.id)) return;
        used.add(track.id);
        tracks.push(track);
      });
      if (!tracks.length) {
        throw new HttpError(422, 'Не удалось найти эти треки в доступном каталоге');
      }
      const name = String(body.name || '').trim().slice(0, 80) || parsed.title;
      const playlist = db.createPlaylist(userId, name, `Импорт · ${parsed.source}`);
      for (const track of tracks) db.addToPlaylist(userId, playlist.id, track);
      const detail = db.playlist(userId, playlist.id);
      if (!detail) throw new HttpError(500, 'Не удалось создать плейлист');
      const payload: ImportResult = {
        playlist: detail,
        matched: tracks.length,
        total: entries.length,
        skipped,
        source: parsed.source,
      };
      return json(res, 201, payload);
    }

    if (pathname === '/api/suggest' && method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) return json(res, 200, { suggestions: [] });
      try {
        const resSuggest = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
          { signal: AbortSignal.timeout(5000) },
        );
        const data = await resSuggest.json();
        return json(res, 200, { suggestions: Array.isArray(data?.[1]) ? data[1].slice(0, 8) : [] });
      } catch {
        return json(res, 200, { suggestions: [] });
      }
    }

    if (pathname === '/api/lyrics' && method === 'GET') {
      const title = (url.searchParams.get('title') || '').trim();
      const artist = (url.searchParams.get('artist') || '').trim();
      const duration = Number(url.searchParams.get('duration')) || 0;
      if (!title) throw new HttpError(400, 'Не указан трек');
      const lyrics = await lookupLyrics(title, artist, duration);
      return json(res, 200, lyrics);
    }

    if (pathname === '/api/likes' && method === 'GET') {
      return json(res, 200, db.likes(userId));
    }

    const likeMatch = /^\/api\/likes\/([A-Za-z0-9_-]+)$/.exec(pathname);
    if (likeMatch) {
      if (method === 'PUT') {
        const body = await readJson(req);
        const track = sanitizeTrack(body.track);
        if (!track) throw new HttpError(400, 'Некорректный трек');
        db.like(userId, track);
        return json(res, 200, { liked: true });
      }
      if (method === 'DELETE') {
        db.unlike(userId, likeMatch[1]);
        return json(res, 200, { liked: false });
      }
    }

    if (pathname === '/api/history' && method === 'GET') {
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 40, 1), 200);
      return json(res, 200, db.history(userId, limit));
    }

    if (pathname === '/api/history' && method === 'POST') {
      const body = await readJson(req);
      const track = sanitizeTrack(body.track);
      if (!track) throw new HttpError(400, 'Некорректный трек');
      db.recordPlay(userId, track);
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/playlists' && method === 'GET') {
      return json(res, 200, db.playlists(userId));
    }

    if (pathname === '/api/playlists' && method === 'POST') {
      const body = await readJson(req);
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) throw new HttpError(400, 'Введите название плейлиста');
      const playlist = db.createPlaylist(userId, name, String(body.description || '').slice(0, 200));
      return json(res, 201, playlist);
    }

    const playlistMatch = /^\/api\/playlists\/([A-Za-z0-9-]+)$/.exec(pathname);
    if (playlistMatch) {
      const id = playlistMatch[1];
      if (method === 'GET') {
        const playlist = db.playlist(userId, id);
        if (!playlist) throw new HttpError(404, 'Плейлист не найден');
        return json(res, 200, playlist);
      }
      if (method === 'PATCH') {
        const body = await readJson(req);
        const updated = db.updatePlaylist(userId, id, {
          name: body.name !== undefined ? String(body.name) : undefined,
          description: body.description !== undefined ? String(body.description) : undefined,
        });
        if (!updated) throw new HttpError(404, 'Плейлист не найден');
        return json(res, 200, updated);
      }
      if (method === 'DELETE') {
        db.deletePlaylist(userId, id);
        return json(res, 200, { ok: true });
      }
    }

    const playlistTracksMatch = /^\/api\/playlists\/([A-Za-z0-9-]+)\/tracks$/.exec(pathname);
    if (playlistTracksMatch && method === 'POST') {
      const body = await readJson(req);
      const track = sanitizeTrack(body.track);
      if (!track) throw new HttpError(400, 'Некорректный трек');
      const updated: PlaylistDetail | null = db.addToPlaylist(userId, playlistTracksMatch[1], track);
      if (!updated) throw new HttpError(404, 'Плейлист не найден');
      return json(res, 200, updated);
    }

    const playlistTrackMatch = /^\/api\/playlists\/([A-Za-z0-9-]+)\/tracks\/([A-Za-z0-9_-]+)$/.exec(pathname);
    if (playlistTrackMatch && method === 'DELETE') {
      const updated = db.removeFromPlaylist(userId, playlistTrackMatch[1], playlistTrackMatch[2]);
      if (!updated) throw new HttpError(404, 'Плейлист не найден');
      return json(res, 200, updated);
    }

    if (pathname === '/api/downloads' && method === 'GET') {
      const ready = db.downloads(userId);
      const active: DownloadItem[] = [];
      for (const [key, job] of jobs) {
        if (!key.startsWith(`${userId}:`)) continue;
        if (ready.some((d) => d.id === job.track.id)) continue;
        active.push({
          ...job.track,
          filePath: '',
          size: 0,
          createdAt: Date.now(),
          status: job.status === 'error' ? 'error' : job.status === 'queued' ? 'queued' : 'downloading',
          progress: job.progress,
          error: job.error,
        });
      }
      return json(res, 200, [...active, ...ready]);
    }

    if (pathname === '/api/downloads' && method === 'POST') {
      const body = await readJson(req);
      const track = sanitizeTrack(body.track);
      if (!track) throw new HttpError(400, 'Некорректный трек');
      const key = `${userId}:${track.id}`;
      if (db.download(userId, track.id) || jobs.get(key)?.status === 'downloading') {
        return json(res, 200, downloadItem(userId, track.id));
      }
      const job: DownloadJob = { track, status: 'downloading', progress: 0 };
      jobs.set(key, job);
      void ytdlp
        .download(track, downloadsDir, (percent) => {
          job.progress = percent;
        })
        .then(({ filePath, size }) => {
          db.saveDownload(userId, track, filePath, size);
          jobs.delete(key);
        })
        .catch((err) => {
          job.status = 'error';
          job.error = err instanceof Error ? err.message : 'Ошибка загрузки';
          job.progress = 0;
        });
      return json(res, 202, downloadItem(userId, track.id));
    }

    const downloadMatch = /^\/api\/downloads\/([A-Za-z0-9_-]+)$/.exec(pathname);
    if (downloadMatch && method === 'DELETE') {
      const videoId = downloadMatch[1];
      const item = db.download(userId, videoId);
      if (item?.filePath) await fsp.rm(item.filePath, { force: true }).catch(() => undefined);
      db.removeDownload(userId, videoId);
      jobs.delete(`${userId}:${videoId}`);
      return json(res, 200, { ok: true });
    }

    if (pathname === '/api/account/accent' && method === 'POST') {
      const body = await readJson(req);
      const accent = String(body.accent || '');
      if (!ACCENTS.includes(accent)) throw new HttpError(400, 'Недоступный цвет');
      db.updateUser(userId, { accent });
      return json(res, 200, accountPayload(db.findUserById(userId)!));
    }

    throw new HttpError(404, 'Не найдено');
  }

  return new Promise<{ server: http.Server; port: number; url: string }>((resolve) => {
    const server = http.createServer((req, res) => {
      handle(req, res).catch((err) => {
        const status = err instanceof HttpError ? err.status : 500;
        if (!(err instanceof HttpError)) console.error('[api]', err);
        if (!res.headersSent) json(res, status, { error: err instanceof Error ? err.message : 'Ошибка' });
        else res.destroy();
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      ytdlp.init().catch((err) => console.error('[ytdlp]', err));
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}
