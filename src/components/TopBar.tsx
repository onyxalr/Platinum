import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Search } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useRuntimeStore } from '../store/runtime';
import { useUiStore, type Route } from '../store/ui';
import { colors } from '../theme';
import { Avatar, NavArrows, Spinner } from './ui';

function routeTitle(route: Route): string {
  switch (route.name) {
    case 'home':
      return 'Главная';
    case 'flow':
      return 'Поток';
    case 'search':
      return 'Поиск';
    case 'library':
      return 'Библиотека';
    case 'playlist':
      return route.title || 'Плейлист';
    case 'artist':
      return route.artist;
    case 'account':
      return 'Аккаунт';
    default:
      return 'Platinum';
  }
}

export function TopBar() {
  const route = useUiStore((state) => state.route);
  const canGoBack = useUiStore((state) => state.stack.length > 0);
  const user = useAuthStore((state) => state.user);
  const ytdlp = useRuntimeStore((state) => state.ytdlp);

  const engineBusy = ytdlp && ytdlp.state !== 'ready';
  const title = routeTitle(route);

  return (
    <View
      className="topbar no-drag"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <NavArrows onBack={() => useUiStore.getState().back()} canBack={canGoBack} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13.5, fontWeight: '600', letterSpacing: -0.1 }}>
          {title}
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 1, letterSpacing: 0.2 }}>
          {route.name === 'playlist' ? 'Твоя коллекция' : 'Platinum · локальная библиотека'}
        </Text>
      </View>

      {engineBusy ? (
        <Pressable
          onPress={() => useUiStore.getState().setSettingsOpen(true)}
          className="hoverable no-drag"
          style={{
            height: 30,
            paddingHorizontal: 11,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            borderWidth: 1,
            borderColor: ytdlp?.state === 'error' ? 'color-mix(in srgb, var(--danger) 40%, transparent)' : colors.border,
            backgroundColor: ytdlp?.state === 'error' ? 'color-mix(in srgb, var(--danger) 10%, transparent)' : colors.surface,
          }}
        >
          {ytdlp?.state === 'error' ? (
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.danger }} />
          ) : (
            <Spinner size={10} color={colors.lilac} />
          )}
          <Text style={{ color: ytdlp?.state === 'error' ? colors.danger : colors.textDim, fontSize: 10.5, fontWeight: '550' }}>
            {ytdlp?.state === 'error'
              ? 'Музыкальный движок'
              : ytdlp?.state === 'downloading'
                ? `Движок ${ytdlp.progress}%`
                : 'Движок…'}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => useUiStore.getState().focusSearch()}
        className="search-field no-drag hoverable"
        style={{
          width: 212,
          height: 34,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 11,
        }}
      >
        <Search size={14} color={colors.textFaint} />
        <Text style={{ color: colors.textFaint, fontSize: 11.5, flex: 1 }}>Поиск треков</Text>
        <View
          style={{
            paddingHorizontal: 6,
            height: 18,
            borderRadius: 5,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.textFaint, fontSize: 9.5 }}>/</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => useUiStore.getState().navigate({ name: 'account' })}
        className="no-drag"
        style={{ borderRadius: 999 }}
        accessibilityLabel="Аккаунт"
      >
        <Avatar name={user?.displayName || 'Гость'} accent={user?.accent || '#C9B8FF'} size={32} />
      </Pressable>
    </View>
  );
}
