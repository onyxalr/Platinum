import React, { forwardRef } from 'react';
import {
  Image as RNImage,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput as RNTextInput,
  View as RNView,
} from 'react-native-web';

/**
 * Platinum's React Native Web adapter.
 *
 * Beyond mirroring `className` into `data-ui`, this layer powers the live
 * appearance controls: text sizes follow `--type-scale`, spacing follows
 * `--density`, and corner radii follow `--radius-scale`. Styles are cloned
 * instead of mutated so React Native's own style objects stay untouched.
 */

const textCache = new WeakMap<object, any>();
const boxCache = new WeakMap<object, any>();

const textKeys = ['fontSize', 'lineHeight'] as const;
const radiusKeys = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
] as const;
const spacingKeys = [
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginHorizontal',
  'marginVertical',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'gap',
  'rowGap',
  'columnGap',
] as const;

function transformStyle(style: any, mode: 'text' | 'box'): any {
  if (!style) return style;
  if (typeof style === 'function') return (state: any) => transformStyle(style(state), mode);
  if (Array.isArray(style)) return style.map((entry) => transformStyle(entry, mode));
  if (typeof style !== 'object') return style;

  const cache = mode === 'text' ? textCache : boxCache;
  const cached = cache.get(style);
  if (cached) return cached;

  let next: Record<string, any> | null = null;
  const clone = () => {
    if (!next) next = { ...style };
    return next as Record<string, any>;
  };

  if (mode === 'text') {
    for (const key of textKeys) {
      const value = (style as any)[key];
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        clone()[key] = `calc(${value}px * var(--type-scale, 1))`;
      }
    }
  } else {
    const size = (style as any).width ?? (style as any).height;
    for (const key of radiusKeys) {
      const value = (style as any)[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 40) continue;
      // Keep avatars, dots and circular controls perfectly round.
      if (size !== undefined && size === value) continue;
      clone()[key] = `calc(${value}px * var(--radius-scale, 1))`;
    }
    for (const key of spacingKeys) {
      const value = (style as any)[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 80) continue;
      clone()[key] = `calc(${value}px * var(--density, 1))`;
    }
  }

  const result = next || style;
  cache.set(style, result);
  return result;
}

function tokenSet(className?: string, token?: string, dataSet?: Record<string, any>): Record<string, any> | undefined {
  const tokens = new Set<string>();
  for (const entry of String(className || '').split(/\s+/)) if (entry) tokens.add(entry);
  if (token) tokens.add(token);
  const existing = dataSet?.ui ? String(dataSet.ui).split(/\s+/).filter(Boolean) : [];
  for (const entry of existing) tokens.add(entry);
  if (!tokens.size && !dataSet) return undefined;
  return { ...(dataSet || {}), ...(tokens.size ? { ui: Array.from(tokens).join(' ') } : null) };
}

type WrapperOptions = {
  token?: string;
  style?: 'text' | 'box' | 'image' | false;
  contentStyle?: boolean;
};

function withClassName(Component: any, options: WrapperOptions = {}) {
  return forwardRef<any, any>((props, ref) => {
    const { className, dataSet, style, contentContainerStyle, ...rest } = props;
    const finalStyle = options.style === 'text' ? transformStyle(style, 'text') : options.style === 'box' ? transformStyle(style, 'box') : style;
    const finalContentStyle = options.contentStyle ? transformStyle(contentContainerStyle, 'box') : contentContainerStyle;
    return (
      <Component
        {...rest}
        {...(finalStyle !== style ? { style: finalStyle } : style !== undefined ? { style } : null)}
        {...(options.contentStyle && finalContentStyle !== contentContainerStyle
          ? { contentContainerStyle: finalContentStyle }
          : contentContainerStyle !== undefined
            ? { contentContainerStyle }
            : null)}
        {...(tokenSet(className, options.token, dataSet) ? { dataSet: tokenSet(className, options.token, dataSet) } : null)}
        ref={ref}
      />
    );
  });
}

export const View = withClassName(RNView, { token: 'view', style: 'box' });
export const Text = withClassName(RNText, { token: 'text', style: 'text' });
export const Pressable = withClassName(RNPressable, { token: 'pressable', style: 'box' });
export const ScrollView = withClassName(RNScrollView, { token: 'scroll', style: 'box', contentStyle: true });
export const Image = withClassName(RNImage, { token: 'image', style: 'image' });
export const TextInput = withClassName(RNTextInput, { token: 'input', style: 'text' });

export { StyleSheet, useWindowDimensions } from 'react-native-web';
