/**
 * Theme tokens are CSS custom properties. The customization store writes their
 * values at runtime, which lets every component stay declarative while the
 * complete palette, type and material language remains live-editable.
 */
export const colors = {
  bg: 'var(--bg)',
  bgSoft: 'var(--bg-soft)',
  bgElevated: 'var(--bg-elevated)',
  surface: 'var(--surface)',
  surfaceHover: 'var(--surface-hover)',
  surfaceStrong: 'var(--surface-strong)',
  border: 'var(--line)',
  borderStrong: 'var(--border-strong)',
  text: 'var(--text)',
  textDim: 'var(--dim)',
  textFaint: 'var(--faint)',
  accent: 'var(--text)',
  accentInk: 'var(--accent-ink)',
  accentOn: 'var(--accent-on)',
  lilac: 'var(--lilac)',
  mint: 'var(--mint)',
  peach: 'var(--peach)',
  sky: 'var(--sky)',
  danger: 'var(--danger)',
  gold: 'var(--gold)',
} as const;

export const layout = {
  titleBar: 42,
  sidebar: 252,
  player: 92,
  topBar: 64,
  radius: 20,
  contentPadding: 32,
  minWidth: 1040,
} as const;

export const fonts = {
  ui: 'var(--font-ui)',
  display: 'var(--font-display)',
  brand: 'var(--font-brand)',
} as const;

export const gradients = {
  platinum:
    'linear-gradient(120deg, color-mix(in srgb, var(--text) 54%, #8C877C) 0%, var(--text) 28%, color-mix(in srgb, var(--text) 80%, var(--lilac)) 52%, color-mix(in srgb, var(--lilac) 74%, var(--text)) 78%, var(--lilac) 100%)',
  soft: 'linear-gradient(180deg, var(--surface-hover) 0%, var(--surface) 100%)',
  veil: 'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--bg) 55%, transparent) 55%, var(--bg) 100%)',
  lilac: 'linear-gradient(135deg, color-mix(in srgb, var(--lilac) 36%, var(--bg)) 0%, var(--bg) 70%)',
  mint: 'linear-gradient(135deg, color-mix(in srgb, var(--mint) 28%, var(--bg)) 0%, var(--bg) 70%)',
  ember: 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 28%, var(--bg)) 0%, var(--bg) 70%)',
  rose: 'linear-gradient(135deg, color-mix(in srgb, var(--peach) 26%, var(--bg)) 0%, var(--bg) 70%)',
} as const;

export const brandGradient = gradients.platinum;

export const ART_FALLBACKS = ['#2A2440', '#1F2F2A', '#33232A', '#222C3A', '#2E2A1F'];
