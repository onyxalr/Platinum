import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Track, YtDlpStatus } from '../shared/types';

const MAX_BUFFER = 32 * 1024 * 1024;
const execFileAsync = promisify(execFile);

const TITLE_TAGS = [
  /\(\s*official\s*(music\s*)?video\s*\)/gi,
  /\[\s*official\s*(music\s*)?video\s*\]/gi,
  /\(\s*official\s*audio\s*\)/gi,
  /\[\s*official\s*audio\s*\]/gi,
  /\|\s*official\s*audio\s*$/gi,
  /\(\s*official\s*lyric\s*video\s*\)/gi,
  /\(\s*(digital\s*)?remaster(ed)?(\s*\d{4})?[^)]*\)/gi,
  /\[\s*(digital\s*)?remaster(ed)?(\s*\d{4})?[^\]]*\]/gi,
  /\(\s*lyrics?\s*\)/gi,
  /\[\s*lyrics?\s*\]/gi,
  /\(\s*audio\s*\)/gi,
  /\[\s*audio\s*\]/gi,
  /\(\s*(official\s*)?visualizer\s*\)/gi,
  /\[\s*(official\s*)?visualizer\s*\]/gi,
  /\bofficial\s+music\s+video\b/gi,
  /\(\s*hd\s*\)/gi,
  /\[\s*hd\s*\]/gi,
  /\(\s*4k\s*\)/gi,
  /\[\s*4k\s*\]/gi,
  /\(\s*explicit\s*\)/gi,
  /\s*\|\s*official\s*(music\s*)?video\s*$/gi,
];

export function cleanTitle(raw: string): string {
  let title = String(raw || '').trim();
  for (const re of TITLE_TAGS) title = title.replace(re, ' ');
  title = title.replace(/\s{2,}/g, ' ').replace(/[\s\-–—]+$/g, '').trim();
  return title || String(raw || '').trim();
}

export function cleanArtist(raw: string): string {
  return String(raw || '')
    .replace(/\s*-\s*Topic\s*$/i, '')
    .replace(/\s*VEVO\s*$/i, '')
    .trim();
}

function parseDuration(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':').map((n) => Number(n));
    if (parts.every((n) => Number.isFinite(n))) {
      return Math.round(parts.reduce((acc, n) => acc * 60 + n, 0));
    }
  }
  return 0;
}

/*
 * YouTube's plain search is noisy: tutorials, podcasts, news clips, gameplay
 * and 24/7 streams all compete with songs. We score and classify candidates
 * before they ever reach the UI, preferring official audio / Topic / VEVO
 * uploads and collapsing duplicate video + audio uploads into one track.
 */
const NON_MUSIC_TITLE =
  /\b(podcast|interview|reaction|reacts?|review|unboxing|tutorial|lesson|course|lecture|trailer|teaser|gameplay|walkthrough|vlog|prank|challenge|comedy|stand[- ]?up|highlights?|news|documentary|behind the scenes|making of|explained|analysis|breakdown|how to|dance practice|choreography|karaoke|audiobook|audio book|full movie|movie clip|series|episode|shorts?|tiktok|meme|funny|blind date|first date|dating|girlfriend|boyfriend|relationship|couple|picks a|spent the night|sports?|football|soccer|basketball|boxing|ufc|fortnite|minecraft|roblox|gta|asmr|white noise|rain sounds|nature sounds|sleep sounds|meditation|affirmations|sound bath|full album|album review)\b/i;
const NON_MUSIC_TITLE_RU =
  /(подкаст|интервью|реакц|обзор|влог|пранк|прикол|челлендж|геймплей|прохожд|новост|смешн|разоблач|эксперимент|секретн|проследил|предател|девушек|парней|женщин|мужчин|первое свидание|свидание с|хайп|фильм|сериал|серию|сезон|серия|детектив|триллер|боевик|комедия|мелодрама|ужасы|фантастика|смотреть|онлайн|премьер|кинопоиск|кинопорт|кинотеатр|документальн|телепередач|выпуск|эпизод|трейлер|тизер|сцен[аы] из|акт[её]ры|дубляж)/i;
const NON_MUSIC_CHANNEL =
  /\b(news|gaming|games|sports|podcast|reactions?|comedy|clips|highlights?|league|esports|trailers?|movies?|film|films|cinema|vlog|detective|show|humor|series)\b/i;
const NON_MUSIC_CHANNEL_RU = /(хайп|прикол|юмор|влог|шоу|тнт|детектив|новост|игр|лайф|фильм|сериал)/i;
const BAD_TITLE_PREFIX = /^(best|top|new|chill|relax|study|sleep|summer|winter|late night|music|official|playlist|mix|nonstop|the best|deep|soft)\b/i;
const MUSIC_SIGNAL =
  /\b(official\s*(audio|video|music video|lyric video)|lyrics?|audio|visualizer|music|song|track|album|single|remix|mix|beats?|instrumentals?|cover|acoustic|live at|session|edit|feat\.?|ft\.?|prod\.?|topic)\b/i;
const MIX_SIGNAL =
  /\b(mix|playlist|play list|compilation|radio|beats? to|chill|study|focus|sleep|ambient|lo-?fi|instrumental|non[- ]?stop)\b/i;

function canonical(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9а-яё]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface RankedTrack {
  track: Track;
  score: number;
  key: string;
}

function rankEntry(entry: any, query = ''): RankedTrack | null {
  if (!entry || typeof entry.id !== 'string' || !/^[A-Za-z0-9_-]{6,20}$/.test(entry.id)) return null;
  const rawTitle = String(entry.title || '').trim();
  const rawChannel = String(entry.channel || entry.uploader || entry.creator || 'YouTube').trim();
  if (!rawTitle || !rawChannel) return null;
  if (
    NON_MUSIC_TITLE.test(rawTitle) ||
    NON_MUSIC_TITLE_RU.test(rawTitle) ||
    NON_MUSIC_CHANNEL.test(rawChannel) ||
    NON_MUSIC_CHANNEL_RU.test(rawChannel)
  )
    return null;
  if (/\b(24\/7|live\s*(radio|stream)|radio\s*24|always live)\b/i.test(rawTitle)) return null;
  if (entry.live_status && entry.live_status !== 'not_live') return null;

  const duration = parseDuration(entry.duration);
  if (!duration || duration < 45 || duration > 20 * 60) return null;

  let title = cleanTitle(rawTitle);
  let artist = cleanArtist(rawChannel);
  if (!title) return null;

  // "Artist - Track" is the dominant YouTube music convention. Split it even
  // when the uploader is a label, as long as the left side is not a mix label.
  const dash = title.split(/\s+[-–—]\s+/);
  if (dash.length === 2) {
    const left = dash[0].trim();
    const right = dash[1].trim();
    if (
      left &&
      right &&
      left.length < 58 &&
      !BAD_TITLE_PREFIX.test(left) &&
      !NON_MUSIC_TITLE.test(left) &&
      !NON_MUSIC_TITLE_RU.test(left)
    ) {
      artist = left;
      title = right;
    }
  }

  const mix = MIX_SIGNAL.test(rawTitle);
  const channelVerified = entry.channel_is_verified === true;
  const topicChannel = /-\s*topic$/i.test(rawChannel) || /^topic$/i.test(rawChannel);
  const vevoChannel = /vevo$/i.test(rawChannel);
  const trustedChannel = channelVerified || topicChannel || vevoChannel;
  // Music discovery should only expose artist-owned, Topic, VEVO or verified
  // channels. Verification alone is not enough (film studios are verified too),
  // so every candidate also has to survive the title/duration checks below.
  if (!trustedChannel) return null;
  const hasMusicTitle = MUSIC_SIGNAL.test(rawTitle);
  const artistStyleTitle = /\s+[-–—]\s+/.test(rawTitle);
  const queryKey = canonical(query);
  const channelKey = canonical(rawChannel);
  const channelMatchesQuery =
    Boolean(queryKey) &&
    (channelKey === queryKey || channelKey.includes(queryKey) || queryKey.includes(channelKey));
  if (!hasMusicTitle && !mix && !artistStyleTitle && !(trustedChannel && channelMatchesQuery)) return null;

  let score = 60;
  if (topicChannel) score += 46;
  else if (vevoChannel) score += 38;
  else if (channelVerified) score += 15;
  if (/official\s*audio/i.test(rawTitle)) score += 24;
  else if (/lyrics?/i.test(rawTitle)) score += 13;
  else if (/visualizer/i.test(rawTitle)) score += 8;
  else if (/official\s*(music\s*)?video/i.test(rawTitle)) score += 5;
  if (mix) score -= 4;
  if (duration >= 90 && duration <= 720) score += 6;
  if (/official/i.test(rawChannel)) score += 4;
  const artistKey = canonical(artist);
  const titleKey = canonical(title);
  if (queryKey) {
    if (artistKey && (artistKey === queryKey || artistKey.includes(queryKey) || queryKey.includes(artistKey))) {
      score += 64;
    } else if (titleKey.includes(queryKey)) {
      score += 8;
    }
  }
  if (channelMatchesQuery) score += 12;
  const views = Number(entry.view_count);
  if (Number.isFinite(views) && views > 0) score += Math.min(16, Math.log10(views + 1) * 2.2);

  const key = `${canonical(title)}::${canonical(artist)}`;
  if (!canonical(title)) return null;

  return {
    key,
    score,
    track: {
      id: entry.id,
      title,
      artist: artist || 'YouTube',
      duration,
      thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
    },
  };
}

const SEARCH_INTENT =
  /\b(official|audio|lyrics?|topic|music|song|track|album|single|remix|mix|beats?|instrumental|live|concert|band|artist|video)\b/i;

/*
 * Genre words are dominated by 1–8 hour radio mixes, which are intentionally
 * filtered out. Seed a few artist-owned catalogues so a genre search still
 * lands on actual tracks instead of an empty page.
 */
const GENRE_SEEDS: Record<string, string[]> = {
  lofi: ['Nujabes official audio', 'idealism official audio'],
  'lo fi': ['Nujabes official audio', 'idealism official audio'],
  'лоу фай': ['Nujabes official audio', 'idealism official audio'],
  phonk: ['Kordhell official audio', 'DVRST official audio'],
  synthwave: ['The Midnight official audio', 'Gunship official audio'],
  'synth wave': ['The Midnight official audio', 'Gunship official audio'],
  chillhop: ['Nujabes official audio', 'Jinsang official audio'],
};

/**
 * A bare query like "Кино" is ambiguous: YouTube serves films, trailers and
 * random uploads before the band. A second, intent-explicit search recovers the
 * artist catalogue and is merged with the original result set.
 */
function queryVariants(query: string): string[] {
  const base = query.trim();
  if (!base || SEARCH_INTENT.test(base)) return [base];
  const genre = GENRE_SEEDS[canonical(base)];
  if (genre) return [...new Set([base, ...genre])];
  const words = canonical(base).split(' ').filter(Boolean);
  if (words.length <= 1 || /[а-яё]/i.test(base)) return [base, `${base} official audio`];
  return [base];
}

interface SearchCacheEntry {
  at: number;
  tracks: Track[];
}

export class YtDlp {
  private bin: string | null = null;
  private state: YtDlpStatus['state'] = 'missing';
  private version: string | null = null;
  private progress = 0;
  private error: string | null = null;
  private preparing: Promise<void> | null = null;
  private searchCache = new Map<string, SearchCacheEntry>();
  private streams = new Map<string, { url: string; expiresAt: number }>();
  private downloading = new Map<string, Promise<{ filePath: string; size: number }>>();
  private readonly userDataDir: string;
  private readonly resourcesDir: string;

  constructor(userDataDir: string, resourcesDir: string) {
    this.userDataDir = userDataDir;
    this.resourcesDir = resourcesDir;
  }

  status(): YtDlpStatus {
    return {
      state: this.state,
      version: this.version,
      progress: this.progress,
      error: this.error ?? undefined,
      path: this.bin,
    };
  }

  async init(): Promise<void> {
    const found = await this.findBinary();
    if (found) {
      this.bin = found;
      this.state = 'ready';
      this.version = await this.readVersion(found);
      return;
    }
    this.state = 'missing';
    // Download in the background so the app window can open instantly.
    void this.ensure().catch(() => undefined);
  }

  private async readVersion(bin: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(bin, ['--version'], { timeout: 15_000 });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  private async isExecutable(file: string): Promise<boolean> {
    try {
      const stat = await fsp.stat(file);
      if (!stat.isFile()) return false;
      await fsp.access(file, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async findBinary(): Promise<string | null> {
    const home = os.homedir();
    const candidates = [
      process.env.PLATINUM_YTDLP,
      path.join(this.userDataDir, 'bin', 'yt-dlp'),
      path.join(this.resourcesDir, 'resources', 'bin', 'yt-dlp'),
      path.join(this.resourcesDir, 'bin', 'yt-dlp'),
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      path.join(home, '.local', 'bin', 'yt-dlp'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
      if (await this.isExecutable(candidate)) {
        const version = await this.readVersion(candidate);
        if (version) return candidate;
      }
    }
    return null;
  }

  async ensure(): Promise<void> {
    if (this.state === 'ready' && this.bin) return;
    if (this.preparing) return this.preparing;
    this.preparing = this.downloadBinary().finally(() => {
      this.preparing = null;
    });
    return this.preparing;
  }

  async update(): Promise<void> {
    if (this.preparing) await this.preparing;
    this.state = 'downloading';
    this.progress = 0;
    this.error = null;
    this.preparing = this.downloadBinary().finally(() => {
      this.preparing = null;
    });
    return this.preparing;
  }

  private async downloadBinary(): Promise<void> {
    this.state = 'downloading';
    this.progress = 0;
    this.error = null;
    const dir = path.join(this.userDataDir, 'bin');
    const target = path.join(dir, 'yt-dlp');
    const tmp = `${target}.download`;
    const asset =
      process.arch === 'arm64'
        ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64'
        : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

    try {
      await fsp.mkdir(dir, { recursive: true });
      const res = await fetch(asset, {
        redirect: 'follow',
        headers: { 'user-agent': 'Platinum/0.1 (+https://platinum.app)' },
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} при загрузке yt-dlp`);
      const total = Number(res.headers.get('content-length') || 0);
      const handle = await fsp.open(tmp, 'w');
      let received = 0;
      const body = res.body as unknown as ReadableStream<Uint8Array>;
      const reader = body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          await handle.write(value);
          received += value.byteLength;
          this.progress = total ? Math.min(99, Math.round((received / total) * 100)) : 0;
        }
      } finally {
        await handle.close();
      }
      await fsp.rename(tmp, target);
      await fsp.chmod(target, 0o755);
      const version = await this.readVersion(target);
      if (!version) throw new Error('yt-dlp скачан, но не запускается');
      this.bin = target;
      this.version = version;
      this.progress = 100;
      this.state = 'ready';
    } catch (err) {
      this.state = 'error';
      this.error = err instanceof Error ? err.message : 'Не удалось скачать yt-dlp';
      this.progress = 0;
      await fsp.rm(tmp, { force: true }).catch(() => undefined);
      throw err;
    }
  }

  private async readyBin(): Promise<string> {
    if (this.state === 'ready' && this.bin) return this.bin;
    await this.ensure();
    if (!this.bin) throw new Error(this.error || 'yt-dlp недоступен');
    return this.bin;
  }

  async search(query: string, limit = 24): Promise<Track[]> {
    const q = query.trim();
    if (!q) return [];
    const wanted = Math.min(Math.max(Math.round(limit), 1), 50);
    const cacheKey = `${wanted}:${q.toLowerCase()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 1000 * 60 * 12) return cached.tracks;

    const bin = await this.readyBin();
    const best = new Map<string, RankedTrack>();
    const candidates = Math.min(50, Math.max(30, wanted * 2));
    const variants = queryVariants(q);

    const run = async (searchQuery: string) => {
      const args = [
        '--ignore-config',
        '--no-warnings',
        '--flat-playlist',
        '--dump-single-json',
        '--no-playlist',
        '--socket-timeout',
        '15',
        `ytsearch${candidates}:${searchQuery}`,
      ];
      const { stdout } = await execFileAsync(bin, args, {
        timeout: 60_000,
        maxBuffer: MAX_BUFFER,
        env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
      });
      const data = JSON.parse(stdout);
      return (Array.isArray(data?.entries) ? data.entries : []) as any[];
    };

    const collect = (entries: any[]) => {
      for (const entry of entries) {
        const item = rankEntry(entry, q);
        if (!item) continue;
        const previous = best.get(item.key);
        if (!previous || item.score > previous.score) best.set(item.key, item);
      }
    };

    const settled = await Promise.allSettled(variants.map((variant) => run(variant)));
    for (const result of settled) {
      if (result.status === 'fulfilled') collect(result.value);
    }
    if (settled.every((result) => result.status === 'rejected')) {
      const reason = settled.find((result) => result.status === 'rejected') as PromiseRejectedResult;
      throw reason.reason instanceof Error ? reason.reason : new Error('YouTube недоступен');
    }

    // Some perfectly valid artists only match when the search engine is told
    // that we are looking for music. Do this lazily so ordinary searches keep
    // their single request.
    if (best.size < 8 && variants.length === 1) {
      try {
        collect(await run(`${q} official audio`));
      } catch {
        /* the original result set is still usable */
      }
    }

    // When a search clearly identifies a name ("Свидание", "Nirvana"), YouTube
    // still pads results with verified but unrelated tracks. If enough real
    // matches exist, drop the padding instead of showing filler.
    const queryKey = canonical(q);
    if (queryKey) {
      const candidates = [...best.values()];
      const matches = candidates.filter((item) => {
        const artistKey = canonical(item.track.artist);
        const titleKey = canonical(item.track.title);
        const albumKey = canonical(item.track.album || '');
        return (
          artistKey.includes(queryKey) ||
          titleKey.includes(queryKey) ||
          albumKey.includes(queryKey) ||
          queryKey.includes(artistKey)
        );
      });
      if (matches.length >= 2 && matches.length < candidates.length) {
        best.clear();
        for (const item of matches) best.set(item.key, item);
      }
    }

    const ranked = [...best.values()].sort((a, b) => b.score - a.score);
    const tracks = ranked.slice(0, wanted).map((item) => item.track);

    this.searchCache.set(cacheKey, { at: Date.now(), tracks });
    if (this.searchCache.size > 80) {
      const first = this.searchCache.keys().next().value;
      if (first) this.searchCache.delete(first);
    }
    return tracks;
  }

  async resolveStream(videoId: string): Promise<string> {
    const cached = this.streams.get(videoId);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
    const url = await this.extractAudioUrl(videoId);
    let expiresAt = Date.now() + 1000 * 60 * 60 * 5;
    try {
      const expire = Number(new URL(url).searchParams.get('expire'));
      if (Number.isFinite(expire) && expire > 0) expiresAt = expire * 1000;
    } catch {
      /* noop */
    }
    this.streams.set(videoId, { url, expiresAt });
    return url;
  }

  private async extractAudioUrl(videoId: string): Promise<string> {
    const bin = await this.readyBin();
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) throw new Error('Некорректный идентификатор трека');
    const args = [
      '--ignore-config',
      '--no-warnings',
      '--no-playlist',
      '--socket-timeout',
      '15',
      '-f',
      'bestaudio[acodec=mp4a]/bestaudio',
      '-g',
      `https://www.youtube.com/watch?v=${videoId}`,
    ];
    const { stdout } = await execFileAsync(bin, args, {
      timeout: 45_000,
      maxBuffer: MAX_BUFFER,
      env: { ...process.env, LC_ALL: 'en_US.UTF-8' },
    });
    const url = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.startsWith('http://') || line.startsWith('https://'));
    if (!url) throw new Error('yt-dlp не вернул аудиопоток');
    return url;
  }

  download(track: Track, dir: string, onProgress: (percent: number) => void): Promise<{ filePath: string; size: number }> {
    const existing = this.downloading.get(track.id);
    if (existing) return existing;
    const promise = this.runDownload(track, dir, onProgress).finally(() => {
      this.downloading.delete(track.id);
    });
    this.downloading.set(track.id, promise);
    return promise;
  }

  private async runDownload(
    track: Track,
    dir: string,
    onProgress: (percent: number) => void,
  ): Promise<{ filePath: string; size: number }> {
    const bin = await this.readyBin();
    await fsp.mkdir(dir, { recursive: true });
    const prefix = path.join(dir, `${track.id}.`);
    const existingFile = await this.findFileWithPrefix(prefix);
    if (existingFile) {
      const stat = await fsp.stat(existingFile);
      onProgress(100);
      return { filePath: existingFile, size: stat.size };
    }

    const child: ChildProcess = spawn(
      bin,
      [
        '--ignore-config',
        '--no-warnings',
        '--no-playlist',
        '--newline',
        '--socket-timeout',
        '20',
        '-f',
        'bestaudio[acodec=mp4a]/bestaudio',
        '-o',
        `${prefix}%(ext)s`,
        `https://www.youtube.com/watch?v=${track.id}`,
      ],
      { env: { ...process.env, LC_ALL: 'en_US.UTF-8' } },
    );

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('Загрузка заняла слишком много времени'));
      }, 1000 * 60 * 8);

      child.stdout?.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        const matches = [...text.matchAll(/\[download\]\s+(\d+(?:\.\d+)?)%/g)];
        if (matches.length) {
          const percent = Math.max(0, Math.min(100, Math.round(Number(matches[matches.length - 1][1]))));
          onProgress(percent);
        }
      });
      child.stderr?.on('data', () => undefined);
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`yt-dlp завершился с кодом ${code}`));
      });
    });

    const file = await this.findFileWithPrefix(prefix);
    if (!file) throw new Error('Файл не найден после загрузки');
    const stat = await fsp.stat(file);
    onProgress(100);
    return { filePath: file, size: stat.size };
  }

  private async findFileWithPrefix(prefix: string): Promise<string | null> {
    try {
      const dir = path.dirname(prefix);
      const base = path.basename(prefix);
      const files = await fsp.readdir(dir);
      const match = files.find((f) => f.startsWith(base) && !f.endsWith('.part'));
      return match ? path.join(dir, match) : null;
    } catch {
      return null;
    }
  }

  invalidateStream(videoId: string) {
    this.streams.delete(videoId);
  }

  clearSearchCache() {
    this.searchCache.clear();
  }
}
