import type { ImportEntry } from '../shared/types';

const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const MAX_ENTRIES = 60;

export interface ParsedImport {
  source: string;
  title: string;
  entries: ImportEntry[];
}

function clean(value: unknown): string {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTrackNumber(value: string): string {
  return value
    .replace(/^\s*(?:#\d+|\d{1,3}[.)]|\d{1,3}\s*[-–—])\s+/, '')
    .replace(/^\s*[-•*]\s+/, '')
    .replace(/^["'«“](.*)["'»”]$/, '$1')
    .trim();
}

function parseDuration(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    // Spotify exports milliseconds; text exports usually use seconds.
    return Math.round(value > 3600 ? value / 1000 : value);
  }
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.round(n > 3600 ? n / 1000 : n);
  }
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text);
  if (!match) return undefined;
  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = match[3] ? Number(match[3]) : null;
  return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
}

function pushEntry(entries: ImportEntry[], title: string, artist: string, duration?: unknown) {
  const t = stripTrackNumber(clean(title));
  const a = clean(artist);
  if (!t) return;
  if (/^(track|title|song|name|artist|artists|исполнитель|название|трек)$/i.test(t)) return;
  if (/^(https?:\/\/|www\.)/i.test(t)) return;
  if (entries.some((entry) => entry.title.toLowerCase() === t.toLowerCase() && entry.artist.toLowerCase() === a.toLowerCase())) return;
  if (entries.length >= MAX_ENTRIES * 2) return;
  entries.push({ title: t.slice(0, 300), artist: a.slice(0, 200), ...(parseDuration(duration) ? { duration: parseDuration(duration) } : {}) });
}

function splitArtistTitle(value: string): { artist: string; title: string } | null {
  const text = stripTrackNumber(value);
  if (!text) return null;
  const parts = text.split(/\s+[-–—]\s+/);
  if (parts.length < 2) return null;
  // "Artist - Title" is the dominant export convention. Keep the split at the
  // first dash so song titles containing dashes survive intact.
  const artist = parts.shift() || '';
  const title = parts.join(' - ');
  if (!artist.trim() || !title.trim()) return null;
  return { artist: artist.trim(), title: title.trim() };
}

function parseM3U(text: string): ImportEntry[] {
  const entries: ImportEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^#EXTINF:([^,]*),(.*)$/i.exec(line.trim());
    if (!match) continue;
    const duration = match[1].trim();
    const rest = match[2].trim();
    const split = splitArtistTitle(rest);
    if (split) pushEntry(entries, split.title, split.artist, duration);
    else pushEntry(entries, rest, '', duration);
  }
  return entries;
}

function parseDelimited(text: string): ImportEntry[] | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return null;
  const first = lines[0];
  const delimiter = first.includes('\t') ? '\t' : first.includes(';') ? ';' : first.includes(',') ? ',' : null;
  if (!delimiter) return null;

  const rows: string[][] = [];
  for (const line of lines) {
    if (!line.includes(delimiter)) continue;
    const cells: string[] = [];
    let value = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          value += '"';
          i++;
        } else quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        cells.push(value);
        value = '';
      } else value += char;
    }
    cells.push(value);
    if (cells.some((cell) => cell.trim())) rows.push(cells.map((cell) => cell.trim()));
  }
  if (rows.length < 2) return null;

  const header = rows[0].map((cell) => cell.toLowerCase().replace(/["']/g, '').trim());
  const titleKeys = ['track name', 'title', 'name', 'song', 'track', 'название', 'трек', 'песня'];
  const artistKeys = [
    'artist name(s)',
    'artist name',
    'artist(s)',
    'artists',
    'artist',
    'album artist',
    'album artist(s)',
    'исполнитель',
    'артист',
    'группа',
  ];
  const durationKeys = ['duration', 'length', 'time', 'длительность', 'время'];
  const find = (keys: string[]) => header.findIndex((cell) => keys.includes(cell));
  let titleIndex = find(titleKeys);
  let artistIndex = find(artistKeys);
  const durationIndex = find(durationKeys);

  let start = 1;
  if (titleIndex < 0 || artistIndex < 0) {
    // Headerless two-column export: most services use Title, Artist.
    if (rows[0].length < 2 || !rows[0].every((cell) => cell.length < 120)) return null;
    titleIndex = 0;
    artistIndex = 1;
    start = 0;
  }

  const entries: ImportEntry[] = [];
  for (const row of rows.slice(start)) {
    pushEntry(entries, row[titleIndex] || '', row[artistIndex] || '', durationIndex >= 0 ? row[durationIndex] : undefined);
  }
  return entries.length ? entries : null;
}

function artistFromJson(value: any): string {
  const raw = value?.artist ?? value?.artists ?? value?.subtitle ?? value?.artistName ?? value?.album?.artists;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item : item?.name))
      .filter(Boolean)
      .join(', ');
  }
  if (raw && typeof raw === 'object') return clean(raw.name);
  return clean(raw);
}

function titleFromJson(value: any): string {
  return clean(value?.title ?? value?.name ?? value?.track?.title ?? value?.track?.name ?? value?.song ?? '');
}

function parseJson(text: string): ImportEntry[] {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const entries: ImportEntry[] = [];
  const visit = (value: any, depth: number) => {
    if (!value || depth > 7 || entries.length >= MAX_ENTRIES * 2) return;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (!item || typeof item !== 'object') continue;
        const title = titleFromJson(item);
        const artist = artistFromJson(item);
        if (title && artist) {
          const duration = item?.duration ?? item?.duration_ms ?? item?.track?.duration_ms;
          pushEntry(entries, title, artist, duration);
        } else {
          visit(item, depth + 1);
        }
      }
      return;
    }
    if (typeof value === 'object') {
      const title = titleFromJson(value);
      const artist = artistFromJson(value);
      if (title && artist) {
        pushEntry(entries, title, artist, value?.duration ?? value?.duration_ms);
        return;
      }
      for (const key of ['tracks', 'items', 'entries', 'songs', 'data', 'playlist', 'trackList', 'results']) {
        if (value[key]) visit(value[key], depth + 1);
      }
    }
  };
  visit(data, 0);
  return entries;
}

function parsePlainText(text: string): ImportEntry[] {
  const entries: ImportEntry[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    if (/\t/.test(line) || /\s{3,}/.test(line)) {
      const cells = line.split(/\t|\s{3,}/).map((cell) => cell.trim()).filter(Boolean);
      if (cells.length >= 2) {
        // TSV exports are overwhelmingly "Artist — Title".
        pushEntry(entries, cells.slice(1).join(' '), cells[0]);
        continue;
      }
    }
    const split = splitArtistTitle(line);
    if (split) {
      pushEntry(entries, split.title, split.artist);
      continue;
    }
    // "Title by Artist" is another common human-readable format.
    const by = /^(.*?)\s+[—–-]\s+by\s+(.*)$/i.exec(line);
    if (by) {
      pushEntry(entries, by[1], by[2]);
      continue;
    }
    line = stripTrackNumber(line);
    if (line.length > 1) pushEntry(entries, line, '');
  }
  return entries;
}

function parseAccountText(text: string): ImportEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (/^[\[{]/.test(trimmed)) {
    const json = parseJson(trimmed);
    if (json.length) return json;
  }
  if (/^#EXTM3U/i.test(trimmed) || /^#EXTINF:/im.test(trimmed)) {
    const m3u = parseM3U(trimmed);
    if (m3u.length) return m3u;
  }
  return parseDelimited(trimmed) || parsePlainText(trimmed);
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': UA, accept: 'text/html,application/json,text/plain,*/*' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function spotifyEntityFromHtml(html: string): any | null {
  const match = /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    return data?.props?.pageProps?.state?.data?.entity ?? null;
  } catch {
    return null;
  }
}

function parseSpotifyHtml(html: string): ParsedImport | null {
  const entity = spotifyEntityFromHtml(html);
  if (!entity) {
    // Fall back to JSON-LD if Spotify changes its embed payload.
    const ld = parseJsonLd(html);
    if (ld.length) return { source: 'Spotify', title: 'Импортированный плейлист', entries: ld };
    return null;
  }
  const entries: ImportEntry[] = [];
  const list = Array.isArray(entity.trackList) ? entity.trackList : [];
  for (const item of list) {
    if (!item || item.entityType === 'episode') continue;
    pushEntry(entries, item.title || item.name, item.subtitle || item.artist, item.duration);
  }
  if (!entries.length && entity.type === 'track') {
    pushEntry(entries, entity.title || entity.name, entity.subtitle || entity.artist, entity.duration);
  }
  if (!entries.length) return null;
  return {
    source: 'Spotify',
    title: clean(entity.title || entity.name || 'Импортированный плейлист'),
    entries,
  };
}

function jsonLdObjects(value: any, out: any[]) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) jsonLdObjects(item, out);
    return;
  }
  out.push(value);
  for (const key of ['@graph', 'track', 'tracks', 'itemListElement', 'itemListElement']) {
    if (value[key]) jsonLdObjects(value[key], out);
  }
}

function parseJsonLd(html: string): ImportEntry[] {
  const entries: ImportEntry[] = [];
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    let data: any;
    try {
      data = JSON.parse(script[1]);
    } catch {
      continue;
    }
    const objects: any[] = [];
    jsonLdObjects(data, objects);
    for (const item of objects) {
      const type = String(item?.['@type'] || '');
      if (item?.name && (type.includes('MusicRecording') || type.includes('MusicPlaylist') || item.track)) {
        if (type.includes('MusicPlaylist')) continue;
        const artist = artistFromJson(item.byArtist ? { artists: item.byArtist } : item);
        if (artist) pushEntry(entries, item.name, artist, item.duration);
      }
    }
  }
  return entries;
}

export async function parseImportSource(input: { url?: string; text?: string }): Promise<ParsedImport> {
  const url = String(input.url || '').trim();
  const text = String(input.text || '');
  if (!url && !text.trim()) throw new Error('Вставь ссылку или список треков');

  if (url) {
    const spotify = /(?:open\.spotify\.com|spotify\.com)\/(?:intl-[a-z-]+\/)?(playlist|album|track)\/([A-Za-z0-9]+)/i.exec(url);
    if (spotify) {
      const embedUrl = `https://open.spotify.com/embed/${spotify[1].toLowerCase()}/${spotify[2]}`;
      let html: string;
      try {
        html = await fetchText(embedUrl);
      } catch {
        throw new Error('Не удалось открыть плейлист Spotify. Проверь ссылку или импортируй файл.');
      }
      const parsed = parseSpotifyHtml(html);
      if (!parsed) throw new Error('В Spotify не нашлось треков. Возможно, плейлист пустой или закрытый.');
      return parsed;
    }

    let fetched: string;
    try {
      fetched = await fetchText(url);
    } catch {
      throw new Error('Не удалось прочитать ссылку. Для Apple Music и Яндекс Музыки используй экспорт CSV/JSON.');
    }
    const looksJson = /^\s*[\[{]/.test(fetched);
    if (looksJson) {
      const entries = parseAccountText(fetched);
      if (entries.length) return { source: 'Ссылка', title: 'Импортированный плейлист', entries };
    }
    const htmlEntries = parseJsonLd(fetched);
    if (htmlEntries.length) return { source: 'Ссылка', title: 'Импортированный плейлист', entries: htmlEntries };
    throw new Error('На странице не нашлось треков. Экспортируй плейлист в CSV/JSON и вставь файл сюда.');
  }

  const lower = text.toLowerCase();
  const source = /track name|artist name/.test(lower)
    ? 'CSV'
    : /"tracks"|"items"|"songs"/.test(lower)
      ? 'JSON'
      : /#extm3u|#extinf/.test(lower)
        ? 'M3U'
        : 'Список';
  const entries = parseAccountText(text).slice(0, MAX_ENTRIES);
  if (!entries.length) throw new Error('Не удалось найти треки в этом списке');
  return { source, title: 'Импортированный плейлист', entries };
}
