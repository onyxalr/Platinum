import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Clock3, Download, FolderOpen, Heart, Library, ListMusic, Music2, Play, Plus, Shuffle, Trash2 } from 'lucide-react';
import type { DownloadItem } from '@shared/types';
import { api } from '../lib/api';
import { fmtSize, pluralRu, relativeTime } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { useAuthStore } from '../store/auth';
import { useCustomizationStore } from '../store/customization';
import { usePlayerStore } from '../store/player';
import { useUiStore, type LibraryTab } from '../store/ui';
import { colors } from '../theme';
import { Artwork, Button, EmptyState, IconButton, SectionHeader, Skeleton } from '../components/ui';
import { TrackRow } from '../components/TrackRow';

const TABS: Array<{ id: LibraryTab; label: string; icon: typeof Heart }> = [
  { id: 'playlists', label: 'Плейлисты', icon: ListMusic },
  { id: 'likes', label: 'Любимое', icon: Heart },
  { id: 'history', label: 'История', icon: Clock3 },
  { id: 'downloads', label: 'Скачано', icon: Download },
];

function DownloadsTab({ version }: { version: number }) {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => {
      api
        .downloads()
        .then((data) => {
          if (alive) {
            setItems(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (alive) setLoading(false);
        });
    };
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 2600);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [version]);

  if (loading) {
    return (
      <View style={{ gap: 10 }}>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} height={58} radius={12} />
        ))}
      </View>
    );
  }

  if (!items.length) {
    return (
      <EmptyState
        icon={Download}
        title="Пока ничего не скачано"
        description="Скачивай треки из меню «Ещё» — они останутся доступны даже без интернета."
      />
    );
  }

  return (
    <View style={{ gap: 6 }}>
      {items.map((item) => (
        <View
          key={item.id}
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Pressable onPress={() => usePlayerStore.getState().playTrack(item, items)} className="no-drag">
            <Artwork uri={item.thumbnail} seed={item.title} size={44} radius={10} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '550' }}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }}>
              <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 10.5 }}>
                {item.artist}
              </Text>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint }} />
              <Text style={{ color: item.status === 'error' ? colors.danger : colors.textFaint, fontSize: 10 }}>
                {item.status === 'ready'
                  ? `${fmtSize(item.size)} · офлайн`
                  : item.status === 'error'
                    ? item.error || 'Ошибка'
                    : `Загрузка ${item.progress}%`}
              </Text>
            </View>
            {item.status !== 'ready' && item.status !== 'error' ? (
              <View style={{ height: 2, borderRadius: 2, backgroundColor: colors.surfaceStrong, marginTop: 7, overflow: 'hidden' }}>
                <View style={{ height: 2, width: `${Math.max(2, item.progress)}%`, backgroundColor: colors.lilac }} />
              </View>
            ) : null}
          </View>
          <IconButton
            icon={Play}
            size={15}
            buttonSize={32}
            label="Играть"
            onPress={() => usePlayerStore.getState().playTrack(item, items)}
          />
          {item.filePath ? (
            <IconButton
              icon={FolderOpen}
              size={15}
              buttonSize={32}
              label="Показать файл"
              onPress={() => void window.platinum?.showItem(item.filePath)}
            />
          ) : null}
          <IconButton
            icon={Trash2}
            size={15}
            buttonSize={32}
            label="Удалить"
            onPress={() => {
              api
                .removeDownload(item.id)
                .then(() => {
                  setItems((current) => current.filter((entry) => entry.id !== item.id));
                  useUiStore.getState().toast('Загрузка удалена');
                  useUiStore.getState().bumpLibrary();
                })
                .catch(() => useUiStore.getState().toast('Не удалось удалить', 'error'));
            }}
          />
        </View>
      ))}
    </View>
  );
}

export function LibraryScreen() {
  const route = useUiStore((state) => state.route);
  const routeTab = route.name === 'library' ? route.tab : undefined;
  const navigate = useUiStore((state) => state.navigate);
  const libraryVersion = useUiStore((state) => state.libraryVersion);
  const user = useAuthStore((state) => state.user);
  const [tab, setTab] = useState<LibraryTab>(routeTab || 'playlists');
  const { width } = useWindowDimensions();
  const sidebarWidth = useCustomizationStore((state) => state.sidebarWidth);
  const contentPadding = useCustomizationStore((state) => state.contentPadding);
  const contentWidth = useCustomizationStore((state) => state.contentWidth);

  useEffect(() => {
    if (routeTab) setTab(routeTab);
  }, [routeTab]);

  const { data, loading, error, reload } = useAsync(() => api.library(), [user?.id, libraryVersion]);

  const cardWidth = useMemo(() => {
    const main = Math.min(width - sidebarWidth - 32, contentWidth);
    const content = Math.max(320, main - contentPadding * 2);
    return Math.max(154, Math.min(252, Math.floor((content - 54) / 4)));
  }, [width, sidebarWidth, contentPadding, contentWidth]);

  const likes = data?.likes ?? [];
  const playlists = data?.playlists ?? [];
  const history = data?.history ?? [];

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
      <View>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 2.1, marginBottom: 9 }}>КОЛЛЕКЦИЯ</Text>
        <Text className="display" style={{ color: colors.text, fontSize: 44, letterSpacing: -1.3 }}>
          Твоя библиотека
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 8 }}>
          {likes.length} {pluralRu(likes.length, 'любимый трек', 'любимых трека', 'любимых треков')} · {playlists.length}{' '}
          {pluralRu(playlists.length, 'плейлист', 'плейлиста', 'плейлистов')} · {history.length} в истории
        </Text>
      </View>
      <Button
        label="Новый плейлист"
        icon={Plus}
        variant="outline"
        small
        onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)}
      />
    </View>
  );

  const tabs = (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 26, marginBottom: 26 }}>
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = tab === item.id;
        return (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            className="tab-pill"
            style={{
              height: 34,
              paddingHorizontal: 14,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderWidth: 1,
              borderColor: active ? colors.borderStrong : colors.border,
              backgroundColor: active ? colors.surfaceStrong : 'transparent',
            }}
          >
            <Icon size={13} color={active ? colors.text : colors.textFaint} strokeWidth={1.7} />
            <Text style={{ color: active ? colors.text : colors.textFaint, fontSize: 11.5, fontWeight: '600' }}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 36, paddingTop: 26, paddingBottom: 52 }} className="screen-scroll no-scrollbar">
      {header}
      {tabs}

      {loading && !data ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          {[0, 1, 2, 3].map((index) => (
            <View key={index} style={{ width: cardWidth }}>
              <Skeleton height={cardWidth} radius={18} />
              <Skeleton height={11} width={cardWidth * 0.7} style={{ marginTop: 11 }} />
              <Skeleton height={9} width={cardWidth * 0.4} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
      ) : error && !data ? (
        <EmptyState icon={Music2} title="Библиотека недоступна" description={error} action="Повторить" onAction={reload} />
      ) : tab === 'playlists' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
          {playlists.map((playlist) => (
            <Pressable
              key={playlist.id}
              onPress={() => navigate({ name: 'playlist', id: playlist.id, title: playlist.name })}
              className="cover-card no-drag"
              style={{ width: cardWidth }}
            >
              <View style={{ position: 'relative', width: cardWidth, height: cardWidth, borderRadius: 18, overflow: 'hidden' }}>
                <Artwork uri={playlist.cover?.thumbnail} seed={playlist.name} size={cardWidth} radius={18} />
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.4) 100%)' }} />
                <View className="cover-play" style={{ position: 'absolute', right: 10, bottom: 10, width: 36, height: 36, borderRadius: 36, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={14} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
                </View>
              </View>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 11, letterSpacing: -0.2 }}>
                {playlist.name}
              </Text>
              <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 4 }}>
                {playlist.trackCount} {pluralRu(playlist.trackCount, 'трек', 'трека', 'треков')}
              </Text>
            </Pressable>
          ))}

          <Pressable
            onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)}
            className="card-hover no-drag"
            style={{
              width: cardWidth,
              height: cardWidth + 38,
              borderRadius: 18,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: colors.borderStrong,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={18} color={colors.textDim} />
            </View>
            <Text style={{ color: colors.textDim, fontSize: 12 }}>Новый плейлист</Text>
          </Pressable>
        </View>
      ) : tab === 'likes' ? (
        likes.length ? (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <Button label="Слушать всё" icon={Play} small onPress={() => usePlayerStore.getState().playQueue(likes, 0)} />
              <Button
                label="Перемешать"
                icon={Shuffle}
                variant="soft"
                small
                onPress={() => usePlayerStore.getState().playQueue(likes, Math.floor(Math.random() * likes.length))}
              />
              <Text style={{ color: colors.textFaint, fontSize: 10.5, marginLeft: 'auto' }}>
                {likes.length} {pluralRu(likes.length, 'трек', 'трека', 'треков')}
              </Text>
            </View>
            {likes.map((track, index) => (
              <TrackRow key={track.id} track={track} queue={likes} index={index} />
            ))}
          </View>
        ) : (
          <EmptyState icon={Heart} title="Любимое пока пусто" description="Нажми на сердечко в плеере или меню трека — он появится здесь." />
        )
      ) : tab === 'history' ? (
        history.length ? (
          <View>
            <SectionHeader title="Недавние прослушивания" subtitle="История хранится локально" style={{ marginBottom: 10 }} />
            {history.map((track, index) => (
              <View key={`${track.id}-${track.playedAt}`}>
                <TrackRow track={track} queue={history} index={index} />
                <Text style={{ color: colors.textFaint, fontSize: 9, marginTop: -4, marginLeft: 96, marginBottom: 4 }}>{relativeTime(track.playedAt)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <EmptyState icon={Clock3} title="История пуста" description="Здесь появятся треки, которые ты слушал. Начни с потока или поиска." />
        )
      ) : (
        <DownloadsTab version={libraryVersion} />
      )}
    </ScrollView>
  );
}
