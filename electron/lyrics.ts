import type { LyricLine, Lyrics } from '../shared/types';

const cache = new Map<string, { at: number; value: Lyrics }>();
const TTL = 1000 * 60 * 60 * 12;
const UA = 'Platinum/0.1 (music player; https://platinum.app)';

export function parseLrc(input: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let offset = 0;
  for (const raw of input.split(/\r?\n/)) {
    const offsetMatch = raw.match(/^\[offset:([+-]?\d+)\]/i);
    if (offsetMatch) offset = Number(offsetMatch[1]) / 1000;
    const times = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!times.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (!text) continue;
    if (/^(ar|ti|al|by|re|ve|length):/i.test(text)) continue;
    for (const match of times) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2].replace(':', '.'));
      const time = minutes * 60 + seconds + offset;
      if (Number.isFinite(time)) lines.push({ time: Math.max(0, time), text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function parsePlainLyrics(input: string): string {
  return input.replace(/\r\n/g, '\n').trim();
}

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function normalize(value: string): string {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function cleanTitle(value: string): string {
  return String(value)
    .replace(/\s*[|｜]\s*.*$/g, '')
    .replace(/\s*\((?:official|lyrics?|audio|video|visualizer|live|performance|mv|m\/v)[^)]*\)/gi, '')
    .replace(/\s*\[(?:official|lyrics?|audio|video|visualizer|live|performance|mv|m\/v)[^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtist(value: string): string {
  return String(value)
    .replace(/\s*[-–—]\s*topic$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Query {
  title: string;
  artist: string;
}

function buildQueries(title: string, artist: string): Query[] {
  const queries: Query[] = [];
  const seen = new Set<string>();

  const add = (track: string, performer: string) => {
    const cleanTrack = cleanTitle(track);
    const cleanPerformer = cleanArtist(performer);
    if (!cleanTrack) return;
    const key = `${normalize(cleanTrack)}|${normalize(cleanPerformer)}`;
    if (seen.has(key)) return;
    seen.add(key);
    queries.push({ title: cleanTrack, artist: cleanPerformer });
  };

  // YouTube uploads frequently wrap the song as "Artist - Track" or
  // "Artist "Track"". Those derived fields are more useful to LRCLIB than the
  // uploader's channel name, so try them first. A title-only request covers
  // cases where the channel uses a different canonical artist name.
  const parsed: Query[] = [];
  const split = /^(.+?)\s*[-–—]\s*(.+)$/.exec(title);
  if (split) parsed.push({ title: split[2], artist: split[1] });
  const quoted = /^(.+?)\s*["“”«»](.+?)["“”«»]\s*$/.exec(title);
  if (quoted) parsed.push({ title: quoted[2], artist: quoted[1] });

  for (const query of parsed) {
    add(query.title, '');
    add(query.title, query.artist);
    add(query.title, artist);
  }

  // Medleys and videos often use "Song / Song". The first song is the best
  // match for synchronized lyrics.
  for (const query of [...queries]) {
    const slash = query.title.split(/\s+\/\s+/)[0];
    if (slash && slash !== query.title) {
      add(slash, '');
      add(slash, query.artist);
    }
  }

  add(title, artist);
  add(title, '');

  // Drop a repeated artist prefix from uploads such as "Artist — Artist - Track".
  for (const query of [...queries]) {
    const normalizedArtist = normalize(query.artist);
    const normalizedTitle = normalize(query.title);
    if (normalizedArtist && normalizedTitle.startsWith(`${normalizedArtist} `)) {
      add(query.title.slice(query.artist.length).replace(/^\s*[-–—:]\s*/, ''), query.artist);
    }
  }

  return queries.slice(0, 6);
}

function score(entry: any, query: Query, duration: number): number {
  let points = entry.syncedLyrics ? 100 : entry.plainLyrics ? 10 : -100;
  if (duration > 0 && entry.duration) {
    const diff = Math.abs(Number(entry.duration) - duration);
    points += Math.max(0, 36 - diff * 2);
  }
  const entryArtist = normalize(String(entry.artistName || ''));
  const entryTitle = normalize(String(entry.trackName || ''));
  const wantedArtist = normalize(query.artist);
  const wantedTitle = normalize(query.title);
  if (wantedArtist && entryArtist) {
    if (entryArtist === wantedArtist) points += 28;
    else if (entryArtist.includes(wantedArtist) || wantedArtist.includes(entryArtist)) points += 18;
  }
  if (wantedTitle && entryTitle) {
    if (entryTitle === wantedTitle) points += 30;
    else if (entryTitle.includes(wantedTitle) || wantedTitle.includes(entryTitle)) points += 18;
  }
  if (entry.instrumental) points -= 5;
  return points;
}

async function search(query: Query, duration: number): Promise<any | null> {
  const params = new URLSearchParams();
  if (query.title) params.set('track_name', query.title);
  if (query.artist) params.set('artist_name', query.artist);
  params.set('q', [query.title, query.artist].filter(Boolean).join(' '));
  const results = await getJson(`https://lrclib.net/api/search?${params.toString()}`);
  if (!Array.isArray(results) || !results.length) return null;
  return results
    .map((item) => ({ item, points: score(item, query, duration) }))
    .sort((a, b) => b.points - a.points)[0].item;
}

export async function lookupLyrics(title: string, artist: string, duration: number): Promise<Lyrics> {
  const key = `${title.toLowerCase()}|${artist.toLowerCase()}|${Math.round(duration)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL) return cached.value;

  const empty: Lyrics = { synced: null, plain: null, source: 'LRCLIB' };
  let value = empty;

  const direct = await getJson(
    `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(
      artist,
    )}&duration=${Math.max(0, Math.round(duration))}`,
  );

  let entry: any = direct && direct.statusCode !== 404 ? direct : null;
  const queries = buildQueries(title, artist);

  for (const query of queries) {
    if (entry) break;
    entry = await search(query, duration);
  }

  if (!entry) {
    const fallback = await getJson(
      `https://lrclib.net/api/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
    );
    if (Array.isArray(fallback) && fallback.length) {
      entry = fallback
        .map((item) => ({ item, points: score(item, { title, artist }, duration) }))
        .sort((a, b) => b.points - a.points)[0].item;
    }
  }

  if (entry) {
    const synced = entry.syncedLyrics ? parseLrc(String(entry.syncedLyrics)) : [];
    const plain = entry.plainLyrics ? parsePlainLyrics(String(entry.plainLyrics)) : null;
    value = {
      synced: synced.length ? synced : null,
      plain,
      source: 'LRCLIB',
    };
  }

  // A transient LRCLIB timeout must not turn into a lyric-less track for the
  // rest of the day. Only successful lookups are cached.
  if (value.synced?.length || value.plain) {
    cache.set(key, { at: Date.now(), value });
    if (cache.size > 200) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
  }
  return value;
}
