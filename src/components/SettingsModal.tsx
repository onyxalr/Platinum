import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import {
  ArrowUpRight,
  AudioLines,
  Check,
  Cpu,
  Database,
  Download,
  FolderOpen,
  Gauge,
  Info,
  LayoutDashboard,
  LogOut,
  Palette,
  Play,
  RefreshCw,
  RotateCcw,
  Shuffle,
  Sparkles,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import {
  DEFAULT_APPEARANCE,
  DISPLAY_FONTS,
  PRESETS,
  UI_FONTS,
  useCustomizationStore,
  type AppearanceColors,
  type ArtworkShape,
  type DesignStyle,
  type EffectsStyle,
  type FontDisplayId,
  type FontUiId,
  type MotionEase,
  type NavSide,
  type NavStyle,
  type PlayerCoverShape,
  type PlayerLayout,
  type PlayerMaterial,
  type PlayerProgressStyle,
  type PlayerStyle,
  type PlayerTimeMode,
  type NowPlayingLayout,
} from '../store/customization';
import { useRuntimeStore } from '../store/runtime';
import { useUiStore } from '../store/ui';
import { colors } from '../theme';
import { Avatar, Button, IconButton, Modal } from './ui';
import { LogoLockup, LogoMark } from './Logo';

type Tab = 'appearance' | 'player' | 'layout' | 'effects' | 'motion' | 'engine' | 'data' | 'account' | 'about';

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'appearance', label: 'Оформление', icon: Palette },
  { id: 'player', label: 'Плеер', icon: AudioLines },
  { id: 'layout', label: 'Макет', icon: LayoutDashboard },
  { id: 'effects', label: 'Эффекты', icon: Sparkles },
  { id: 'motion', label: 'Движение', icon: Gauge },
  { id: 'engine', label: 'Движок', icon: Cpu },
  { id: 'data', label: 'Данные', icon: Database },
  { id: 'account', label: 'Аккаунт', icon: User },
  { id: 'about', label: 'О проекте', icon: Info },
];

const BG_SWATCHES = ['#070708', '#000000', '#0A0908', '#070B14', '#141118', '#1A1A1E', '#E4E4E7', '#F2EFE9', '#F7F4EE', '#FFFFFF'];
const PANEL_SWATCHES = ['#101013', '#0A0A0A', '#15120E', '#0D1524', '#18181B', '#202024', '#FFFFFF', '#FFFCF6', '#F5F5F7', '#EDEAE3'];
const TEXT_SWATCHES = ['#F4F2EE', '#FAFAFA', '#F0E8D8', '#EEF3FF', '#FFFFFF', '#18181B', '#221F1A', '#2A2A2E', '#52525B', '#D8D2C6'];
const DIM_SWATCHES = ['#A3A1A7', '#A1A1AA', '#A69B87', '#94A3B8', '#71717A', '#52525B', '#6F6A61', '#7A7A82', '#9A948A', '#B8B2A8'];
const ACCENT_SWATCHES = [
  '#C9B8FF',
  '#FF5C5C',
  '#FF4D4D',
  '#7DD3FC',
  '#B9E6C9',
  '#F3C9B8',
  '#E8D7A8',
  '#F0B8C8',
  '#9BE7D8',
  '#D7B46A',
  '#6B5BC9',
  '#B7A6FF',
];

function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <View className="customizer-section">
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14.5, fontWeight: '650', letterSpacing: -0.3 }}>{title}</Text>
          {hint ? <Text style={{ color: colors.textFaint, fontSize: 11, lineHeight: 16, marginTop: 4 }}>{hint}</Text> : null}
        </View>
        {action}
      </View>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

function RangeControl({
  label,
  hint,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const ratio = max > min ? (value - min) / (max - min) : 0;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '550', flex: 1 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 11, fontWeight: '650', fontVariant: ['tabular-nums'] }}>{format(value)}</Text>
      </View>
      {hint ? <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 3 }}>{hint}</Text> : null}
      <input
        type="range"
        data-ui="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ '--range': `${(ratio * 100).toFixed(2)}%` } as React.CSSProperties}
      />
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View className="segmented">
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={`segment ${value === option.value ? 'is-active' : ''}`}
        >
          <Text style={{ color: value === option.value ? colors.text : colors.textFaint, fontSize: 11, fontWeight: '600' }}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} className="setting-row" style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '550' }}>{label}</Text>
        {hint ? <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 2 }}>{hint}</Text> : null}
      </View>
      <View className={`switch ${value ? 'is-on' : ''}`}>
        <View className="switch-knob" />
      </View>
    </Pressable>
  );
}

function ColorControl({
  label,
  value,
  swatches,
  colorKey,
}: {
  label: string;
  value: string;
  swatches: string[];
  colorKey: keyof AppearanceColors;
}) {
  const setColor = useCustomizationStore((state) => state.setColor);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const update = (next: string) => {
    setDraft(next);
    const normalized = next.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(normalized)) setColor(colorKey, `#${normalized}`);
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '550', flex: 1 }}>{label}</Text>
        <TextInput
          className="color-input"
          value={draft}
          onChangeText={update}
          onBlur={() => setDraft(value)}
          maxLength={7}
          autoCapitalize="characters"
          autoCorrect={false}
          selectionColor={colors.lilac}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {swatches.map((swatch) => {
          const active = swatch.toUpperCase() === value.toUpperCase();
          return (
            <Pressable
              key={swatch}
              accessibilityLabel={`${label} ${swatch}`}
              onPress={() => setColor(colorKey, swatch)}
              className={`swatch ${active ? 'is-active' : ''}`}
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                backgroundColor: swatch,
                borderWidth: 1,
                borderColor: active ? colors.text : colors.borderStrong,
                boxShadow: active ? `0 0 0 2px ${colors.bg}` : undefined,
              }}
            >
              {active ? <Check size={11} color={swatch === '#FFFFFF' || swatch === '#F7F4EE' ? '#111' : '#fff'} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FontCard<T extends string>({
  font,
  active,
  onPress,
  display = false,
}: {
  font: { id: T; label: string; family: string; note: string; sample: string; badge?: string };
  active: boolean;
  onPress: () => void;
  display?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`preset-card ${active ? 'is-active' : ''}`}
      style={{
        flexBasis: '48.5%',
        flexGrow: 1,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: active ? colors.lilac : colors.border,
        backgroundColor: active ? 'var(--accent-soft)' : colors.surface,
        padding: 12,
        gap: 3,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontFamily: font.family,
          fontSize: display ? 21 : 17,
          lineHeight: display ? 26 : 22,
          letterSpacing: display ? -0.6 : -0.3,
        }}
      >
        {font.sample}
      </Text>
      <Text style={{ color: colors.textDim, fontSize: 10, fontWeight: '650', marginTop: 2 }}>{font.label}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 9.5 }}>{font.note}</Text>
      {font.badge ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            paddingHorizontal: 5,
            paddingVertical: 2,
            borderRadius: 4,
            backgroundColor: 'var(--accent-soft)',
            borderWidth: 1,
            borderColor: 'var(--accent-line)',
          }}
        >
          <Text style={{ color: colors.lilac, fontSize: 6.5, fontWeight: '800', letterSpacing: 0.7 }}>{font.badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function DesignCard({ design, active, onPress }: { design: DesignStyle; active: boolean; onPress: () => void }) {
  const material = design === 'material';
  return (
    <Pressable
      onPress={onPress}
      className={`design-card preset-card ${active ? 'is-active' : ''}`}
      style={{
        flexBasis: '48%',
        flexGrow: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? colors.lilac : colors.border,
        backgroundColor: active ? 'var(--accent-soft)' : colors.surface,
        padding: 10,
        gap: 9,
      }}
    >
      <View
        style={{
          height: 68,
          borderRadius: material ? 14 : 10,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: material ? 'color-mix(in srgb, var(--lilac) 9%, var(--bg))' : 'var(--bg)',
          borderWidth: 1,
          borderColor: 'color-mix(in srgb, var(--text) 7%, transparent)',
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            bottom: 8,
            width: material ? 15 : 13,
            borderRadius: 8,
            backgroundColor: material ? 'color-mix(in srgb, var(--lilac) 26%, var(--bg))' : 'var(--panel-bg)',
            borderWidth: 1,
            borderColor: 'var(--glass-border)',
          }}
        />
        <View style={{ position: 'absolute', left: 30, right: 8, top: 8, height: 11, borderRadius: material ? 6 : 3, backgroundColor: 'color-mix(in srgb, var(--text) 8%, transparent)' }} />
        {material ? (
          <>
            <View style={{ position: 'absolute', left: 30, right: 58, top: 25, height: 31, borderRadius: 12, backgroundColor: 'color-mix(in srgb, var(--lilac) 24%, transparent)' }} />
            <View style={{ position: 'absolute', left: 68, right: 8, top: 25, height: 14, borderRadius: 999, backgroundColor: 'color-mix(in srgb, var(--lilac) 56%, transparent)' }} />
            <View style={{ position: 'absolute', left: 68, right: 22, top: 43, height: 13, borderRadius: 999, backgroundColor: 'color-mix(in srgb, var(--text) 11%, transparent)' }} />
          </>
        ) : (
          <>
            <View style={{ position: 'absolute', left: 30, top: 25, width: 31, height: 31, borderRadius: 7, backgroundImage: 'linear-gradient(145deg, color-mix(in srgb, var(--lilac) 54%, var(--bg)) 0%, var(--bg-soft) 100%)' }} />
            <View style={{ position: 'absolute', left: 67, right: 8, top: 25, height: 3, borderRadius: 2, backgroundColor: 'color-mix(in srgb, var(--text) 26%, transparent)' }} />
            <View style={{ position: 'absolute', left: 67, right: 20, top: 33, height: 3, borderRadius: 2, backgroundColor: 'color-mix(in srgb, var(--text) 12%, transparent)' }} />
            <View style={{ position: 'absolute', left: 67, right: 36, top: 45, height: 10, borderRadius: 999, backgroundColor: 'color-mix(in srgb, var(--lilac) 48%, transparent)' }} />
          </>
        )}
        <View style={{ position: 'absolute', right: 8, bottom: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lilac }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 11.5, fontWeight: '650' }}>{material ? 'Material You' : 'Platinum'}</Text>
          <Text style={{ color: colors.textFaint, fontSize: 9, lineHeight: 12.5, marginTop: 2 }}>
            {material ? 'Тональные формы и крупный акцент' : 'Стекло, свет и кинематограф'}
          </Text>
        </View>
        {active ? <Check size={13} color={colors.lilac} /> : null}
      </View>
    </Pressable>
  );
}

function EffectCard({
  id,
  label,
  hint,
  active,
  onPress,
}: {
  id: EffectsStyle;
  label: string;
  hint: string;
  active: boolean;
  onPress: () => void;
}) {
  const art: Record<EffectsStyle, string> = {
    clean: 'linear-gradient(135deg, color-mix(in srgb, var(--text) 7%, transparent), transparent 68%)',
    cinematic:
      'radial-gradient(90% 100% at 18% 0%, color-mix(in srgb, var(--lilac) 32%, transparent), transparent 62%), linear-gradient(135deg, color-mix(in srgb, var(--peach) 15%, transparent), transparent 70%)',
    neon: 'radial-gradient(70% 90% at 80% 15%, color-mix(in srgb, var(--lilac) 46%, transparent), transparent 60%), linear-gradient(135deg, transparent 42%, color-mix(in srgb, var(--sky) 16%, transparent) 100%)',
    aurora:
      'conic-gradient(from 210deg at 26% 24%, color-mix(in srgb, var(--lilac) 38%, transparent), color-mix(in srgb, var(--mint) 20%, transparent), color-mix(in srgb, var(--sky) 28%, transparent), color-mix(in srgb, var(--lilac) 38%, transparent))',
  };
  return (
    <Pressable
      onPress={onPress}
      className={`effect-card preset-card ${active ? 'is-active' : ''}`}
      style={{
        flexBasis: '23%',
        flexGrow: 1,
        minWidth: 120,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: active ? colors.lilac : colors.border,
        backgroundColor: active ? 'var(--accent-soft)' : colors.surface,
        padding: 8,
        gap: 7,
      }}
    >
      <View
        style={{
          height: 44,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundImage: art[id],
          backgroundColor: 'var(--bg-soft)',
          borderWidth: 1,
          borderColor: 'color-mix(in srgb, var(--text) 7%, transparent)',
          position: 'relative',
        }}
      >
        {id === 'neon' ? (
          <View style={{ position: 'absolute', left: 10, right: 10, top: 21, height: 1, backgroundColor: 'color-mix(in srgb, var(--lilac) 82%, transparent)', boxShadow: '0 0 9px var(--lilac)' }} />
        ) : null}
        {id === 'cinematic' ? (
          <View style={{ position: 'absolute', left: 10, bottom: 8, width: 30, height: 3, borderRadius: 2, backgroundColor: 'color-mix(in srgb, var(--text) 38%, transparent)' }} />
        ) : null}
        {id === 'aurora' ? (
          <View style={{ position: 'absolute', left: 10, top: 9, width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'color-mix(in srgb, var(--text) 26%, transparent)' }} />
        ) : null}
        {id === 'clean' ? (
          <View style={{ position: 'absolute', left: 10, top: 12, width: 36, height: 2, borderRadius: 1, backgroundColor: 'color-mix(in srgb, var(--text) 34%, transparent)' }} />
        ) : null}
        {active ? (
          <View style={{ position: 'absolute', right: 5, top: 5, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' }}>
            <Check size={9} color="var(--accent-on)" />
          </View>
        ) : null}
      </View>
      <View>
        <Text style={{ color: colors.text, fontSize: 10.5, fontWeight: '650' }}>{label}</Text>
        <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 8.5, marginTop: 1 }}>{hint}</Text>
      </View>
    </Pressable>
  );
}

function PresetCard({ preset, active, onPress }: { preset: (typeof PRESETS)[number]; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`preset-card ${active ? 'is-active' : ''}`}
      style={{
        flexBasis: '31%',
        flexGrow: 1,
        minWidth: 150,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: active ? colors.lilac : colors.border,
        backgroundColor: active ? 'var(--accent-soft)' : colors.surface,
        padding: 11,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {preset.swatches.map((swatch) => (
          <View
            key={swatch}
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              backgroundColor: swatch,
              borderWidth: 1,
              borderColor: 'color-mix(in srgb, var(--text) 12%, transparent)',
            }}
          />
        ))}
        {active ? <Check size={12} color={colors.lilac} style={{ marginLeft: 'auto' }} /> : null}
      </View>
      <View>
        <Text style={{ color: colors.text, fontSize: 11.5, fontWeight: '650' }}>{preset.label}</Text>
        <Text style={{ color: colors.textFaint, fontSize: 9, lineHeight: 12.5, marginTop: 2 }}>{preset.description}</Text>
      </View>
    </Pressable>
  );
}

function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
  danger = false,
}: {
  icon: typeof FolderOpen;
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="menu-row"
      style={{
        minHeight: 46,
        borderRadius: 11,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
      }}
    >
      <Icon size={16} color={danger ? colors.danger : colors.textDim} strokeWidth={1.65} />
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 12.5, fontWeight: '550', flex: 1 }}>{label}</Text>
      {hint ? <Text style={{ color: colors.textFaint, fontSize: 10 }}>{hint}</Text> : null}
      {!danger ? <ArrowUpRight size={13} color={colors.textFaint} /> : null}
    </Pressable>
  );
}

function AppearanceTab() {
  const appearance = useCustomizationStore();
  const set = useCustomizationStore((state) => state.set);
  const setColor = useCustomizationStore((state) => state.setColor);
  const applyPreset = useCustomizationStore((state) => state.applyPreset);
  const randomize = useCustomizationStore((state) => state.randomize);
  const toast = useUiStore((state) => state.toast);

  return (
    <>
      <Section
        title="Пресеты"
        hint="Готовая отправная точка. Дальше можно настроить всё вручную."
        action={
          <Button
            label="Случайно"
            icon={Shuffle}
            variant="ghost"
            small
            onPress={() => {
              randomize();
              toast('Палитра перемешана', 'success');
            }}
            style={{ height: 30, paddingHorizontal: 10 }}
          />
        }
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              active={appearance.preset === preset.id}
              onPress={() => applyPreset(preset.id)}
            />
          ))}
        </View>
        {appearance.preset === 'custom' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <Wand2 size={12} color={colors.lilac} />
            <Text style={{ color: colors.textFaint, fontSize: 10.5 }}>Своя настройка · изменения сохраняются автоматически</Text>
          </View>
        ) : null}
      </Section>

      <Section
        title="Визуальный язык"
        hint="Два характера интерфейса. Палитра и типографика работают в обоих."
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <DesignCard
            design="platinum"
            active={appearance.design === 'platinum'}
            onPress={() => set({ design: 'platinum' })}
          />
          <DesignCard
            design="material"
            active={appearance.design === 'material'}
            onPress={() => set({ design: 'material' })}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Sparkles size={12} color={colors.lilac} />
          <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 15 }}>
            {appearance.design === 'material'
              ? 'Material You: тональные контейнеры, крупные радиусы и акцентные состояния.'
              : 'Platinum: глубина, стекло, орбитальный свет и кинематографичная сцена.'}
          </Text>
        </View>
      </Section>

      <Section title="Палитра" hint="Цвета применяются ко всем поверхностям, тексту, свечению и акцентам.">
        <ColorControl label="Фон" value={appearance.colors.bg} swatches={BG_SWATCHES} colorKey="bg" />
        <ColorControl label="Панели" value={appearance.colors.panel} swatches={PANEL_SWATCHES} colorKey="panel" />
        <ColorControl label="Основной текст" value={appearance.colors.text} swatches={TEXT_SWATCHES} colorKey="text" />
        <ColorControl label="Вторичный текст" value={appearance.colors.dim} swatches={DIM_SWATCHES} colorKey="dim" />
        <ColorControl label="Акцент" value={appearance.colors.accent} swatches={ACCENT_SWATCHES} colorKey="accent" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label="Платиновый акцент"
            variant="soft"
            small
            onPress={() => setColor('accent', DEFAULT_APPEARANCE.colors.accent)}
            style={{ height: 32 }}
          />
          <Button
            label="Вернуть палитру"
            icon={RotateCcw}
            variant="ghost"
            small
            onPress={() =>
              set({
                colors: { ...DEFAULT_APPEARANCE.colors },
              })
            }
            style={{ height: 32 }}
          />
        </View>
      </Section>

      <Section title="Типографика" hint="Шрифты с поддержкой кириллицы. Масштаб текста действует на весь интерфейс.">
        <Text className="micro-label">Интерфейс</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {UI_FONTS.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              active={appearance.fontUi === font.id}
              onPress={() => set({ fontUi: font.id as FontUiId })}
            />
          ))}
        </View>
        <Text className="micro-label" style={{ marginTop: 8 }}>
          Акцентный шрифт
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {DISPLAY_FONTS.map((font) => (
            <FontCard
              key={font.id}
              font={font}
              active={appearance.fontDisplay === font.id}
              onPress={() => set({ fontDisplay: font.id as FontDisplayId })}
              display
            />
          ))}
        </View>
        <RangeControl
          label="Масштаб текста"
          value={appearance.typeScale}
          min={0.85}
          max={1.2}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) => set({ typeScale: value })}
        />
        <RangeControl
          label="Масштаб интерфейса"
          hint="Увеличивает весь интерфейс целиком, включая обложки и отступы."
          value={appearance.uiScale}
          min={0.88}
          max={1.12}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) => set({ uiScale: value })}
        />
      </Section>
    </>
  );
}

function LayoutTab() {
  const appearance = useCustomizationStore();
  const set = useCustomizationStore((state) => state.set);
  const setNavStyle = useCustomizationStore((state) => state.setNavStyle);

  return (
    <>
      <Section title="Навигация" hint="Рейл — компактная иконная колонка. Панель раскрывает плейлисты и разделы.">
        <Segmented<NavStyle>
          value={appearance.navStyle}
          options={[
            { value: 'rail', label: 'Рейл' },
            { value: 'panel', label: 'Панель' },
          ]}
          onChange={setNavStyle}
        />
        <Segmented<NavSide>
          value={appearance.navSide}
          options={[
            { value: 'left', label: 'Слева' },
            { value: 'right', label: 'Справа' },
          ]}
          onChange={(value) => set({ navSide: value })}
        />
        <RangeControl
          label="Ширина навигации"
          value={appearance.sidebarWidth}
          min={appearance.navStyle === 'rail' ? 58 : 208}
          max={appearance.navStyle === 'rail' ? 120 : 320}
          step={2}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ sidebarWidth: value })}
        />
      </Section>

      <Section title="Сцена" hint="Ширина и воздух вокруг контента. Плавающий плеер парит над сценой.">
        <RangeControl
          label="Боковые отступы"
          value={appearance.contentPadding}
          min={16}
          max={60}
          step={1}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ contentPadding: value })}
        />
        <RangeControl
          label="Максимальная ширина"
          value={appearance.contentWidth}
          min={880}
          max={1800}
          step={20}
          format={(value) => (value >= 1800 ? 'Без предела' : `${Math.round(value)} px`)}
          onChange={(value) => set({ contentWidth: value })}
        />
        <RangeControl
          label="Высота верхней панели"
          value={appearance.topbarHeight}
          min={52}
          max={86}
          step={2}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ topbarHeight: value })}
        />
        <Segmented<PlayerStyle>
          value={appearance.playerStyle}
          options={[
            { value: 'floating', label: 'Плавающий плеер' },
            { value: 'bar', label: 'Панель' },
          ]}
          onChange={(value) => set({ playerStyle: value })}
        />
        <RangeControl
          label="Высота плеера"
          value={appearance.playerHeight}
          min={72}
          max={118}
          step={2}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ playerHeight: value })}
        />
      </Section>

      <Section title="Форма" hint="Плотность влияет на строки, отступы и ритм интерфейса.">
        <RangeControl
          label="Скругление"
          value={appearance.radius}
          min={0}
          max={34}
          step={1}
          format={(value) => (value <= 2 ? 'Острые' : `${Math.round(value)} px`)}
          onChange={(value) => set({ radius: value })}
        />
        <RangeControl
          label="Плотность"
          value={appearance.density}
          min={0.82}
          max={1.18}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) => set({ density: value })}
        />
        <Text className="micro-label">Форма обложек</Text>
        <Segmented<ArtworkShape>
          value={appearance.artworkShape}
          options={[
            { value: 'soft', label: 'Мягкая' },
            { value: 'circle', label: 'Круглая' },
            { value: 'sharp', label: 'Острая' },
          ]}
          onChange={(value) => set({ artworkShape: value })}
        />
      </Section>
    </>
  );
}

function PlayerPreview({ appearance }: { appearance: ReturnType<typeof useCustomizationStore.getState> }) {
  const compact = appearance.playerLayout === 'compact';
  const coverRadius =
    appearance.playerCoverShape === 'circle'
      ? 999
      : appearance.playerCoverShape === 'sharp'
        ? 4
        : appearance.playerCoverShape === 'soft'
          ? 12
          : Math.round(16 * (appearance.radius / 16));
  return (
    <View
      className="player-preview"
      style={{
        minHeight: appearance.playerHeight,
        borderRadius: appearance.playerStyle === 'bar' ? 0 : appearance.playerRadius,
        borderWidth: 1,
        borderColor: 'var(--glass-border)',
        paddingHorizontal: compact ? 12 : 16,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: compact ? 10 : 16,
        boxShadow: 'var(--shadow-soft)',
        overflow: 'hidden',
      }}
    >
      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {appearance.playerShowArtwork ? (
          <View
            style={{
              width: Math.min(appearance.playerArtSize, 48),
              height: Math.min(appearance.playerArtSize, 48),
              borderRadius: coverRadius,
              backgroundImage: 'linear-gradient(145deg, color-mix(in srgb, var(--lilac) 52%, var(--bg)) 0%, var(--bg-soft) 100%)',
              borderWidth: 1,
              borderColor: 'color-mix(in srgb, var(--text) 9%, transparent)',
            }}
          />
        ) : null}
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 11.5, fontWeight: '650' }}>
            Ночной поток
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 9.5, marginTop: 2 }}>
            Platinum · демо
          </Text>
        </View>
        {appearance.playerShowLike ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lilac }} /> : null}
      </View>

      <View style={{ flex: 1.25, alignItems: 'center', gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 14, height: 2, borderRadius: 2, backgroundColor: colors.textFaint }} />
          <View
            style={{
              width: Math.min(34, appearance.playerControlSize),
              height: Math.min(34, appearance.playerControlSize),
              borderRadius: 999,
              backgroundColor: appearance.playerAccentPlay ? colors.lilac : colors.text,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Play size={12} color={appearance.playerAccentPlay ? colors.accentOn : colors.accentInk} fill={appearance.playerAccentPlay ? colors.accentOn : colors.accentInk} strokeWidth={0} />
          </View>
          <View style={{ width: 14, height: 2, borderRadius: 2, backgroundColor: colors.textFaint }} />
        </View>
        {appearance.playerProgress !== 'none' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
            {appearance.playerShowTime ? <Text style={{ color: colors.textFaint, fontSize: 7.5 }}>1:24</Text> : null}
            <View
              style={{
                flex: 1,
                height: appearance.playerProgress === 'pill' ? 5 : 3,
                borderRadius: 5,
                backgroundColor: colors.surfaceStrong,
                overflow: 'hidden',
              }}
            >
              <View style={{ width: '38%', height: '100%', borderRadius: 5, backgroundColor: colors.text }} />
            </View>
            {appearance.playerShowTime ? <Text style={{ color: colors.textFaint, fontSize: 7.5 }}>3:47</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: 5 }}>
        {appearance.playerShowLyrics ? <View style={{ width: 4, height: 13, borderRadius: 2, backgroundColor: colors.textFaint }} /> : null}
        {appearance.playerShowQueue ? <View style={{ width: 11, height: 9, borderRadius: 2, borderWidth: 1, borderColor: colors.textFaint }} /> : null}
        {appearance.playerShowVolume ? (
          <View style={{ width: 34, height: 3, borderRadius: 3, backgroundColor: colors.surfaceStrong, alignSelf: 'center' }}>
            <View style={{ width: '62%', height: 3, borderRadius: 3, backgroundColor: colors.text }} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PlayerTab() {
  const appearance = useCustomizationStore();
  const set = useCustomizationStore((state) => state.set);

  return (
    <>
      <Section
        title="Живой плеер"
        hint="Все изменения сразу видны здесь и в нижней панели. Плеер можно оставить минимальным или собрать под себя."
      >
        <PlayerPreview appearance={appearance} />
      </Section>

      <Section title="Геометрия" hint="Форма, высота и масштаб органов управления.">
        <Segmented<PlayerStyle>
          value={appearance.playerStyle}
          options={[
            { value: 'floating', label: 'Плавающий' },
            { value: 'bar', label: 'Панель' },
          ]}
          onChange={(value) => set({ playerStyle: value })}
        />
        <Segmented<PlayerLayout>
          value={appearance.playerLayout}
          options={[
            { value: 'classic', label: 'Классика' },
            { value: 'compact', label: 'Компактный' },
          ]}
          onChange={(value) => set({ playerLayout: value })}
        />
        <RangeControl
          label="Высота плеера"
          value={appearance.playerHeight}
          min={72}
          max={118}
          step={2}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ playerHeight: value })}
        />
        <RangeControl
          label="Скругление плеера"
          value={appearance.playerRadius}
          min={0}
          max={34}
          step={1}
          format={(value) => (value <= 2 ? 'Острые' : `${Math.round(value)} px`)}
          onChange={(value) => set({ playerRadius: value })}
        />
        <RangeControl
          label="Обложка"
          value={appearance.playerArtSize}
          min={38}
          max={68}
          step={1}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ playerArtSize: value })}
        />
        <RangeControl
          label="Кнопки и play"
          value={appearance.playerControlSize}
          min={34}
          max={52}
          step={1}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ playerControlSize: value })}
        />
      </Section>

      <Section title="Материал и обложка" hint="Плеер может быть стеклянным, плотным или тонированным акцентом.">
        <Text className="micro-label">Материал</Text>
        <Segmented<PlayerMaterial>
          value={appearance.playerMaterial}
          options={[
            { value: 'glass', label: 'Стекло' },
            { value: 'solid', label: 'Плотный' },
            { value: 'accent', label: 'Акцент' },
          ]}
          onChange={(value) => set({ playerMaterial: value })}
        />
        <Text className="micro-label" style={{ marginTop: 6 }}>
          Форма обложки
        </Text>
        <Segmented<PlayerCoverShape>
          value={appearance.playerCoverShape}
          options={[
            { value: 'global', label: 'Как везде' },
            { value: 'soft', label: 'Мягкая' },
            { value: 'circle', label: 'Круг' },
            { value: 'sharp', label: 'Острая' },
          ]}
          onChange={(value) => set({ playerCoverShape: value })}
        />
        <Toggle
          label="Акцентная кнопка play"
          hint="Лиловый акцент вместо светлой кнопки"
          value={appearance.playerAccentPlay}
          onChange={(value) => set({ playerAccentPlay: value })}
        />
      </Section>

      <Section title="Прогресс и время" hint="Полоса, пилюля или чистая панель без прогресса.">
        <Segmented<PlayerProgressStyle>
          value={appearance.playerProgress}
          options={[
            { value: 'line', label: 'Линия' },
            { value: 'pill', label: 'Пилюля' },
            { value: 'none', label: 'Скрыть' },
          ]}
          onChange={(value) => set({ playerProgress: value })}
        />
        <Segmented<PlayerTimeMode>
          value={appearance.playerTime}
          options={[
            { value: 'total', label: 'Длительность' },
            { value: 'remaining', label: 'Осталось' },
          ]}
          onChange={(value) => set({ playerTime: value })}
        />
        <Toggle
          label="Показывать время"
          hint="Отключи для максимально чистого прогресса"
          value={appearance.playerShowTime}
          onChange={(value) => set({ playerShowTime: value })}
        />
      </Section>

      <Section title="Состав" hint="Убери всё лишнее. Плеер перестроится без пустых зон.">
        <Toggle label="Обложка трека" value={appearance.playerShowArtwork} onChange={(value) => set({ playerShowArtwork: value })} />
        <Toggle label="Лайк" value={appearance.playerShowLike} onChange={(value) => set({ playerShowLike: value })} />
        <Toggle label="Перемешивание" value={appearance.playerShowShuffle} onChange={(value) => set({ playerShowShuffle: value })} />
        <Toggle label="Повтор" value={appearance.playerShowRepeat} onChange={(value) => set({ playerShowRepeat: value })} />
        <Toggle label="Текст песни" value={appearance.playerShowLyrics} onChange={(value) => set({ playerShowLyrics: value })} />
        <Toggle label="Очередь" value={appearance.playerShowQueue} onChange={(value) => set({ playerShowQueue: value })} />
        <Toggle label="Громкость" value={appearance.playerShowVolume} onChange={(value) => set({ playerShowVolume: value })} />
        <Toggle label="Развернуть" value={appearance.playerShowExpand} onChange={(value) => set({ playerShowExpand: value })} />
      </Section>

      <Section title="Экран «Сейчас играет»" hint="Отдельная театральная сцена с обложкой, текстом и очередью.">
        <Segmented<NowPlayingLayout>
          value={appearance.nowPlayingLayout}
          options={[
            { value: 'split', label: 'Сцена + панель' },
            { value: 'focus', label: 'Только фокус' },
          ]}
          onChange={(value) => set({ nowPlayingLayout: value })}
        />
        <RangeControl
          label="Масштаб обложки"
          value={appearance.nowPlayingArtScale}
          min={0.82}
          max={1.12}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(value) => set({ nowPlayingArtScale: value })}
        />
        <Toggle
          label="Живой фон из обложки"
          hint="Размытая обложка за сценой. Выключи для ровного цвета."
          value={appearance.nowPlayingBackdrop}
          onChange={(value) => set({ nowPlayingBackdrop: value })}
        />
      </Section>
    </>
  );
}

function EffectsTab() {
  const appearance = useCustomizationStore();
  const set = useCustomizationStore((state) => state.set);

  const effectCopy: Record<EffectsStyle, string> = {
    clean: 'Тихая типографика, ровный свет и ничего лишнего.',
    cinematic: 'Глубокие тени, тёплый свет и мягкое движение сцены.',
    neon: 'Холодное свечение, тонкие линии и клубная энергия.',
    aurora: 'Живые цветовые волны, которые медленно дышат за контентом.',
  };

  return (
    <>
      <Section title="Эффект сцены" hint="Атмосферный слой поверх всего интерфейса. Работает с любой палитрой.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <EffectCard
            id="clean"
            label="Clean"
            hint="Тишина и фокус"
            active={appearance.effectsStyle === 'clean'}
            onPress={() => set({ effectsStyle: 'clean' })}
          />
          <EffectCard
            id="cinematic"
            label="Cinematic"
            hint="Тёплый кинематограф"
            active={appearance.effectsStyle === 'cinematic'}
            onPress={() => set({ effectsStyle: 'cinematic' })}
          />
          <EffectCard
            id="neon"
            label="Neon"
            hint="Холодный клуб"
            active={appearance.effectsStyle === 'neon'}
            onPress={() => set({ effectsStyle: 'neon' })}
          />
          <EffectCard
            id="aurora"
            label="Aurora"
            hint="Цветовые волны"
            active={appearance.effectsStyle === 'aurora'}
            onPress={() => set({ effectsStyle: 'aurora' })}
          />
        </View>
        <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 15 }}>{effectCopy[appearance.effectsStyle]}</Text>
      </Section>

      <Section title="Стекло" hint="Прозрачность и размытие панелей, карточек и модальных окон.">
        <RangeControl
          label="Плотность стекла"
          value={appearance.glass}
          min={0}
          max={100}
          step={1}
          format={(value) => `${Math.round(value)}%`}
          onChange={(value) => set({ glass: value })}
        />
        <RangeControl
          label="Размытие"
          value={appearance.blur}
          min={0}
          max={48}
          step={1}
          format={(value) => `${Math.round(value)} px`}
          onChange={(value) => set({ blur: value })}
        />
      </Section>

      <Section title="Атмосфера" hint="Свет, зерно и размытая обложка текущего трека на фоне.">
        <RangeControl
          label="Свечение"
          value={appearance.glow}
          min={0}
          max={100}
          step={1}
          format={(value) => `${Math.round(value)}%`}
          onChange={(value) => set({ glow: value })}
        />
        <RangeControl
          label="Зерно"
          value={appearance.grain}
          min={0}
          max={100}
          step={1}
          format={(value) => `${Math.round(value)}%`}
          onChange={(value) => set({ grain: value })}
        />
        <RangeControl
          label="Фон из обложки"
          value={appearance.backdrop}
          min={0}
          max={100}
          step={1}
          format={(value) => `${Math.round(value)}%`}
          onChange={(value) => set({ backdrop: value })}
        />
        <Toggle
          label="Ореол обложки"
          hint="Мягкое цветное свечение вокруг текущего альбома"
          value={appearance.coverGlow}
          onChange={(value) => set({ coverGlow: value })}
        />
        <Toggle
          label="Живые сферы"
          hint="Плавно дышащие пятна света на фоне"
          value={appearance.animatedOrbs}
          onChange={(value) => set({ animatedOrbs: value })}
        />
      </Section>

      <Section title="Производительность" hint="Лёгкий режим для слабых GPU и ноутбуков на батарее.">
        <Toggle
          label="Режим производительности"
          hint="Отключает размытие, зерно, фоновые сферы и тяжёлые свечения"
          value={appearance.performance}
          onChange={(value) => set({ performance: value })}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: appearance.performance ? 'var(--accent-line)' : colors.border,
            backgroundColor: appearance.performance ? 'var(--accent-soft)' : colors.surface,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <Gauge size={14} color={appearance.performance ? colors.lilac : colors.textFaint} />
          <Text style={{ color: colors.textFaint, fontSize: 10.5, flex: 1, lineHeight: 15 }}>
            {appearance.performance
              ? 'Активен: интерфейс рисуется быстрее, эффекты упрощены. Настройки сцены сохранены.'
              : 'Выключен: полное стекло, свет и атмосфера.'}
          </Text>
        </View>
      </Section>
    </>
  );
}

function MotionTab() {
  const appearance = useCustomizationStore();
  const set = useCustomizationStore((state) => state.set);

  return (
    <>
      <Section title="Движение" hint="Единая скорость для появления экранов, наведения, модальных окон и текста песен.">
        <Toggle
          label="Анимации включены"
          hint="Отключи для мгновенных переходов"
          value={appearance.animations}
          onChange={(value) => set({ animations: value })}
        />
        <RangeControl
          label="Скорость"
          value={appearance.motion}
          min={0.35}
          max={2.5}
          step={0.05}
          format={(value) => `${value.toFixed(2)}×`}
          onChange={(value) => set({ motion: value })}
        />
        <Text className="micro-label">Характер</Text>
        <Segmented<MotionEase>
          value={appearance.motionEase}
          options={[
            { value: 'smooth', label: 'Плавный' },
            { value: 'spring', label: 'Пружинный' },
            { value: 'soft', label: 'Сдержанный' },
          ]}
          onChange={(value) => set({ motionEase: value })}
        />
        <View
          className="glass"
          style={{
            borderRadius: 14,
            padding: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            marginTop: 4,
          }}
        >
          <View
            className="eq"
            style={{ color: colors.lilac, height: 26, alignItems: 'flex-end' }}
          >
            <View />
            <View />
            <View />
            <View />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>Живой ритм</Text>
            <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 2 }}>
              Так анимируются обложки, полосы и переходы.
            </Text>
          </View>
          <Text style={{ color: colors.lilac, fontSize: 12, fontWeight: '700' }}>{appearance.animations ? `${appearance.motion.toFixed(2)}×` : 'выкл'}</Text>
        </View>
      </Section>

      <Section title="Сброс" hint="Вернуть стандартное оформление Platinum, включая макет и движение.">
        <Button
          label="Сбросить всё оформление"
          icon={RotateCcw}
          variant="outline"
          small
          onPress={() => {
            useCustomizationStore.getState().reset();
            useUiStore.getState().toast('Оформление сброшено', 'success');
          }}
          style={{ alignSelf: 'flex-start' }}
        />
      </Section>
    </>
  );
}

function EngineTab() {
  const ytdlp = useRuntimeStore((state) => state.ytdlp);
  const info = useRuntimeStore((state) => state.info);
  const stateLabel =
    ytdlp?.state === 'ready'
      ? 'Готов'
      : ytdlp?.state === 'downloading'
        ? `Загрузка ${ytdlp.progress}%`
        : ytdlp?.state === 'error'
          ? 'Ошибка'
          : 'Подготовка…';

  return (
    <>
      <Section title="Движок YouTube" hint="Platinum использует локальный yt-dlp. VPN не требуется.">
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: ytdlp?.state === 'ready' ? colors.mint : ytdlp?.state === 'error' ? colors.danger : colors.gold,
                boxShadow: ytdlp?.state === 'ready' ? '0 0 10px var(--mint)' : undefined,
              }}
            />
            <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600', flex: 1 }}>Статус</Text>
            <Text style={{ color: ytdlp?.state === 'error' ? colors.danger : colors.textDim, fontSize: 10.5 }}>{stateLabel}</Text>
          </View>
          <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 8, lineHeight: 16 }}>
            {ytdlp?.version ? `yt-dlp ${ytdlp.version}` : 'Автоматическая загрузка бинарника yt-dlp'}
          </Text>
          {ytdlp?.state === 'downloading' ? (
            <View style={{ height: 3, borderRadius: 3, backgroundColor: colors.surfaceStrong, marginTop: 11, overflow: 'hidden' }}>
              <View style={{ height: 3, width: `${Math.max(2, ytdlp.progress)}%`, backgroundColor: colors.lilac, borderRadius: 3 }} />
            </View>
          ) : null}
          {ytdlp?.state === 'error' ? (
            <Text style={{ color: colors.danger, fontSize: 10.5, marginTop: 9 }}>{ytdlp.error || 'Не удалось скачать yt-dlp'}</Text>
          ) : null}
          {ytdlp?.path ? (
            <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 9.5, marginTop: 10, opacity: 0.8 }}>
              {ytdlp.path}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            <Button
              label={ytdlp?.state === 'downloading' ? 'Обновляется…' : 'Обновить движок'}
              icon={RefreshCw}
              variant="soft"
              small
              onPress={() => void useRuntimeStore.getState().updateYtdlp()}
              disabled={ytdlp?.state === 'downloading'}
            />
            {ytdlp?.path ? (
              <Button label="Показать файл" icon={FolderOpen} variant="ghost" small onPress={() => void window.platinum?.showItem(ytdlp.path!)} />
            ) : null}
          </View>
        </View>
        <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 16 }}>
          {info?.isDev ? 'Режим разработки' : 'Стабильная сборка'} · {info?.platform || 'linux'} · музыка остаётся на этом устройстве.
        </Text>
      </Section>
    </>
  );
}

function DataTab() {
  const info = useRuntimeStore((state) => state.info);
  return (
    <>
      <Section title="Локальные данные" hint="Аккаунты, история, плейлисты и настройки хранятся только на этом компьютере.">
        <MenuRow
          icon={Download}
          label="Папка загрузок"
          hint={info?.downloadsDir ? 'открыть' : ''}
          onPress={() => info && void window.platinum?.openPath(info.downloadsDir)}
        />
        <MenuRow
          icon={FolderOpen}
          label="Данные приложения"
          hint={info?.userData ? 'открыть' : ''}
          onPress={() => info && void window.platinum?.openPath(info.userData)}
        />
      </Section>
      <Section title="Приватность" hint="Platinum не отправляет историю прослушивания на серверы.">
        <Text style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 18 }}>
          Потоки запрашиваются напрямую у YouTube через yt-dlp. Аккаунты, токены и плейлисты не покидают устройство.
          Текст песен загружается с LRCLIB только при открытии трека.
        </Text>
      </Section>
    </>
  );
}

function AccountTab() {
  const user = useAuthStore((state) => state.user);
  const close = () => useUiStore.getState().setSettingsOpen(false);
  return (
    <>
      <Section title="Профиль" hint="Локальный аккаунт без облака и подписок.">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Avatar name={user?.displayName || 'Гость'} accent={user?.accent || '#C9B8FF'} size={48} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '650' }}>{user?.displayName || 'Гость'}</Text>
            <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 3 }}>
              {user?.isGuest ? 'Гостевой режим' : `@${user?.username || 'platinum'}`}
            </Text>
          </View>
          <Button label="Профиль" variant="soft" small onPress={() => { close(); useUiStore.getState().navigate({ name: 'account' }); }} />
        </View>
        <MenuRow
          icon={LogOut}
          label={`Выйти${user?.isGuest ? ' из гостевого режима' : ''}`}
          danger
          onPress={async () => {
            close();
            await useAuthStore.getState().logout();
          }}
        />
      </Section>
    </>
  );
}

function AboutTab() {
  const info = useRuntimeStore((state) => state.info);
  return (
    <>
      <Section title="Platinum" hint="Премиальный локальный плеер, собранный вокруг твоей музыки.">
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundImage:
              'radial-gradient(110% 130% at 12% 0%, var(--accent-soft) 0%, transparent 58%), linear-gradient(150deg, var(--surface) 0%, transparent 100%)',
            padding: 22,
          }}
        >
          <LogoLockup size={44} note="LOCAL MUSIC SYSTEM" />
          <Text style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 12 }}>
            Версия {info?.version || '0.1.0'} · React Native · Electron · SQLite
          </Text>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 18 }}>
            {['LOCAL FIRST', 'YT-DLP', 'LRCLIB'].map((tag) => (
              <View
                key={tag}
                style={{
                  paddingHorizontal: 8,
                  height: 22,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.textFaint, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 }}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 17 }}>
          Потоки YouTube доступны только для личного прослушивания. Проект не связан с YouTube. Обложки, тексты и
          метаданные принадлежат их правообладателям.
        </Text>
      </Section>
    </>
  );
}

export function SettingsModal() {
  const open = useUiStore((state) => state.settingsOpen);
  const [tab, setTab] = useState<Tab>('appearance');
  const { width, height } = useWindowDimensions();
  const info = useRuntimeStore((state) => state.info);
  const reset = useCustomizationStore((state) => state.reset);
  const toast = useUiStore((state) => state.toast);

  useEffect(() => {
    if (!open) return;
    void useRuntimeStore.getState().refreshYtdlp();
    void useRuntimeStore.getState().loadInfo();
  }, [open]);

  const shellHeight = Math.min(780, Math.max(500, height - 138));
  const modalWidth = Math.min(980, width - 64);

  const content = useMemo(() => {
    switch (tab) {
      case 'appearance':
        return <AppearanceTab />;
      case 'player':
        return <PlayerTab />;
      case 'layout':
        return <LayoutTab />;
      case 'effects':
        return <EffectsTab />;
      case 'motion':
        return <MotionTab />;
      case 'engine':
        return <EngineTab />;
      case 'data':
        return <DataTab />;
      case 'account':
        return <AccountTab />;
      case 'about':
        return <AboutTab />;
      default:
        return null;
    }
  }, [tab]);

  if (!open) return null;
  const close = () => useUiStore.getState().setSettingsOpen(false);

  return (
    <Modal onClose={close} width={modalWidth} panelStyle={{ padding: 0, height: shellHeight, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, height: 76, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <LogoMark size={34} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '650', letterSpacing: -0.5 }}>Настройки</Text>
          <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 2 }}>
            Оформление, макет и движение · изменения применяются сразу
          </Text>
        </View>
        <Button
          label="Сбросить"
          icon={RotateCcw}
          variant="ghost"
          small
          onPress={() => {
            reset();
            toast('Оформление сброшено', 'success');
          }}
          style={{ height: 32, paddingHorizontal: 11 }}
        />
        <IconButton icon={X} onPress={close} label="Закрыть настройки" />
      </View>

      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        <View
          style={{
            width: 198,
            flexShrink: 0,
            borderRightWidth: 1,
            borderRightColor: colors.border,
            padding: 14,
            gap: 3,
            backgroundColor: 'color-mix(in srgb, var(--bg) 14%, transparent)',
          }}
        >
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = item.id === tab;
            return (
              <Pressable
                key={item.id}
                onPress={() => setTab(item.id)}
                className={`settings-tab ${active ? 'is-active' : ''}`}
              >
                <Icon size={15} color={active ? colors.text : colors.textFaint} strokeWidth={active ? 1.9 : 1.6} />
                <Text style={{ color: active ? colors.text : colors.textDim, fontSize: 11.5, fontWeight: active ? '600' : '500' }}>
                  {item.label}
                </Text>
                {active ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lilac, marginLeft: 'auto' }} /> : null}
              </Pressable>
            );
          })}
          <View style={{ flex: 1 }} />
          <View style={{ paddingHorizontal: 5, paddingBottom: 4 }}>
            <Text style={{ color: colors.textFaint, fontSize: 9, lineHeight: 14 }}>
              Platinum {info?.version || '0.1.0'}
              {'\n'}local music system
            </Text>
          </View>
        </View>

        <ScrollView
          className="settings-scroll no-scrollbar"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 26,
            paddingTop: 22,
            paddingBottom: 30,
            maxWidth: 760,
            width: '100%',
            alignSelf: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      </View>
    </Modal>
  );
}
