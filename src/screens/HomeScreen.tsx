import React, { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowUpRight, Music2, Play, Sparkles } from 'lucide-react';
import type { HomeFeed, Mood } from '@shared/types';
import { api } from '../lib/api';
import { greeting as greetingForHour } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useAuthStore } from '../store/auth';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors, fonts } from '../theme';
import { Artwork, Button, EmptyState, SectionHeader, Skeleton } from '../components/ui';
import { TrackCard, TrackRow } from '../components/TrackRow';

function Header({ feed }: { feed: HomeFeed | null }) {
  const user = useAuthStore((state) => state.user);
  const firstName = (user?.displayName || 'гость').split(/\s+/)[0];
  const label = useMemo(() => {
    const value = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    return value.charAt(0).toUpperCase() + value.slice(1);
  }, []);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
      <View>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.8 }}>{label.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 9, flexWrap: 'wrap' }}>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: '500', letterSpacing: -0.9 }}>{feed?.greeting || greetingForHour()},</Text>
          <Text className="display" style={{ color: colors.lilac, fontSize: 38, fontStyle: 'italic', letterSpacing: -0.6 }}>
            {firstName}
          </Text>
        </View>
      </View>
      <Button
        label="Собрать поток"
        icon={Sparkles}
        variant="outline"
        small
        onPress={() => useUiStore.getState().navigate({ name: 'flow' })}
      />
    </View>
  );
}

function Hero({ feed }: { feed: HomeFeed }) {
  const hero = feed.dailyMix[0];
  const second = feed.dailyMix[1];
  const user = useAuthStore((state) => state.user);

  return (
    <View
      className="grain fade-up"
      style={{
        height: 288,
        borderRadius: 26,
        overflow: 'hidden',
        marginTop: 26,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.bgElevated,
      }}
    >
      {hero ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage: `url("${hero.thumbnail}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.5,
          }}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundImage:
            'linear-gradient(90deg, color-mix(in srgb, var(--bg) 97%, transparent) 0%, color-mix(in srgb, var(--bg) 88%, transparent) 34%, color-mix(in srgb, var(--bg) 40%, transparent) 66%, color-mix(in srgb, var(--bg) 14%, transparent) 100%), linear-gradient(0deg, color-mix(in srgb, var(--bg) 68%, transparent), transparent 55%)',
        }}
      />

      <View style={{ position: 'absolute', top: 30, left: 34, bottom: 30, justifyContent: 'space-between', width: 430, maxWidth: '56%' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lilac }} />
            <Text style={{ color: colors.lilac, fontSize: 8.5, fontWeight: '700', letterSpacing: 2.2 }}>DAILY MIX · 01</Text>
            <Text style={{ color: colors.textFaint, fontSize: 8.5, letterSpacing: 0.6 }}>· персонально для {user?.displayName || 'тебя'}</Text>
          </View>
          <Text className="display" style={{ color: colors.text, fontSize: 46, lineHeight: 48, letterSpacing: -1.3, marginTop: 14 }}>
            Собрано под тебя
          </Text>
          <Text style={{ color: colors.textDim, fontSize: 12, lineHeight: 19, marginTop: 10, maxWidth: 330 }}>
            {feed.dailyMix.length} треков, которые подходят сегодняшнему вечеру. Обновляется каждый день.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Button
            label="Слушать"
            icon={Play}
            onPress={() => usePlayerStore.getState().playQueue(feed.dailyMix, 0)}
            small
          />
          <Button
            label="Перемешать"
            variant="ghost"
            small
            onPress={() => {
              usePlayerStore.setState({ shuffle: true });
              usePlayerStore.getState().playQueue(feed.dailyMix, Math.floor(Math.random() * feed.dailyMix.length));
            }}
            style={{ borderWidth: 0 }}
          />
        </View>
      </View>

      {hero ? (
        <View style={{ position: 'absolute', right: 148, top: 44, width: 200, height: 200, transform: 'rotate(7deg)' }}>
          <Artwork uri={second?.thumbnail} seed={second?.title || 'platinum 2'} size={200} radius={18} style={{ opacity: 0.42 }} />
        </View>
      ) : null}
      {hero ? (
        <Pressable
          onPress={() => usePlayerStore.getState().playTrack(hero, feed.dailyMix)}
          className="cover-card no-drag"
          style={{
            position: 'absolute',
            right: 48,
            top: 38,
            width: 210,
            height: 210,
            transform: 'rotate(-3.5deg)',
            borderRadius: 20,
            boxShadow: 'var(--art-shadow)',
          }}
        >
          <Artwork uri={hero.thumbnail} seed={hero.title} size={210} radius={20} />
          <View
            className="cover-play"
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              width: 42,
              height: 42,
              borderRadius: 42,
              backgroundColor: colors.text,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <Play size={16} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

function MoodTile({ mood }: { mood: Mood }) {
  return (
    <Pressable
      onPress={() => useUiStore.getState().navigate({ name: 'search', query: mood.query })}
      className="mood-tile no-drag"
      style={{
        flex: 1,
        minWidth: 150,
        height: 116,
        borderRadius: 18,
        padding: 16,
        justifyContent: 'space-between',
        backgroundImage: `linear-gradient(145deg, ${mood.colors[0]} 0%, ${mood.colors[1]} 100%)`,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text className="display" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 21, letterSpacing: -0.3 }}>
          {mood.title}
        </Text>
        <ArrowUpRight size={14} color="rgba(255,255,255,0.45)" />
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{mood.subtitle}</Text>
    </Pressable>
  );
}

function HomeSkeleton() {
  return (
    <View className="content-pad" style={{ paddingTop: 30 }}>
      <Skeleton height={10} width={160} />
      <Skeleton height={36} width={330} style={{ marginTop: 14 }} />
      <Skeleton height={286} style={{ marginTop: 28 }} radius={26} />
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 40 }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View key={index} style={{ width: 174 }}>
            <Skeleton height={174} radius={16} />
            <Skeleton height={11} width={130} style={{ marginTop: 12 }} />
            <Skeleton height={9} width={80} style={{ marginTop: 7 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const { data, loading, error, reload } = useAsync(() => api.home(), [user?.id]);

  if (loading && !data) return <HomeSkeleton />;

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 }}>
        <EmptyState
          icon={Music2}
          title="Не удалось собрать главную"
          description={error || 'Проверь подключение к сети — Platinum подгрузит рекомендации автоматически.'}
          action="Попробовать снова"
          onAction={reload}
        />
      </View>
    );
  }

  return (
    <ScrollView className="screen-scroll" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 36, paddingTop: 28, paddingBottom: 48 }}>
      <Header feed={data} />
      <Hero feed={data} />

      {data.forYou.length ? (
        <View style={{ marginTop: 38 }}>
          <SectionHeader title="Для тебя" subtitle="Подобрано по твоим прослушиваниям" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 20 }} className="no-scrollbar">
            {data.forYou.map((track) => (
              <TrackCard key={track.id} track={track} queue={data.forYou} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {data.moods.length ? (
        <View style={{ marginTop: 36 }}>
          <SectionHeader title="Настроения" subtitle="Один клик — и нужное настроение" />
          <View style={{ flexDirection: 'row', gap: 14 }}>
            {data.moods.map((mood) => (
              <MoodTile key={mood.id} mood={mood} />
            ))}
          </View>
        </View>
      ) : null}

      {data.fresh.length ? (
        <View style={{ marginTop: 36 }}>
          <SectionHeader title="Свежее" subtitle="Новые находки из YouTube" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingRight: 20 }} className="no-scrollbar">
            {data.fresh.map((track) => (
              <TrackCard key={track.id} track={track} queue={data.fresh} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {data.recently.length ? (
        <View style={{ marginTop: 36 }}>
          <SectionHeader title="Недавно" subtitle="Вернись к тому, что уже звучало" />
          <View>
            {data.recently.slice(0, 7).map((track, index) => (
              <TrackRow key={`${track.id}-${track.playedAt}`} track={track} queue={data.recently} index={index} compact />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
