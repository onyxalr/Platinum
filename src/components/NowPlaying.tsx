import React from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { Track } from '@shared/types';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { useCustomizationStore, type Appearance } from '../store/customization';
import { colors, fonts } from '../theme';
import { fmtTime } from '../lib/format';
import { downloadTrack } from '../lib/actions';
import { Artwork, Eq, IconButton, PlayGlyph, Slider, Spinner } from './ui';
import { LyricsPane } from './Lyrics';

function NowProgress({ appearance }: { appearance: Appearance }) {
  const position = usePlayerStore((state) => state.position);
  const duration = usePlayerStore((state) => state.duration);
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
  if (appearance.playerProgress === 'none') return null;
  return (
    <View>
      <Slider
        value={ratio}
        onChange={(value) => {
          if (duration > 0) usePlayerStore.getState().seek(value * duration);
        }}
        height={appearance.playerProgress === 'pill' ? 5 : 3}
        color={colors.text}
        mutedColor={colors.borderStrong}
      />
      {appearance.playerShowTime ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
          <Text style={{ color: colors.textFaint, fontSize: 10, fontVariant: ['tabular-nums'] }}>{fmtTime(position)}</Text>
          <Text style={{ color: colors.textFaint, fontSize: 10, fontVariant: ['tabular-nums'] }}>
            {appearance.playerTime === 'remaining' ? `-${fmtTime(Math.max(0, duration - position))}` : fmtTime(duration)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function QueuePane() {
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.index);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6 }}>
          ОЧЕРЕДЬ · {queue.length}
        </Text>
        <Pressable onPress={() => usePlayerStore.getState().clearQueue()} className="link-hover">
          <Text style={{ color: colors.textFaint, fontSize: 10.5 }}>Очистить</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }} className="no-scrollbar">
        {queue.map((track, itemIndex) => {
          const active = itemIndex === index;
          return (
            <Pressable
              key={`${track.id}-${itemIndex}`}
              onPress={() => usePlayerStore.getState().playQueue(queue, itemIndex)}
              className="track-row"
              style={{
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 11,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                backgroundColor: active ? colors.surfaceStrong : 'transparent',
              }}
            >
              <View style={{ position: 'relative' }}>
                <Artwork uri={track.thumbnail} seed={track.title} size={38} radius={8} />
                {active ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      borderRadius: 8,
                      backgroundColor: 'color-mix(in srgb, var(--bg) 50%, transparent)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Eq paused={!isPlaying} color={colors.lilac} />
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: active ? colors.lilac : colors.text, fontSize: 12.5, fontWeight: '550' }}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 2 }}>
                  {track.artist}
                </Text>
              </View>
              <Text style={{ color: colors.textFaint, fontSize: 10, fontVariant: ['tabular-nums'] }}>{fmtTime(track.duration)}</Text>
              <IconButton
                icon={X}
                size={13}
                buttonSize={26}
                label="Убрать из очереди"
                onPress={() => usePlayerStore.getState().removeFromQueue(itemIndex)}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon: Icon,
  label,
  active,
  onPress,
}: {
  icon: typeof Heart;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className="icon-btn no-drag"
      style={{
        width: 38,
        height: 38,
        borderRadius: 38,
        borderWidth: 1,
        borderColor: active ? 'var(--accent-line)' : colors.border,
        backgroundColor: active ? 'var(--accent-soft)' : colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={16} color={active ? colors.lilac : colors.textDim} strokeWidth={1.7} />
    </Pressable>
  );
}

export function NowPlaying() {
  const current = usePlayerStore((state) => state.current);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const buffering = usePlayerStore((state) => state.buffering);
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const liked = usePlayerStore((state) => (state.current ? !!state.liked[state.current.id] : false));
  const queueLength = usePlayerStore((state) => state.queue.length);
  const tab = useUiStore((state) => state.playerTab);
  const appearance = useCustomizationStore();
  const { height } = useWindowDimensions();
  const compact = height < 850;
  const focus = appearance.nowPlayingLayout === 'focus';
  const artBase = compact ? 272 : 360;
  const artSize = Math.round(Math.min(compact ? 318 : 398, artBase * appearance.nowPlayingArtScale));
  const artFrame = Math.round(artSize * 1.055);
  const playSize = compact ? 50 : 58;
  const playBackground = appearance.playerAccentPlay ? colors.lilac : colors.text;

  if (!current) return null;

  return (
    <View
      className="now-playing"
      style={{
        position: 'fixed',
        top: 42,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 60,
        backgroundColor: colors.bg,
        overflow: 'hidden',
      }}
    >
      {appearance.nowPlayingBackdrop ? (
        <>
          <View
            className="now-backdrop"
            style={{
              position: 'absolute',
              top: -140,
              right: -140,
              bottom: -140,
              left: -140,
              backgroundImage: `url("${current.thumbnail}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(90px) saturate(115%)',
              opacity: 0.4,
              transform: 'scale(1.2)',
              willChange: 'filter',
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundImage:
                'radial-gradient(90% 90% at 20% 10%, color-mix(in srgb, var(--bg) 25%, transparent) 0%, color-mix(in srgb, var(--bg) 72%, transparent) 55%, color-mix(in srgb, var(--bg) 96%, transparent) 100%)',
            }}
          />
        </>
      ) : null}

      <View style={{ flex: 1, paddingHorizontal: 42, paddingTop: 18, paddingBottom: 26 }}>
        <View style={{ height: 46, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <IconButton icon={ChevronDown} size={19} buttonSize={34} label="Свернуть" onPress={() => useUiStore.getState().closePlayer()} />
          <View>
            <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 2.2 }}>СЕЙЧАС ИГРАЕТ</Text>
            <Text style={{ color: colors.textDim, fontSize: 10.5, marginTop: 2 }}>Platinum · персональный поток</Text>
          </View>
          <View style={{ flex: 1 }} />
          <ActionButton icon={Download} label="Скачать" onPress={() => downloadTrack(current)} />
          <ActionButton icon={MoreHorizontal} label="Ещё" onPress={() => useUiStore.getState().setTrackMenu(current)} />
          <IconButton icon={X} size={17} label="Закрыть" onPress={() => useUiStore.getState().closePlayer()} />
        </View>

        <View style={{ flex: 1, flexDirection: 'row', justifyContent: focus ? 'center' : 'flex-start', gap: 54, alignItems: 'stretch' }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="no-scrollbar"
            style={{ width: focus ? 440 : 398, flexGrow: 0 }}
            contentContainerStyle={{ paddingBottom: 10, alignItems: focus ? 'center' : 'stretch' }}
          >
            <View
              className="now-art"
              style={{
                marginTop: compact ? 2 : 8,
                width: Math.max(artFrame + 18, 380),
                height: artSize + (compact ? 12 : 20),
                alignSelf: 'center',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Artwork
                uri={current.thumbnail}
                seed={current.title}
                size={artFrame}
                radius={240}
                className="cover-glow"
                style={{ position: 'absolute', opacity: 0.55 }}
              />
              <Artwork
                uri={current.thumbnail}
                seed={current.title}
                size={artFrame}
                radius={compact ? 18 : 22}
                style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.65)' }}
              />
            </View>

            <Text
              numberOfLines={2}
              style={{
                color: colors.text,
                fontSize: compact ? 22 : 27,
                lineHeight: compact ? 27 : 33,
                fontWeight: '680',
                letterSpacing: -1,
                marginTop: compact ? 15 : 24,
                textAlign: focus ? 'center' : 'left',
                alignSelf: focus ? 'center' : 'stretch',
                maxWidth: focus ? 430 : undefined,
              }}
            >
              {current.title}
            </Text>
            <Pressable
              onPress={() => {
                useUiStore.getState().navigate({ name: 'artist', artist: current.channelName || current.artist });
              }}
              className="link-hover"
              style={{ alignSelf: focus ? 'center' : 'flex-start', marginTop: compact ? 4 : 7 }}
            >
              <Text style={{ color: colors.textDim, fontSize: compact ? 12.5 : 13.5, fontWeight: '500' }}>{current.artist}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: focus ? 'center' : 'flex-start', gap: 9, marginTop: compact ? 12 : 18 }}>
              <ActionButton
                icon={Heart}
                label="В любимое"
                active={liked}
                onPress={() => void usePlayerStore.getState().toggleLike(current)}
              />
              <ActionButton icon={ListPlus} label="В плейлист" onPress={() => useUiStore.getState().setPickerTrack(current)} />
              <ActionButton icon={Download} label="Скачать" onPress={() => downloadTrack(current)} />
              <ActionButton icon={ListMusic} label="Очередь" onPress={() => useUiStore.getState().setPlayerTab('queue')} />
              <View style={{ flex: 1 }} />
              <Text style={{ color: colors.textFaint, fontSize: 9.5, letterSpacing: 1.2, fontWeight: '600' }}>AAC · HIGH</Text>
            </View>

            <View style={{ marginTop: compact ? 16 : 26 }}>
              <NowProgress appearance={appearance} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginTop: compact ? 14 : 18 }}>
              {appearance.playerShowShuffle ? (
                <IconButton
                  icon={Shuffle}
                  size={17}
                  buttonSize={36}
                  label="Перемешать"
                  active={shuffle}
                  iconColor={shuffle ? colors.lilac : colors.textDim}
                  onPress={() => usePlayerStore.getState().toggleShuffle()}
                />
              ) : null}
              <IconButton icon={SkipBack} size={22} buttonSize={40} label="Предыдущий" onPress={() => usePlayerStore.getState().prev()} />
              <Pressable
                onPress={() => usePlayerStore.getState().toggle()}
                className="round-play no-drag"
                style={{
                  width: playSize,
                  height: playSize,
                  borderRadius: playSize,
                  backgroundColor: playBackground,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: appearance.playerAccentPlay ? '0 10px 32px color-mix(in srgb, var(--lilac) 32%, transparent)' : undefined,
                }}
              >
                {buffering ? (
                  <Spinner size={compact ? 19 : 22} color={appearance.playerAccentPlay ? colors.accentOn : colors.accentInk} />
                ) : (
                  <PlayGlyph
                    playing={isPlaying}
                    size={compact ? 19 : 22}
                    color={appearance.playerAccentPlay ? colors.accentOn : colors.accentInk}
                  />
                )}
              </Pressable>
              <IconButton icon={SkipForward} size={22} buttonSize={40} label="Следующий" onPress={() => usePlayerStore.getState().next()} />
              {appearance.playerShowRepeat ? (
                <IconButton
                  icon={repeat === 'one' ? Repeat1 : Repeat}
                  size={17}
                  buttonSize={36}
                  label="Повтор"
                  active={repeat !== 'off'}
                  iconColor={repeat !== 'off' ? colors.lilac : colors.textDim}
                  onPress={() => usePlayerStore.getState().cycleRepeat()}
                />
              ) : null}
            </View>
          </ScrollView>

          {!focus ? (
          <View
            style={{
              flex: 1,
              minWidth: 300,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              padding: 26,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}>
              {[
                { id: 'lyrics' as const, label: 'Текст' },
                { id: 'queue' as const, label: `Очередь · ${queueLength}` },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => useUiStore.getState().setPlayerTab(item.id)}
                  className="tab-pill"
                  style={{
                    height: 30,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    justifyContent: 'center',
                    backgroundColor: tab === item.id ? colors.surfaceStrong : 'transparent',
                    borderWidth: 1,
                    borderColor: tab === item.id ? colors.borderStrong : 'transparent',
                  }}
                >
                  <Text style={{ color: tab === item.id ? colors.text : colors.textFaint, fontSize: 11.5, fontWeight: '600' }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
              <View style={{ flex: 1 }} />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  height: 22,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                }}
              >
                <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: current.verified ? colors.lilac : colors.textFaint }} />
                <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '600', letterSpacing: 0.8 }}>
                  {current.verified ? 'ПРОВЕРЕН' : 'КАТАЛОГ'}
                </Text>
              </View>
            </View>
            {tab === 'lyrics' ? <LyricsPane key={current.id} track={current} /> : <QueuePane />}
          </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
