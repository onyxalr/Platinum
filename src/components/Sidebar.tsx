import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { House, Library, ListMusic, Plus, Search, Settings, Sparkles } from 'lucide-react';
import type { Playlist } from '@shared/types';
import { api } from '../lib/api';
import { pluralRu } from '../lib/format';
import { useAuthStore } from '../store/auth';
import { useCustomizationStore } from '../store/customization';
import { useUiStore, type Route } from '../store/ui';
import { colors } from '../theme';
import { Artwork, Avatar, IconButton } from './ui';

type NavIcon = typeof House;

function NavItem({
  label,
  icon: Icon,
  active,
  onPress,
}: {
  label: string;
  icon: NavIcon;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`nav-item no-drag ${active ? 'is-active' : ''}`}
      style={{
        height: 40,
        borderRadius: 11,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Icon size={17} color={active ? colors.text : colors.textDim} strokeWidth={active ? 2 : 1.7} />
      <Text style={{ color: active ? colors.text : colors.textDim, fontSize: 13.5, fontWeight: active ? '600' : '500', letterSpacing: -0.15 }}>
        {label}
      </Text>
      {active ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.lilac, marginLeft: 'auto' }} /> : null}
    </Pressable>
  );
}

function RailButton({
  label,
  icon: Icon,
  active = false,
  onPress,
}: {
  label: string;
  icon: NavIcon;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`rail-btn no-drag ${active ? 'is-active' : ''}`}
      style={{ paddingVertical: 7 }}
    >
      <Icon size={18} color={active ? colors.text : colors.textDim} strokeWidth={active ? 2 : 1.75} />
      <Text
        className="rail-label"
        style={{ color: active ? colors.text : colors.textFaint }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Sidebar() {
  const route = useUiStore((state) => state.route);
  const navigate = useUiStore((state) => state.navigate);
  const libraryVersion = useUiStore((state) => state.libraryVersion);
  const user = useAuthStore((state) => state.user);
  const navStyle = useCustomizationStore((state) => state.navStyle);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .playlists()
      .then((data) => {
        if (alive) setPlaylists(data);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user?.id, libraryVersion]);

  const is = (name: Route['name']) => route.name === name;
  const openSettings = () => useUiStore.getState().setSettingsOpen(true);

  if (navStyle === 'rail') {
    return (
      <View className="sidebar sidebar-rail">
        <View className="rail-top">
          <RailButton label="Дом" icon={House} active={is('home')} onPress={() => navigate({ name: 'home' })} />
          <RailButton label="Поток" icon={Sparkles} active={is('flow')} onPress={() => navigate({ name: 'flow' })} />
          <RailButton label="Поиск" icon={Search} active={is('search')} onPress={() => navigate({ name: 'search' })} />
          <RailButton label="Музыка" icon={Library} active={is('library') || is('playlist')} onPress={() => navigate({ name: 'library' })} />
          <View className="rail-divider" />
          <RailButton label="Создать" icon={Plus} onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)} />
        </View>

        <View className="rail-spacer" />

        <View className="rail-footer">
          <Pressable
            onPress={() => navigate({ name: 'account' })}
            accessibilityLabel="Аккаунт"
            className="rail-btn no-drag"
            style={{ paddingVertical: 5 }}
          >
            <Avatar name={user?.displayName || 'Гость'} accent={user?.accent || '#C9B8FF'} size={28} />
            <Text className="rail-label" style={{ color: colors.textFaint }} numberOfLines={1}>
              Профиль
            </Text>
          </Pressable>
          <IconButton icon={Settings} size={16} buttonSize={32} label="Настройки" onPress={openSettings} />
        </View>
      </View>
    );
  }

  return (
    <View className="sidebar sidebar-panel">
      <View style={{ paddingHorizontal: 14, gap: 3 }}>
        <NavItem label="Главная" icon={House} active={is('home')} onPress={() => navigate({ name: 'home' })} />
        <NavItem label="Поток" icon={Sparkles} active={is('flow')} onPress={() => navigate({ name: 'flow' })} />
        <NavItem label="Поиск" icon={Search} active={is('search')} onPress={() => navigate({ name: 'search' })} />
        <NavItem label="Библиотека" icon={Library} active={is('library') || is('playlist')} onPress={() => navigate({ name: 'library' })} />
      </View>

      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20, marginVertical: 16 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 8 }}>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.8 }}>ПЛЕЙЛИСТЫ</Text>
        <IconButton
          icon={Plus}
          size={14}
          buttonSize={24}
          label="Создать плейлист"
          onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {playlists.length === 0 ? (
          <Pressable
            onPress={() => useUiStore.getState().setCreatePlaylistOpen(true)}
            className="nav-item"
            style={{ paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ListMusic size={12} color={colors.textFaint} />
            </View>
            <Text style={{ color: colors.textFaint, fontSize: 12 }}>Создать первый плейлист</Text>
          </Pressable>
        ) : (
          playlists.map((playlist) => {
            const active = route.name === 'playlist' && route.id === playlist.id;
            return (
              <Pressable
                key={playlist.id}
                onPress={() => navigate({ name: 'playlist', id: playlist.id, title: playlist.name })}
                className={`nav-item ${active ? 'is-active' : ''}`}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  borderRadius: 11,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Artwork uri={playlist.cover?.thumbnail} seed={playlist.name} size={30} radius={8} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: active ? colors.text : colors.textDim, fontSize: 12.5, fontWeight: '500' }}>
                    {playlist.name}
                  </Text>
                  <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 1 }}>
                    {playlist.trackCount} {pluralRu(playlist.trackCount, 'трек', 'трека', 'треков')}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Pressable
          onPress={() => navigate({ name: 'account' })}
          className="nav-item"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12 }}
        >
          <Avatar name={user?.displayName || 'Гость'} accent={user?.accent || '#C9B8FF'} size={32} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>
              {user?.displayName || 'Гость'}
            </Text>
            <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 1 }}>
              {user?.isGuest ? 'Гостевой режим' : `@${user?.username || 'platinum'}`}
            </Text>
          </View>
          <IconButton icon={Settings} size={15} buttonSize={28} label="Настройки" onPress={openSettings} />
        </Pressable>
      </View>
    </View>
  );
}
