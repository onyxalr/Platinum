import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { BadgeCheck, MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import type { Track } from '@shared/types';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors } from '../theme';
import { fmtTime } from '../lib/format';
import { Artwork, Eq } from './ui';

function openArtist(event: any, track: Track) {
  event?.stopPropagation?.();
  const artist = track.channelName || track.artist;
  if (artist) useUiStore.getState().navigate({ name: 'artist', artist });
}

export const TrackCard = React.memo(function TrackCard({
  track,
  queue,
  width = 174,
}: {
  track: Track;
  queue: Track[];
  width?: number;
}) {
  const active = usePlayerStore((state) => state.current?.id === track.id);
  const playing = usePlayerStore((state) => state.isPlaying && state.current?.id === track.id);

  const play = () => {
    if (active) usePlayerStore.getState().toggle();
    else usePlayerStore.getState().playTrack(track, queue);
  };

  return (
    <View style={{ width }} className="cover-card">
      <View style={{ position: 'relative', width, height: width }}>
        <Artwork uri={track.thumbnail} seed={track.title} size={width} radius={16} />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            borderRadius: 16,
            backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        <Pressable
          onPress={play}
          className="cover-play no-drag"
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            width: 38,
            height: 38,
            borderRadius: 38,
            backgroundColor: 'rgba(244,242,238,0.94)',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 22px rgba(0,0,0,0.5)',
          }}
        >
          {playing ? <Pause size={15} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} /> : <Play size={15} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />}
        </Pressable>
        <View
          style={{
            position: 'absolute',
            left: 10,
            bottom: 12,
            paddingHorizontal: 7,
            height: 20,
            borderRadius: 6,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.9,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 9.5, fontVariant: ['tabular-nums'] }}>
            {fmtTime(track.duration)}
          </Text>
        </View>
        {active ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              height: 22,
              paddingHorizontal: 8,
              borderRadius: 7,
              backgroundColor: 'rgba(7,7,8,0.72)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Eq paused={!playing} color={colors.lilac} />
          </View>
        ) : null}
      </View>
      <Pressable onPress={play} className="no-drag" style={{ marginTop: 10 }}>
        <Text numberOfLines={1} style={{ color: active ? colors.lilac : colors.text, fontSize: 13, fontWeight: '600', letterSpacing: -0.2 }}>
          {track.title}
        </Text>
      </Pressable>
      <Pressable
        onPress={(event: any) => openArtist(event, track)}
        className="artist-link no-drag"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, alignSelf: 'flex-start', maxWidth: '100%' }}
      >
        <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5 }}>
          {track.artist}
        </Text>
        {track.verified ? <BadgeCheck size={11} color={colors.lilac} strokeWidth={2.2} /> : null}
      </Pressable>
    </View>
  );
});

export const TrackRow = React.memo(function TrackRow({
  track,
  queue,
  index,
  onRemove,
  showArtwork = true,
  compact = false,
}: {
  track: Track;
  queue?: Track[];
  index?: number;
  onRemove?: (track: Track) => void;
  showArtwork?: boolean;
  compact?: boolean;
}) {
  const active = usePlayerStore((state) => state.current?.id === track.id);
  const playing = usePlayerStore((state) => state.isPlaying && state.current?.id === track.id);
  const liked = usePlayerStore((state) => !!state.liked[track.id]);

  const play = () => {
    if (active) usePlayerStore.getState().toggle();
    else usePlayerStore.getState().playTrack(track, queue ?? [track]);
  };

  return (
    <Pressable
      onPress={play}
      className={`track-row no-drag ${active ? 'is-active' : ''}`}
      style={{
        height: compact ? 50 : 58,
        borderRadius: 12,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: active ? 'var(--row-active)' : 'transparent',
      }}
    >
      {index !== undefined ? (
        <View style={{ width: 24, alignItems: 'center', justifyContent: 'center' }}>
          {active ? (
            <Eq paused={!playing} color={colors.lilac} />
          ) : (
            <Text className="row-index" style={{ color: colors.textFaint, fontSize: 11, fontVariant: ['tabular-nums'] }}>
              {String(index + 1).padStart(2, '0')}
            </Text>
          )}
        </View>
      ) : null}

      {showArtwork ? (
        <View style={{ position: 'relative' }}>
          <Artwork uri={track.thumbnail} seed={track.title} size={compact ? 36 : 42} radius={9} />
          {active ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                borderRadius: 9,
                backgroundColor: 'rgba(7,7,8,0.5)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eq paused={!playing} color={colors.lilac} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: active ? colors.lilac : colors.text, fontSize: compact ? 12.5 : 13.5, fontWeight: '550', letterSpacing: -0.15 }}>
          {track.title}
        </Text>
        <Pressable
          onPress={(event: any) => openArtist(event, track)}
          className="artist-link no-drag"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, alignSelf: 'flex-start', maxWidth: '100%' }}
        >
          <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11 }}>
            {track.artist}
          </Text>
          {track.verified ? <BadgeCheck size={11} color={colors.lilac} strokeWidth={2.2} /> : null}
        </Pressable>
      </View>

      {liked ? (
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lilac, marginRight: 6 }} />
      ) : null}

      <Text style={{ color: colors.textFaint, fontSize: 11, fontVariant: ['tabular-nums'], width: 40, textAlign: 'right' }}>
        {fmtTime(track.duration)}
      </Text>

      <View className="row-actions" style={{ flexDirection: 'row', alignItems: 'center' }}>
        {onRemove ? (
          <Pressable
            onPress={() => onRemove(track)}
            className="icon-btn"
            style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
          >
            <Trash2 size={14} color={colors.textFaint} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => useUiStore.getState().setTrackMenu(track)}
            className="icon-btn"
            style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreHorizontal size={16} color={colors.textDim} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
});
