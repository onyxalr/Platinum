export function fmtTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function fmtMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} ${pluralRu(minutes, 'минуту', 'минуты', 'минут')} назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${pluralRu(hours, 'час', 'часа', 'часов')} назад`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${pluralRu(days, 'день', 'дня', 'дней')} назад`;
  return new Date(timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(bytes / 1024)} КБ`;
  return `${mb.toFixed(1)} МБ`;
}

const ART_PAIRS: Array<[string, string]> = [
  ['#4B3B78', '#1A1426'],
  ['#2C5A4A', '#111A16'],
  ['#6B3A44', '#1F1215'],
  ['#33496B', '#121722'],
  ['#6B5A32', '#1D1911'],
  ['#4A3A6B', '#15111F'],
  ['#3E5A6B', '#12191D'],
  ['#5E3B52', '#1B1218'],
];

export function artGradient(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return ART_PAIRS[hash % ART_PAIRS.length];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

const THUMB_PATTERN = /\/(maxresdefault|hqdefault|mqdefault|sddefault|default)\.(jpg|webp)/;

/**
 * YouTube stores every thumbnail size under the same video id. Requesting the
 * right size dramatically cuts decode/paint cost for long grids: cards get the
 * 480px variant, large artwork gets 1280px only when it can actually use it.
 */
export function thumbFallback(url: string, step = 0, size = 360): string {
  if (!url) return '';
  const ladder = size >= 680 ? ['maxresdefault', 'hqdefault', 'mqdefault'] : ['hqdefault', 'mqdefault', 'default'];
  const name = ladder[Math.min(step, ladder.length - 1)];
  const sized = url.replace(THUMB_PATTERN, `/${name}.jpg`);
  return step >= ladder.length ? '' : sized;
}
