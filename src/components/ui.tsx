import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  type LayoutChangeEvent,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Square,
  X,
  Play,
  Pause,
  type LucideIcon,
} from 'lucide-react';
import { artGradient, initials, thumbFallback } from '../lib/format';
import { colors, fonts, layout } from '../theme';

export type IconType = LucideIcon;

export const webStyle = (style: Record<string, any>): any => style;

export function IconButton({
  icon: Icon,
  onPress,
  label,
  active = false,
  disabled = false,
  size = 18,
  buttonSize = 34,
  iconColor,
  style,
}: {
  icon: IconType;
  onPress?: () => void;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  size?: number;
  buttonSize?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      className="icon-btn no-drag"
      style={({ pressed }: any) => [
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : pressed ? 0.75 : 1,
        },
        active && { backgroundColor: colors.surfaceStrong },
        style,
      ]}
    >
      <Icon size={size} color={iconColor ?? (active ? colors.text : colors.textDim)} strokeWidth={1.7} />
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  small = false,
  textColor,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconType;
  variant?: 'primary' | 'ghost' | 'outline' | 'soft';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  textColor?: string;
}) {
  const base: ViewStyle = {
    height: small ? 36 : 46,
    paddingHorizontal: small ? 16 : 22,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };
  const variants: Record<string, ViewStyle> = {
    primary: { backgroundColor: colors.text },
    ghost: { backgroundColor: 'transparent' },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
    soft: { backgroundColor: colors.surface },
  };
  const resolvedTextColor = textColor ?? (variant === 'primary' ? colors.accentInk : colors.text);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`btn btn-${variant} press-scale no-drag`}
      style={({ pressed }: any) => [
        base,
        variants[variant],
        { opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <Spinner size={16} color={resolvedTextColor} /> : Icon ? <Icon size={small ? 15 : 17} color={resolvedTextColor} strokeWidth={2} /> : null}
      <Text
        style={{
          color: resolvedTextColor,
          fontFamily: fonts.ui,
          fontSize: small ? 13 : 14,
          fontWeight: '600',
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Spinner({ size = 18, color = colors.text }: { size?: number; color?: string }) {
  return (
    <View
      className="spin-fast"
      style={{
        width: size,
        height: size,
        borderRadius: size,
        borderWidth: 2,
        borderColor: colors.borderStrong,
        borderTopColor: color,
      }}
    />
  );
}

export function Eq({ paused = false, color = colors.lilac }: { paused?: boolean; color?: string }) {
  return (
    <View className={`eq${paused ? ' paused' : ''}`} style={{ color }}>
      <View />
      <View />
      <View />
      <View />
    </View>
  );
}

export function Skeleton({ height, width, radius = 12, style }: { height: number; width?: number | string; radius?: number; style?: StyleProp<ViewStyle> }) {
  return <View className="skeleton" style={[{ height, width: width ?? '100%', borderRadius: radius }, style]} />;
}

export function Artwork({
  uri,
  seed,
  size,
  radius = 16,
  style,
  imageStyle,
  children,
  className,
}: {
  uri?: string | null;
  seed: string;
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: any;
  children?: React.ReactNode;
  className?: string;
}) {
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const lastUri = useRef(uri);
  if (lastUri.current !== uri) {
    lastUri.current = uri;
    if (step !== 0) setStep(0);
    if (failed) setFailed(false);
  }
  const resolved = uri ? thumbFallback(uri, step, size ?? 420) : '';
  const [c1, c2] = useMemo(() => artGradient(seed || 'platinum'), [seed]);
  const dimension = size ? { width: size, height: size } : {};
  return (
    <View
      className={`artwork grain${className ? ` ${className}` : ''}`}
      style={[
        {
          ...dimension,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: c2,
          backgroundImage: `linear-gradient(145deg, ${c1} 0%, ${c2} 78%)`,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {resolved && !failed ? (
        <Image
          source={{ uri: resolved }}
          className="cover-img"
          style={[{ width: '100%', height: '100%' }, imageStyle]}
          resizeMode="cover"
          onError={() => {
            if (step < 2) setStep(step + 1);
            else setFailed(true);
          }}
        />
      ) : (
        <Text
          className="display"
          style={{ color: 'rgba(255,255,255,0.34)', fontSize: size ? size * 0.3 : 32, fontStyle: 'italic' }}
        >
          {(seed || 'P').slice(0, 1).toUpperCase()}
        </Text>
      )}
      {children}
    </View>
  );
}

export function Avatar({ name, accent, size = 34 }: { name: string; accent: string; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size,
        backgroundImage: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, var(--text) 8%, transparent) 100%)`,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: '#16151A', letterSpacing: -0.2 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }, style]}>
      <View>
        <Text style={{ color: colors.text, fontSize: 21, fontWeight: '650', letterSpacing: -0.6 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: colors.textFaint, fontSize: 12.5, marginTop: 4 }}>{subtitle}</Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} className="link-hover">
          <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: '550' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Slider({
  value,
  onChange,
  height = 4,
  thumb = true,
  color = colors.text,
  style,
  mutedColor = 'color-mix(in srgb, var(--text) 14%, transparent)',
  onCommit,
}: {
  value: number;
  onChange: (value: number) => void;
  height?: number;
  thumb?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
  mutedColor?: string;
  onCommit?: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const current = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const widthRef = useRef(0);
  const lastRef = useRef(current);
  lastRef.current = current;

  const layout = (event: LayoutChangeEvent) => {
    widthRef.current = event.nativeEvent.layout.width;
    setWidth(event.nativeEvent.layout.width);
  };

  const update = (locationX: number, commit = false) => {
    const w = widthRef.current;
    if (!w) return;
    const next = Math.max(0, Math.min(1, locationX / w));
    onChange(next);
    if (commit) onCommit?.(next);
  };

  return (
    <View
      onLayout={layout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event: any) => {
        setDragging(true);
        update(event.nativeEvent.locationX);
      }}
      onResponderMove={(event: any) => update(event.nativeEvent.locationX)}
      onResponderRelease={(event: any) => {
        setDragging(false);
        update(event.nativeEvent.locationX, true);
      }}
      onResponderTerminate={() => setDragging(false)}
      className="volume-slider cursor-pointer no-drag"
      style={[{ height: 20, justifyContent: 'center' }, style]}
    >
      <View style={{ height, borderRadius: height, backgroundColor: mutedColor, overflow: 'hidden' }}>
        <View className="progress-fill" style={{ height, width: `${current * 100}%`, borderRadius: height, backgroundColor: color }} />
      </View>
      {thumb && width > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: `${current * 100}%`,
            width: dragging ? 12 : 10,
            height: dragging ? 12 : 10,
            marginLeft: dragging ? -6 : -5,
            borderRadius: 8,
            backgroundColor: color,
            opacity: dragging ? 1 : 0,
            boxShadow: 'var(--shadow-soft)',
          }}
        />
      ) : null}
    </View>
  );
}

export function Modal({
  children,
  onClose,
  width = 460,
  align = 'center',
  panelStyle,
}: {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  align?: 'center' | 'top';
  panelStyle?: any;
}) {
  return (
    <View className="modal-backdrop" style={{ alignItems: 'center', justifyContent: align === 'top' ? 'flex-start' : 'center', paddingTop: align === 'top' ? 90 : 0 }}>
      <Pressable style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} onPress={onClose} />
      <View
        className="glass modal-panel"
        style={[
          {
            width,
            maxWidth: '92%',
            borderRadius: 24,
            padding: 26,
            boxShadow: 'var(--shadow)',
          },
          panelStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function ModalHeader({ title, subtitle, onClose }: { title: string; subtitle?: string; onClose: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '650', letterSpacing: -0.5 }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textFaint, fontSize: 12.5, marginTop: 4 }}>{subtitle}</Text> : null}
      </View>
      <IconButton icon={X} onPress={onClose} label="Закрыть" />
    </View>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  compact = false,
}: {
  icon: IconType;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: compact ? 36 : 64, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={22} color={colors.textDim} strokeWidth={1.5} />
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>{title}</Text>
      {description ? (
        <Text style={{ color: colors.textFaint, fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 19 }}>
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button label={action} onPress={onAction} variant="soft" small style={{ marginTop: 18 }} />
      ) : null}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoFocus,
  onSubmitEditing,
  icon: Icon,
  error,
  maxLength,
}: {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  icon?: IconType;
  error?: string | null;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 7 }}>
      {label ? (
        <Text style={{ color: colors.textDim, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {label}
        </Text>
      ) : null}
      <View
        className="auth-field"
        style={{
          height: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: error ? 'color-mix(in srgb, var(--danger) 50%, transparent)' : colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          gap: 10,
        }}
      >
        {Icon ? <Icon size={16} color={colors.textFaint} strokeWidth={1.6} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          maxLength={maxLength}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={colors.lilac}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 14,
            fontFamily: fonts.ui,
            letterSpacing: -0.1,
            outlineStyle: 'none',
          }}
        />
      </View>
      {error ? <Text style={{ color: colors.danger, fontSize: 11.5 }}>{error}</Text> : null}
    </View>
  );
}

export function WindowControls({ onClose, onMinimize, onToggleMaximize }: { onClose: () => void; onMinimize: () => void; onToggleMaximize: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} className="no-drag">
      {[
        { key: 'min', icon: Minus, action: onMinimize, label: 'Свернуть' },
        { key: 'max', icon: Square, action: onToggleMaximize, label: 'Развернуть' },
        { key: 'close', icon: X, action: onClose, label: 'Закрыть' },
      ].map(({ key, icon: Icon, action, label }) => (
        <Pressable
          key={key}
          accessibilityLabel={label}
          onPress={action}
          onHoverIn={() => setHover(key)}
          onHoverOut={() => setHover(null)}
          style={{
            width: 38,
            height: 28,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hover === key ? (key === 'close' ? 'rgba(255,80,80,0.85)' : colors.surfaceHover) : 'transparent',
            transition: 'background-color .15s ease',
          }}
        >
          <Icon size={key === 'max' ? 11 : 13} color={hover === key && key === 'close' ? '#fff' : colors.textDim} strokeWidth={1.8} />
        </Pressable>
      ))}
    </View>
  );
}

export function NavArrows({ onBack, canBack }: { onBack: () => void; canBack: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Pressable
        onPress={onBack}
        disabled={!canBack}
        className="icon-btn no-drag"
        style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: canBack ? 1 : 0.25 }}
      >
        <ChevronLeft size={17} color={colors.textDim} />
      </Pressable>
      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', opacity: 0.25 }}>
        <ChevronRight size={17} color={colors.textDim} />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  fill: { flex: 1 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  section: { marginBottom: 34 },
  cardRadius: { borderRadius: layout.radius },
});

export function PlayGlyph({ playing, size = 20, color = colors.accentInk }: { playing: boolean; size?: number; color?: string }) {
  return playing ? <Pause size={size} color={color} fill={color} strokeWidth={0} /> : <Play size={size} color={color} fill={color} strokeWidth={0} />;
}

export { ScrollView };
