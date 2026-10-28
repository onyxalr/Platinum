import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { BadgeCheck, Music2, Play, Shuffle } from 'lucide-react';
import type { ArtistProfile } from '@shared/types';
import { api } from '../lib/api';
import { pluralRu } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors } from '../theme';
import { Artwork, Button, EmptyState, SectionHeader, Skeleton } from '../components/ui';
import { TrackRow } from '../components/TrackRow';

function ArtistSkeleton() {
  return (
    <View className="content-pad" style={{ paddingTop: 26 }}>
      <Skeleton height={286} radius={26} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 30 }}>
        <Skeleton height={88} width={88} radius={44} />
        <View style={{ flex: 1, gap: 9 }}>
          <Skeleton height={20} width={260} />
          <Skeleton height={11} width={170} />
        </View>
      </View>
      <View style={{ gap: 8, marginTop: 34 }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} height={54} radius={12} />
        ))}
      </View>
    </View>
  );
}

export function ArtistScreen() {
  const route = useUiStore((state) => state.route);
  const name = route.name === 'artist' ? route.artist : '';
  const { data, loading, error, reload } = useAsync(() => api.artist(name), [name]);

  if (loading && !data) return <ArtistSkeleton />;

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 }}>
        <EmptyState
          icon={Music2}
          title="Исполнитель не найден"
          description={error || 'Не удалось собрать официальный каталог. Попробуй ещё раз.'}
          action="Повторить"
          onAction={reload}
        />
      </View>
    );
  }

  return <ArtistPage profile={data} />;
}

function ArtistPage({ profile }: { profile: ArtistProfile }) {
  const tracks = profile.tracks;
  const total = tracks.reduce((sum, track) => sum + track.duration, 0);

  return (
    <ScrollView
      className="screen-scroll no-scrollbar"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 52 }}
    >
      <View className="artist-hero">
        <View
          pointerEvents="none"
          className="artist-hero-cover"
          style={{ backgroundImage: `url("${profile.thumbnail}")` }}
        />
        <View pointerEvents="none" className="artist-hero-shade" />
        <View pointerEvents="none" className="artist-hero-grain" />

        <View className="artist-hero-content">
          <Artwork
            uri={profile.thumbnail}
            seed={profile.name}
            size={176}
            radius={176}
            style={{ boxShadow: '0 32px 82px rgba(0,0,0,0.58)' }}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {profile.verified ? <BadgeCheck size={13} color={colors.lilac} strokeWidth={2.2} /> : null}
              <Text style={{ color: colors.lilac, fontSize: 8.5, fontWeight: '700', letterSpacing: 2.2 }}>
                {profile.verified ? 'ПРОВЕРЕННЫЙ ИСПОЛНИТЕЛЬ' : 'ОФИЦИАЛЬНЫЙ КАТАЛОГ'}
              </Text>
            </View>
            <Text className="display artist-hero-name" numberOfLines={2}>
              {profile.name}
            </Text>
            <Text style={{ color: colors.textDim, fontSize: 11.5, marginTop: 9 }}>
              {tracks.length} {pluralRu(tracks.length, 'трек', 'трека', 'треков')} ·{' '}
              {Math.max(1, Math.round(total / 60))} {pluralRu(Math.max(1, Math.round(total / 60)), 'минута', 'минуты', 'минут')} звучания
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 20 }}>
              <Button
                label="Слушать"
                icon={Play}
                small
                onPress={() => usePlayerStore.getState().playQueue(tracks, 0)}
              />
              <Button
                label="Перемешать"
                icon={Shuffle}
                variant="soft"
                small
                onPress={() =>
                  usePlayerStore
                    .getState()
                    .playQueue(tracks, Math.floor(Math.random() * Math.max(1, tracks.length)))
                }
              />
            </View>
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: 36, paddingTop: 26 }}>
        <SectionHeader
          title="Треки"
          subtitle="Только официальные загрузки и проверенные каналы"
          style={{ marginBottom: 10 }}
        />
        {tracks.map((track, index) => (
          <TrackRow key={track.id} track={track} queue={tracks} index={index} />
        ))}
      </View>
    </ScrollView>
  );
}
