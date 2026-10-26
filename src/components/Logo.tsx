import React, { useId } from 'react';
import { Text, View } from 'react-native';
import { fonts } from '../theme';

/**
 * Platinum's identity mark: a restrained P monogram caught in a single orbit.
 * The SVG consumes live theme tokens, so it stays native to every palette,
 * design language and light/dark preset.
 */
export function LogoMark({
  size = 28,
  glow = false,
  style,
}: {
  size?: number;
  glow?: boolean;
  style?: React.CSSProperties;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = `platinum-logo-${rawId}`;
  const detail = size >= 26;

  return (
    <span
      className={`logo-mark${glow ? ' logo-mark-glow' : ''}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, Math.round(size * 0.3)),
        ...style,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" focusable="false">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--bg-elevated)" />
            <stop offset="0.52" stopColor="var(--bg-soft)" />
            <stop offset="1" stopColor="var(--bg)" />
          </linearGradient>
          <radialGradient id={`${id}-light`} cx="46%" cy="24%" r="68%">
            <stop offset="0" stopColor="var(--lilac)" stopOpacity="0.3" />
            <stop offset="0.52" stopColor="var(--lilac)" stopOpacity="0.07" />
            <stop offset="1" stopColor="var(--bg)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-p`} gradientUnits="userSpaceOnUse" x1="22" y1="16" x2="45" y2="48">
            <stop offset="0" stopColor="var(--text)" />
            <stop offset="0.56" stopColor="var(--text)" />
            <stop offset="1" stopColor="var(--lilac)" />
          </linearGradient>
          <linearGradient id={`${id}-orbit`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--text)" stopOpacity="0.42" />
            <stop offset="0.52" stopColor="var(--lilac)" stopOpacity="0.52" />
            <stop offset="1" stopColor="var(--lilac)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="19" fill={`url(#${id}-bg)`} />
        <rect width="64" height="64" rx="19" fill={`url(#${id}-light)`} />
        {detail ? (
          <>
            <circle cx="32" cy="32" r="21.4" fill="none" stroke={`url(#${id}-orbit)`} strokeWidth="0.85" />
            <circle cx="47.2" cy="20.4" r="1.15" fill="var(--lilac)" />
            <circle cx="47.2" cy="20.4" r="3" fill="var(--lilac)" opacity="0.2" />
          </>
        ) : null}
        <path
          d="M24.5 47.5V16.5h10.2c7.9 0 13 4.1 13 9.9s-5.1 10-13 10h-10.2"
          fill="none"
          stroke={`url(#${id}-p)`}
          strokeWidth="4.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="1.4" y="1.4" width="61.2" height="61.2" rx="17.8" fill="none" stroke="var(--text)" strokeOpacity="0.11" strokeWidth="0.8" />
      </svg>
    </span>
  );
}

export function LogoWordmark({
  size = 19,
  caps = false,
  style,
}: {
  size?: number;
  caps?: boolean;
  style?: any;
}) {
  return (
    <Text
      className="wordmark"
      style={[
        {
          color: 'var(--text)',
          fontFamily: fonts.brand,
          fontSize: size,
          fontWeight: '600',
          letterSpacing: caps ? size * 0.2 : -size * 0.038,
          lineHeight: size * 1.2,
        },
        style,
      ]}
    >
      {caps ? 'PLATINUM' : 'Platinum'}
    </Text>
  );
}

export function LogoLockup({ size = 30, note }: { size?: number; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.36) }}>
      <LogoMark size={size} />
      <View>
        <LogoWordmark size={Math.round(size * 0.6)} />
        {note ? (
          <Text
            style={{
              color: 'var(--faint)',
              fontFamily: fonts.ui,
              fontSize: 7,
              fontWeight: '700',
              letterSpacing: 1.55,
              marginTop: 1,
            }}
          >
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
