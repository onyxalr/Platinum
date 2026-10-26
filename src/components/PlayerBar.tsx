import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  AudioLines,
  Heart,
  ListMusic,
  Maximize2,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { useCustomizationStore, type Appearance } from '../store/customization';
import { colors } from '../theme';
import { fmtTime } from '../lib/format';
import { Artwork, Eq, IconButton, PlayGlyph, Slider, Spinner } from './ui';
import { LogoMark } from './Logo';

function PlayerProgress({ appearance }: { appearance: Appearance }) {
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
  if (appearance.playerProgress === 'none') return null;

  const timeWidth = appearance.playerTime === 'remaining' ? 40 : 36;
  const timeStyle = {
    color: colors.textFaint,
    fontSize: 10,
    width: timeWidth,
    textAlign: 'right' as const,
    fontVariant: ['tabular-nums'] as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: appearance.playerLayout === 'compact' ? 7 : 10, width: '100%' }}>
      {appearance.playerShowTime ? <Text style={timeStyle}>{fmtTime(position)}</Text> : null}
      <View style={{ flex: 1 }}>
        <Slider
          value={ratio}
          onChange={(value) => {
            if (duration > 0) usePlayerStore.getState().seek(value * duration);
          }}
          height={appearance.playerProgress === 'pill' ? 5 : 3}
          color={colors.text}
          mutedColor="var(--surface-strong)"
        />
      </View>
      {appearance.playerShowTime ? (
        <Text style={{ ...timeStyle, textAlign: 'left' as const }}>
          {appearance.playerTime === 'remaining'
            ? `-${fmtTime(Math.max(0, duration - position))}`
            : fmtTime(duration)}
        </Text>
      ) : null}
    </View>
  );
}

export function PlayerBar() {
  const current = usePlayerStore((state) => state.current);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const buffering = usePlayerStore((state) => state.buffering);
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const error = usePlayerStore((state) => state.error);
  const liked = usePlayerStore((state) => (state.current ? !!state.liked[state.current.id] : false));
  const appearance = useCustomizationStore();

  const openPlayer = () => {
    if (current) useUiStore.getState().openPlayer('lyrics');
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const compact = appearance.playerLayout === 'compact';
  const artSize = Math.max(32, Math.min(appearance.playerArtSize, appearance.playerHeight - 24));
  const playSize = Math.max(34, Math.min(appearance.playerControlSize, appearance.playerHeight - 26));
  const sideSize = Math.max(28, Math.round(playSize * 0.74));
  const showRight = appearance.playerShowLyrics || appearance.playerShowQueue || appearance.playerShowVolume || appearance.playerShowExpand;
  const playBackground = appearance.playerAccentPlay ? colors.lilac : colors.text;
  const playInk = appearance.playerAccentPlay ? colors.accentOn : colors.accentInk;

  return (
    <View
      className="playerbar no-drag"
      style={{
        paddingHorizontal: compact ? 14 : 18,
        paddingVertical: 6,
        gap: compact ? 12 : 18,
        zIndex: 30,
      }}
    >
      <View
        style={{
          flex: 1,
          minWidth: compact ? 175 : 200,
          maxWidth: compact ? 310 : 340,
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 9 : 12,
        }}
      >
        {current ? (
          <>
            {appearance.playerShowArtwork ? (
              <Pressable onPress={openPlayer} className="cover-card no-drag" style={{ borderRadius: 12 }}>
                <Artwork uri={current.thumbnail} seed={current.title} size={artSize} radius={12} className="player-artwork" />
              </Pressable>
            ) : null}
            <Pressable onPress={openPlayer} className="no-drag" style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: -0.15 }}>
                {current.title}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
                {error ? (
                  <Text numberOfLines={1} style={{ color: colors.danger, fontSize: 11 }}>
                    {error}
                  </Text>
                ) : (
                  <>
                    {isPlaying && !compact ? <Eq paused={!isPlaying} color={colors.lilac} /> : null}
                    <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5, flexShrink: 1 }}>
                      {current.artist}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
            {appearance.playerShowLike ? (
              <IconButton
                icon={Heart}
                size={16}
                buttonSize={30}
                label={liked ? 'Убрать из любимого' : 'В любимое'}
                iconColor={liked ? colors.lilac : colors.textFaint}
                onPress={() => void usePlayerStore.getState().toggleLike()}
              />
            ) : null}
          </>
        ) : (
          <>
            <LogoMark size={artSize} glow />
            <View>
              <Text style={{ color: colors.textDim, fontSize: 12.5, fontWeight: '550' }}>Ничего не играет</Text>
              <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 2 }}>Выбери трек — и в путь</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flex: 1.5, alignItems: 'center', gap: compact ? 1 : 3, maxWidth: compact ? 500 : 560 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 3 : 6 }}>
          {appearance.playerShowShuffle ? (
            <IconButton
              icon={Shuffle}
              size={15}
              buttonSize={sideSize}
              label="Перемешать"
              disabled={!current}
              active={shuffle}
              iconColor={shuffle ? colors.lilac : colors.textDim}
              onPress={() => usePlayerStore.getState().toggleShuffle()}
            />
          ) : null}
          <IconButton
            icon={SkipBack}
            size={18}
            buttonSize={sideSize + 2}
            label="Предыдущий"
            disabled={!current}
            onPress={() => usePlayerStore.getState().prev()}
          />
          <Pressable
            onPress={() => usePlayerStore.getState().toggle()}
            disabled={!current}
            className="round-play no-drag"
            style={{
              width: playSize,
              height: playSize,
              borderRadius: playSize,
              backgroundColor: playBackground,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: current ? 1 : 0.35,
              boxShadow: appearance.playerAccentPlay ? '0 8px 26px color-mix(in srgb, var(--lilac) 28%, transparent)' : undefined,
            }}
          >
            {buffering && current ? (
              <Spinner size={Math.round(playSize * 0.4)} color={playInk} />
            ) : (
              <PlayGlyph playing={isPlaying} size={Math.round(playSize * 0.4)} color={playInk} />
            )}
          </Pressable>
          <IconButton
            icon={SkipForward}
            size={18}
            buttonSize={sideSize + 2}
            label="Следующий"
            disabled={!current}
            onPress={() => usePlayerStore.getState().next()}
          />
          {appearance.playerShowRepeat ? (
            <IconButton
              icon={repeat === 'one' ? Repeat1 : Repeat}
              size={15}
              buttonSize={sideSize}
              label="Повтор"
              disabled={!current}
              active={repeat !== 'off'}
              iconColor={repeat !== 'off' ? colors.lilac : colors.textDim}
              onPress={() => usePlayerStore.getState().cycleRepeat()}
            />
          ) : null}
        </View>
        <PlayerProgress appearance={appearance} />
      </View>

      {showRight ? (
        <View
          style={{
            flex: 1,
            minWidth: compact ? 120 : 200,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: compact ? 0 : 2,
          }}
        >
          {appearance.playerShowLyrics ? (
            <IconButton
              icon={AudioLines}
              size={17}
              buttonSize={compact ? 30 : 34}
              label="Текст песни"
              disabled={!current}
              onPress={() => useUiStore.getState().openPlayer('lyrics')}
            />
          ) : null}
          {appearance.playerShowQueue ? (
            <IconButton
              icon={ListMusic}
              size={17}
              buttonSize={compact ? 30 : 34}
              label="Очередь"
              disabled={!current}
              onPress={() => useUiStore.getState().openPlayer('queue')}
            />
          ) : null}
          {appearance.playerShowVolume ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: compact ? 2 : 6, width: compact ? 64 : 108 }}>
              <IconButton
                icon={VolumeIcon}
                size={17}
                buttonSize={30}
                label="Звук"
                onPress={() => usePlayerStore.getState().toggleMute()}
              />
              {compact ? null : (
                <View style={{ flex: 1 }}>
                  <Slider
                    value={muted ? 0 : volume}
                    onChange={(value) => usePlayerStore.getState().setVolume(value)}
                    height={3}
                    color={colors.text}
                    mutedColor="var(--surface-strong)"
                  />
                </View>
              )}
            </View>
          ) : null}
          {appearance.playerShowExpand ? (
            <IconButton
              icon={Maximize2}
              size={16}
              buttonSize={compact ? 30 : 34}
              label="Развернуть"
              disabled={!current}
              onPress={openPlayer}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
