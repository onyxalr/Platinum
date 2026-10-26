import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Platinum's appearance engine.
 *
 * Every visual decision lives here: the palette, typography, shell geometry,
 * material treatment and motion language. The store is intentionally
 * device-local (not account-local) so the app feels like *your* player even
 * before signing in. CSS variables are derived from this state at runtime.
 */

export type PresetId = 'platinum' | 'platinumLight' | 'platinumNoir' | 'noir' | 'porcelain' | 'aurora' | 'custom';
export type FontUiId = 'inter' | 'manrope' | 'golos' | 'onest' | 'rubik' | 'montserrat';
export type FontDisplayId = 'instrument' | 'cormorant' | 'lora' | 'unbounded' | 'onest' | 'montserrat';
export type NavStyle = 'rail' | 'panel';
export type NavSide = 'left' | 'right';
export type PlayerStyle = 'floating' | 'bar';
export type PlayerLayout = 'classic' | 'compact';
export type PlayerProgressStyle = 'line' | 'pill' | 'none';
export type PlayerTimeMode = 'total' | 'remaining';
export type PlayerMaterial = 'glass' | 'solid' | 'accent';
export type PlayerCoverShape = 'global' | 'soft' | 'circle' | 'sharp';
export type NowPlayingLayout = 'split' | 'focus';
export type ArtworkShape = 'soft' | 'circle' | 'sharp';
export type MotionEase = 'smooth' | 'spring' | 'soft';
export type DesignStyle = 'platinum' | 'material';
export type EffectsStyle = 'clean' | 'cinematic' | 'neon' | 'aurora';

export interface AppearanceColors {
  bg: string;
  panel: string;
  text: string;
  dim: string;
  accent: string;
}

export interface Appearance {
  preset: PresetId;
  design: DesignStyle;
  colors: AppearanceColors;
  fontUi: FontUiId;
  fontDisplay: FontDisplayId;
  typeScale: number;
  uiScale: number;
  navStyle: NavStyle;
  navSide: NavSide;
  sidebarWidth: number;
  topbarHeight: number;
  playerStyle: PlayerStyle;
  playerHeight: number;
  playerLayout: PlayerLayout;
  playerProgress: PlayerProgressStyle;
  playerTime: PlayerTimeMode;
  playerMaterial: PlayerMaterial;
  playerCoverShape: PlayerCoverShape;
  playerRadius: number;
  playerArtSize: number;
  playerControlSize: number;
  playerShowArtwork: boolean;
  playerShowLike: boolean;
  playerShowShuffle: boolean;
  playerShowRepeat: boolean;
  playerShowVolume: boolean;
  playerShowLyrics: boolean;
  playerShowQueue: boolean;
  playerShowExpand: boolean;
  playerShowTime: boolean;
  playerAccentPlay: boolean;
  nowPlayingLayout: NowPlayingLayout;
  nowPlayingArtScale: number;
  nowPlayingBackdrop: boolean;
  contentPadding: number;
  contentWidth: number;
  radius: number;
  density: number;
  artworkShape: ArtworkShape;
  glass: number;
  blur: number;
  grain: number;
  glow: number;
  backdrop: number;
  coverGlow: boolean;
  effectsStyle: EffectsStyle;
  motion: number;
  motionEase: MotionEase;
  animatedOrbs: boolean;
  animations: boolean;
  performance: boolean;
}

export type AppearancePatch = Partial<Omit<Appearance, 'colors' | 'preset'>> & {
  colors?: Partial<AppearanceColors>;
};

export interface FontOption<T extends string> {
  id: T;
  label: string;
  family: string;
  note: string;
  sample: string;
  badge?: string;
}

export const UI_FONTS: FontOption<FontUiId>[] = [
  {
    id: 'inter',
    label: 'Inter',
    family: "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif",
    note: 'Нейтральный и точный',
    sample: 'Тишина и свет',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    family: "'Manrope Variable', 'Inter Variable', system-ui, sans-serif",
    note: 'Мягкая геометрия',
    sample: 'Тишина и свет',
  },
  {
    id: 'golos',
    label: 'Golos Text',
    family: "'Golos Text Variable', 'Inter Variable', system-ui, sans-serif",
    note: 'Русский характер',
    sample: 'Тишина и свет',
  },
  {
    id: 'onest',
    label: 'Onest',
    family: "'Onest Variable', 'Inter Variable', system-ui, sans-serif",
    note: 'Современный ритм',
    sample: 'Тишина и свет',
  },
  {
    id: 'rubik',
    label: 'Rubik',
    family: "'Rubik Variable', 'Inter Variable', system-ui, sans-serif",
    note: 'Тёплая геометрия',
    sample: 'Тишина и свет',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: "'Montserrat Variable', 'Inter Variable', system-ui, sans-serif",
    note: 'Классический модерн',
    sample: 'Тишина и свет',
  },
];

export const DISPLAY_FONTS: FontOption<FontDisplayId>[] = [
  {
    id: 'unbounded',
    label: 'Unbounded Sans',
    family: "'Unbounded Variable', 'Inter Variable', sans-serif",
    note: 'Фирменный гротеск · кириллица',
    sample: 'Platinum',
    badge: 'ОСНОВНОЙ',
  },
  {
    id: 'instrument',
    label: 'Instrument Serif',
    family: "'Instrument Serif', Georgia, 'Times New Roman', serif",
    note: 'Редакционный шик',
    sample: 'Platinum',
  },
  {
    id: 'cormorant',
    label: 'Cormorant',
    family: "'Cormorant Garamond Variable', 'Times New Roman', Georgia, serif",
    note: 'Тонкая классика',
    sample: 'Platinum',
  },
  {
    id: 'lora',
    label: 'Lora',
    family: "'Lora Variable', Georgia, serif",
    note: 'Тёплая литература',
    sample: 'Platinum',
  },
  {
    id: 'montserrat',
    label: 'Montserrat',
    family: "'Montserrat Variable', 'Inter Variable', sans-serif",
    note: 'Скульптурный гротеск',
    sample: 'Platinum',
  },
  {
    id: 'onest',
    label: 'Onest Sans',
    family: "'Onest Variable', 'Inter Variable', sans-serif",
    note: 'Чистый модерн',
    sample: 'Platinum',
  },
];

export const DEFAULT_APPEARANCE: Appearance = {
  preset: 'platinum',
  design: 'platinum',
  colors: {
    bg: '#070708',
    panel: '#101013',
    text: '#F4F2EE',
    dim: '#A3A1A7',
    accent: '#C9B8FF',
  },
  fontUi: 'inter',
  fontDisplay: 'unbounded',
  typeScale: 1,
  uiScale: 1,
  navStyle: 'rail',
  navSide: 'left',
  sidebarWidth: 68,
  topbarHeight: 64,
  playerStyle: 'floating',
  playerHeight: 86,
  playerLayout: 'classic',
  playerProgress: 'line',
  playerTime: 'total',
  playerMaterial: 'glass',
  playerCoverShape: 'global',
  playerRadius: 22,
  playerArtSize: 54,
  playerControlSize: 42,
  playerShowArtwork: true,
  playerShowLike: true,
  playerShowShuffle: true,
  playerShowRepeat: true,
  playerShowVolume: true,
  playerShowLyrics: true,
  playerShowQueue: true,
  playerShowExpand: true,
  playerShowTime: true,
  playerAccentPlay: false,
  nowPlayingLayout: 'split',
  nowPlayingArtScale: 1,
  nowPlayingBackdrop: true,
  contentPadding: 30,
  contentWidth: 1520,
  radius: 18,
  density: 1,
  artworkShape: 'soft',
  glass: 78,
  blur: 26,
  grain: 45,
  glow: 55,
  backdrop: 45,
  coverGlow: true,
  effectsStyle: 'cinematic',
  motion: 1,
  motionEase: 'smooth',
  animatedOrbs: true,
  animations: true,
  performance: false,
};

interface PresetDefinition {
  id: Exclude<PresetId, 'custom'>;
  label: string;
  description: string;
  swatches: string[];
  values: Partial<Appearance>;
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'platinum',
    label: 'Platinum',
    description: 'Обсидиан, платина и лиловый свет',
    swatches: ['#070708', '#101013', '#F4F2EE', '#C9B8FF'],
    values: {},
  },
  {
    id: 'platinumLight',
    label: 'Platinum Light',
    description: 'Светлый фарфор и электрический индиго',
    swatches: ['#E9E7E2', '#FFFFFF', '#18181B', '#5B5BD6'],
    values: {
      colors: { bg: '#E9E7E2', panel: '#FFFFFF', text: '#18181B', dim: '#52525B', accent: '#5B5BD6' },
      fontUi: 'inter',
      fontDisplay: 'unbounded',
      navStyle: 'rail',
      sidebarWidth: 68,
      playerStyle: 'floating',
      playerHeight: 84,
      contentPadding: 28,
      radius: 18,
      density: 1,
      glass: 84,
      blur: 24,
      grain: 22,
      glow: 35,
      backdrop: 52,
      coverGlow: false,
      effectsStyle: 'clean',
    },
  },
  {
    id: 'platinumNoir',
    label: 'Platinum Noir',
    description: 'Чёрное стекло и льдистый свет',
    swatches: ['#000000', '#0A0A0A', '#FAFAFA', '#BFC8FF'],
    values: {
      colors: { bg: '#000000', panel: '#0A0A0A', text: '#FAFAFA', dim: '#A1A1AA', accent: '#BFC8FF' },
      fontUi: 'inter',
      fontDisplay: 'unbounded',
      navStyle: 'rail',
      sidebarWidth: 68,
      playerStyle: 'floating',
      playerHeight: 84,
      contentPadding: 28,
      radius: 18,
      density: 1,
      glass: 76,
      blur: 28,
      grain: 30,
      glow: 44,
      backdrop: 62,
      coverGlow: true,
      effectsStyle: 'neon',
    },
  },
  {
    id: 'noir',
    label: 'Noir',
    description: 'Тихий клуб, латунь и классика',
    swatches: ['#0A0908', '#15120E', '#F0E8D8', '#D7B46A'],
    values: {
      colors: { bg: '#0A0908', panel: '#15120E', text: '#F0E8D8', dim: '#A69B87', accent: '#D7B46A' },
      fontUi: 'manrope',
      fontDisplay: 'cormorant',
      navStyle: 'panel',
      sidebarWidth: 250,
      playerStyle: 'bar',
      playerHeight: 94,
      contentPadding: 34,
      radius: 20,
      density: 1.02,
      glass: 72,
      blur: 22,
      grain: 58,
      glow: 38,
      backdrop: 32,
      coverGlow: true,
      effectsStyle: 'cinematic',
    },
  },
  {
    id: 'porcelain',
    label: 'Porcelain',
    description: 'Тёплый фарфор и фиалка',
    swatches: ['#F2EFE9', '#FFFCF6', '#221F1A', '#6B5BC9'],
    values: {
      colors: { bg: '#F2EFE9', panel: '#FFFCF6', text: '#221F1A', dim: '#6F6A61', accent: '#6B5BC9' },
      fontUi: 'golos',
      fontDisplay: 'lora',
      navStyle: 'panel',
      sidebarWidth: 244,
      playerStyle: 'floating',
      playerHeight: 86,
      contentPadding: 34,
      radius: 22,
      density: 1.04,
      glass: 88,
      blur: 26,
      grain: 34,
      glow: 26,
      backdrop: 40,
      coverGlow: false,
      effectsStyle: 'clean',
    },
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Северное сияние и глубокий космос',
    swatches: ['#070B14', '#0D1524', '#EEF3FF', '#7DD3FC'],
    values: {
      colors: { bg: '#070B14', panel: '#0D1524', text: '#EEF3FF', dim: '#94A3B8', accent: '#7DD3FC' },
      fontUi: 'onest',
      fontDisplay: 'unbounded',
      navStyle: 'rail',
      sidebarWidth: 70,
      playerStyle: 'floating',
      playerHeight: 88,
      contentPadding: 32,
      radius: 18,
      density: 1,
      glass: 72,
      blur: 34,
      grain: 40,
      glow: 78,
      backdrop: 72,
      coverGlow: true,
      effectsStyle: 'aurora',
    },
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function normalizeHex(input: string, fallback: string): string {
  const trimmed = String(input || '').trim();
  const short = /^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(trimmed);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  const full = /^#?([0-9a-f]{6})$/i.exec(trimmed);
  if (full) return `#${full[1]}`.toUpperCase();
  return fallback;
}

function clampAppearance(value: Appearance): Appearance {
  const preset = PRESETS.some((entry) => entry.id === value.preset) || value.preset === 'custom' ? value.preset : 'platinum';
  const fontUi = UI_FONTS.some((font) => font.id === value.fontUi) ? value.fontUi : DEFAULT_APPEARANCE.fontUi;
  const fontDisplay = DISPLAY_FONTS.some((font) => font.id === value.fontDisplay)
    ? value.fontDisplay
    : DEFAULT_APPEARANCE.fontDisplay;
  const oneOf = <T extends string>(options: readonly T[], candidate: T, fallback: T): T =>
    options.includes(candidate) ? candidate : fallback;
  return {
    ...value,
    preset,
    design: value.design === 'material' ? 'material' : 'platinum',
    effectsStyle: oneOf(['clean', 'cinematic', 'neon', 'aurora'] as const, value.effectsStyle, DEFAULT_APPEARANCE.effectsStyle),
    fontUi,
    fontDisplay,
    playerLayout: oneOf(['classic', 'compact'] as const, value.playerLayout, DEFAULT_APPEARANCE.playerLayout),
    playerProgress: oneOf(['line', 'pill', 'none'] as const, value.playerProgress, DEFAULT_APPEARANCE.playerProgress),
    playerTime: oneOf(['total', 'remaining'] as const, value.playerTime, DEFAULT_APPEARANCE.playerTime),
    playerMaterial: oneOf(['glass', 'solid', 'accent'] as const, value.playerMaterial, DEFAULT_APPEARANCE.playerMaterial),
    playerCoverShape: oneOf(['global', 'soft', 'circle', 'sharp'] as const, value.playerCoverShape, DEFAULT_APPEARANCE.playerCoverShape),
    nowPlayingLayout: oneOf(['split', 'focus'] as const, value.nowPlayingLayout, DEFAULT_APPEARANCE.nowPlayingLayout),
    typeScale: clamp(value.typeScale, 0.85, 1.2),
    uiScale: clamp(value.uiScale, 0.88, 1.12),
    sidebarWidth: clamp(value.sidebarWidth, 58, 320),
    topbarHeight: clamp(value.topbarHeight, 52, 86),
    playerHeight: clamp(value.playerHeight, 72, 118),
    playerRadius: clamp(value.playerRadius, 0, 34),
    playerArtSize: clamp(value.playerArtSize, 38, 68),
    playerControlSize: clamp(value.playerControlSize, 34, 52),
    playerShowArtwork: value.playerShowArtwork !== false,
    playerShowLike: value.playerShowLike !== false,
    playerShowShuffle: value.playerShowShuffle !== false,
    playerShowRepeat: value.playerShowRepeat !== false,
    playerShowVolume: value.playerShowVolume !== false,
    playerShowLyrics: value.playerShowLyrics !== false,
    playerShowQueue: value.playerShowQueue !== false,
    playerShowExpand: value.playerShowExpand !== false,
    playerShowTime: value.playerShowTime !== false,
    playerAccentPlay: Boolean(value.playerAccentPlay),
    nowPlayingArtScale: clamp(value.nowPlayingArtScale, 0.82, 1.12),
    nowPlayingBackdrop: value.nowPlayingBackdrop !== false,
    contentPadding: clamp(value.contentPadding, 16, 60),
    contentWidth: clamp(value.contentWidth, 880, 1800),
    radius: clamp(value.radius, 0, 34),
    density: clamp(value.density, 0.82, 1.18),
    glass: clamp(value.glass, 0, 100),
    blur: clamp(value.blur, 0, 48),
    grain: clamp(value.grain, 0, 100),
    glow: clamp(value.glow, 0, 100),
    backdrop: clamp(value.backdrop, 0, 100),
    motion: clamp(value.motion, 0.35, 2.5),
    performance: Boolean(value.performance),
  };
}

export const easeCurve: Record<MotionEase, string> = {
  smooth: 'cubic-bezier(0.22, 0.9, 0.25, 1)',
  spring: 'cubic-bezier(0.16, 1.16, 0.3, 1)',
  soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

function hexToRgb(hex: string): [number, number, number] {
  const value = normalizeHex(hex, '#000000').slice(1);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Number(Math.min(1, Math.max(0, alpha)).toFixed(3))})`;
}

function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const t = Math.min(1, Math.max(0, amount));
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`.toUpperCase();
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function appearanceTokens(state: Appearance): Record<string, string> {
  const { colors } = state;
  const dark = luminance(colors.bg) < 0.42;
  const material = state.design === 'material';
  const performance = state.performance;
  const accent = normalizeHex(colors.accent, '#C9B8FF');
  const panel = normalizeHex(colors.panel, dark ? '#101013' : '#FFFFFF');
  const text = normalizeHex(colors.text, dark ? '#F4F2EE' : '#18181B');
  const dim = normalizeHex(colors.dim, dark ? '#A3A1A7' : '#52525B');
  const bg = normalizeHex(colors.bg, dark ? '#070708' : '#E4E4E7');
  const faint = mix(dim, bg, dark ? 0.26 : 0.2);
  const bgSoft = mix(bg, text, dark ? 0.035 : 0.02);
  const accentInk = luminance(accent) > 0.58 ? '#111114' : '#FFFFFF';
  const glassAlpha = performance ? 1 : material ? 0.97 : clamp(0.42 + (state.glass / 100) * 0.54, 0.42, 0.97);
  const railAlpha = performance ? 1 : material ? 0.95 : clamp(0.12 + (state.glass / 100) * 0.62, 0.12, 0.78);
  const fontUi = UI_FONTS.find((font) => font.id === state.fontUi)?.family ?? UI_FONTS[0].family;
  const fontDisplay = DISPLAY_FONTS.find((font) => font.id === state.fontDisplay)?.family ?? DISPLAY_FONTS[0].family;
  const motion = state.animations ? state.motion : Number.POSITIVE_INFINITY;
  const duration = (ms: number) => `${Math.max(1, Math.round(ms / motion))}ms`;
  const lightMuted = dark
    ? { mint: '#B9E6C9', danger: '#FF7A7A', gold: '#E8D7A8', peach: '#F3C9B8', sky: '#B8D8F3' }
    : { mint: '#267A55', danger: '#C43D3D', gold: '#9A6B0A', peach: '#B85D38', sky: '#2E6F9E' };

  return {
    '--bg': bg,
    '--bg-soft': bgSoft,
    '--bg-elevated': panel,
    '--text': text,
    '--dim': dim,
    '--faint': faint,
    '--line': rgba(text, dark ? (material ? 0.06 : 0.09) : material ? 0.07 : 0.1),
    '--surface': material ? rgba(accent, dark ? 0.055 : 0.045) : rgba(text, dark ? 0.045 : 0.035),
    '--surface-hover': material ? rgba(accent, dark ? 0.1 : 0.075) : rgba(text, dark ? 0.08 : 0.06),
    '--surface-strong': material ? rgba(accent, dark ? 0.17 : 0.12) : rgba(text, dark ? 0.12 : 0.09),
    '--border-strong': material ? rgba(accent, 0.26) : rgba(text, dark ? 0.17 : 0.18),
    '--hover': material ? rgba(accent, dark ? 0.075 : 0.055) : rgba(text, dark ? 0.055 : 0.045),
    '--hover-strong': material ? rgba(accent, dark ? 0.13 : 0.09) : rgba(text, dark ? 0.1 : 0.075),
    '--accent-ink': material ? accentInk : dark ? mix(bg, '#000000', 0.35) : '#FFFFFF',
    '--accent-on': accentInk,
    '--lilac': accent,
    '--accent-soft': material ? rgba(accent, dark ? 0.16 : 0.11) : rgba(accent, dark ? 0.14 : 0.1),
    '--accent-line': rgba(accent, dark ? 0.46 : 0.38),
    '--selection': rgba(accent, dark ? 0.28 : 0.2),
    '--row-active': material ? rgba(accent, dark ? 0.13 : 0.09) : rgba(accent, dark ? 0.085 : 0.07),
    '--mint': lightMuted.mint,
    '--danger': lightMuted.danger,
    '--gold': lightMuted.gold,
    '--peach': lightMuted.peach,
    '--sky': lightMuted.sky,
    '--glass-bg': rgba(material ? mix(panel, accent, 0.025) : panel, glassAlpha),
    '--glass-strong': rgba(material ? mix(panel, accent, 0.04) : panel, Math.min(1, glassAlpha + 0.06)),
    '--glass-border': rgba(text, dark ? (material ? 0.065 : 0.11) : material ? 0.07 : 0.09),
    '--panel-bg': rgba(material ? mix(panel, accent, 0.05) : panel, railAlpha),
    '--panel-strong': rgba(material ? mix(panel, accent, 0.09) : panel, Math.min(1, railAlpha + 0.14)),
    '--player-bg': rgba(material ? mix(panel, accent, 0.035) : panel, Math.min(1, glassAlpha + 0.04)),
    '--content-bg': material
      ? rgba(mix(bg, panel, dark ? 0.46 : 0.76), dark ? 0.96 : 0.98)
      : rgba(panel, dark ? 0.19 : 0.28),
    '--shadow': material
      ? dark
        ? '0 18px 44px rgba(0, 0, 0, 0.36)'
        : '0 16px 38px rgba(35, 28, 18, 0.13)'
      : dark
        ? '0 28px 90px rgba(0, 0, 0, 0.52)'
        : '0 24px 70px rgba(35, 28, 18, 0.14)',
    '--shadow-soft': material
      ? dark
        ? '0 10px 28px rgba(0, 0, 0, 0.24)'
        : '0 8px 22px rgba(35, 28, 18, 0.08)'
      : dark
        ? '0 12px 34px rgba(0, 0, 0, 0.32)'
        : '0 10px 28px rgba(35, 28, 18, 0.09)',
    '--glass-blur': `${performance ? 0 : material ? Math.min(state.blur, 10) : state.blur}px`,
    '--font-ui': fontUi,
    '--font-display': fontDisplay,
    '--font-brand': DISPLAY_FONTS[0].family,
    '--type-scale': String(state.typeScale),
    '--ui-scale': String(state.uiScale),
    '--sidebar-width': `${state.sidebarWidth}px`,
    '--topbar-height': `${state.topbarHeight}px`,
    '--player-height': `${state.playerHeight}px`,
    '--player-radius': `${state.playerStyle === 'bar' ? 0 : state.playerRadius}px`,
    '--player-art-size': `${state.playerArtSize}px`,
    '--player-control-size': `${state.playerControlSize}px`,
    '--player-progress-height': `${state.playerProgress === 'pill' ? 5 : 3}px`,
    '--now-art-scale': String(state.nowPlayingArtScale),
    '--content-padding': `${state.contentPadding}px`,
    '--content-max-width': `${state.contentWidth}px`,
    '--radius-scale': String(state.radius / 16),
    '--density': String(state.density),
    '--motion-fast': duration(150),
    '--motion-base': duration(260),
    '--motion-slow': duration(460),
    '--motion-slower': duration(820),
    '--motion-ease': easeCurve[state.motionEase],
    '--grain-opacity': String(performance ? 0 : state.grain / 1000),
    '--glow-strength': String(state.glow / 100),
    '--orb-opacity': String(performance ? 0 : state.glow / 100),
    '--cover-backdrop-opacity': String(performance ? 0 : (state.backdrop / 100) * 0.42),
    '--art-shadow': dark ? '0 24px 70px rgba(0,0,0,0.5)' : '0 24px 60px rgba(30,24,18,0.18)',
  };
}

export function applyAppearance(state: Appearance): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = appearanceTokens(state);
  for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value);
  const dark = luminance(state.colors.bg) < 0.42;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.design = state.design;
  root.dataset.nav = state.navStyle;
  root.dataset.navSide = state.navSide;
  root.dataset.player = state.playerStyle;
  root.dataset.playerLayout = state.playerLayout;
  root.dataset.playerProgress = state.playerProgress;
  root.dataset.playerMaterial = state.playerMaterial;
  root.dataset.playerCover = state.playerCoverShape;
  root.dataset.nowPlaying = state.nowPlayingLayout;
  root.dataset.art = state.artworkShape;
  root.dataset.fx = state.effectsStyle;
  root.dataset.motion = state.animations ? 'on' : 'off';
  root.dataset.coverGlow = state.coverGlow ? 'on' : 'off';
  root.dataset.orbs = state.animatedOrbs ? 'on' : 'off';
  root.dataset.performance = state.performance ? 'on' : 'off';
  root.style.colorScheme = dark ? 'dark' : 'light';
}

interface CustomizationState extends Appearance {
  set: (patch: AppearancePatch) => void;
  setColor: (key: keyof AppearanceColors, value: string) => void;
  setNavStyle: (style: NavStyle) => void;
  applyPreset: (id: Exclude<PresetId, 'custom'>) => void;
  reset: () => void;
  randomize: () => void;
}

function valuesForPreset(id: Exclude<PresetId, 'custom'>): Appearance {
  const preset = PRESETS.find((entry) => entry.id === id) ?? PRESETS[0];
  return clampAppearance({
    ...DEFAULT_APPEARANCE,
    ...preset.values,
    colors: { ...DEFAULT_APPEARANCE.colors, ...(preset.values.colors || {}) },
    preset: id,
  });
}

export const useCustomizationStore = create<CustomizationState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_APPEARANCE,
      set: (patch) =>
        set((current) => {
          const touchesTheme = Object.keys(patch).some(
            (key) => key !== 'design' && key !== 'effectsStyle' && key !== 'performance',
          );
          const next = clampAppearance({
            ...current,
            ...patch,
            colors: { ...current.colors, ...(patch.colors || {}) },
            preset: touchesTheme ? 'custom' : current.preset,
          });
          return next;
        }),
      setColor: (key, value) =>
        set((current) => ({
          ...current,
          colors: {
            ...current.colors,
            [key]: normalizeHex(value, current.colors[key]),
          },
          preset: 'custom',
        })),
      setNavStyle: (style) =>
        set((current) => {
          const width = style === 'rail' ? clamp(current.sidebarWidth, 58, 92) : clamp(current.sidebarWidth < 190 ? 244 : current.sidebarWidth, 208, 320);
          return { ...current, navStyle: style, sidebarWidth: width, preset: 'custom' };
        }),
      applyPreset: (id) => set({ ...valuesForPreset(id), design: get().design }),
      reset: () => set(valuesForPreset('platinum')),
      randomize: () =>
        set((current) => {
          const accentChoices = ['#C9B8FF', '#FF5C5C', '#7DD3FC', '#B9E6C9', '#F3C9B8', '#E8D7A8', '#F0B8C8', '#9BE7D8'];
          const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
          const accent = pick(accentChoices);
          const base = get().preset === 'custom' ? current : valuesForPreset('platinum');
          return clampAppearance({
            ...base,
            colors: { ...base.colors, accent },
            fontUi: pick(UI_FONTS).id,
            fontDisplay: pick(DISPLAY_FONTS).id,
            effectsStyle: pick(['clean', 'cinematic', 'neon', 'aurora'] as EffectsStyle[]),
            radius: 8 + Math.round(Math.random() * 18),
            glass: 60 + Math.round(Math.random() * 35),
            glow: 25 + Math.round(Math.random() * 60),
            motion: 0.8 + Math.random() * 0.8,
            preset: 'custom',
          });
        }),
    }),
    {
      name: 'platinum.appearance.v1',
      version: 3,
      partialize: (state) => {
        const { set, setColor, setNavStyle, applyPreset, reset, randomize, ...rest } = state;
        return rest;
      },
      migrate: (persisted, version) => {
        const old = (persisted || {}) as Record<string, any>;
        return clampAppearance({
          ...DEFAULT_APPEARANCE,
          ...old,
          colors: { ...DEFAULT_APPEARANCE.colors, ...(old.colors || {}) },
          preset: (old.preset as PresetId) || 'platinum',
          design: version < 2 && !old.design ? 'platinum' : old.design || 'platinum',
          effectsStyle: version < 2 && !old.effectsStyle ? 'cinematic' : old.effectsStyle || 'cinematic',
          performance: version < 2 ? false : Boolean(old.performance),
        } as Appearance);
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyAppearance(state);
      },
    },
  ),
);

if (typeof window !== 'undefined') {
  applyAppearance(useCustomizationStore.getState());
  useCustomizationStore.subscribe((state) => applyAppearance(state));
}
