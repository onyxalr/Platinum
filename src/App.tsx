import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuthStore } from './store/auth';
import { useCustomizationStore } from './store/customization';
import { usePlayerStore } from './store/player';
import { useRuntimeStore } from './store/runtime';
import { useUiStore, type Route } from './store/ui';
import { colors } from './theme';
import { Button, Spinner } from './components/ui';
import { LogoMark, LogoWordmark } from './components/Logo';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PlayerBar } from './components/PlayerBar';
import { NowPlaying } from './components/NowPlaying';
import { Modals, Toasts } from './components/Modals';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';

const SearchScreen = React.lazy(() => import('./screens/SearchScreen').then((module) => ({ default: module.SearchScreen })));
const FlowScreen = React.lazy(() => import('./screens/FlowScreen').then((module) => ({ default: module.FlowScreen })));
const LibraryScreen = React.lazy(() => import('./screens/LibraryScreen').then((module) => ({ default: module.LibraryScreen })));
const PlaylistScreen = React.lazy(() => import('./screens/PlaylistScreen').then((module) => ({ default: module.PlaylistScreen })));
const ArtistScreen = React.lazy(() => import('./screens/ArtistScreen').then((module) => ({ default: module.ArtistScreen })));
const AccountScreen = React.lazy(() => import('./screens/AccountScreen').then((module) => ({ default: module.AccountScreen })));

function BootSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View className="orb orb-a" style={{ width: 380, height: 380, backgroundColor: 'color-mix(in srgb, var(--lilac) 9%, transparent)', top: '28%', left: '38%' }} />
      <LogoMark size={50} glow />
      <LogoWordmark size={18} caps style={{ letterSpacing: 7, marginTop: 22, paddingLeft: 7 }} />
      <View style={{ width: 44, height: 1, marginTop: 20, backgroundImage: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 55%, transparent), transparent)' }} />
      <Text style={{ color: colors.textFaint, fontSize: 8.5, letterSpacing: 2.6, marginTop: 18 }}>LOCAL MUSIC SYSTEM</Text>
    </View>
  );
}

function SceneFx() {
  return (
    <View className="scene-fx" pointerEvents="none" aria-hidden="true">
      <View className="fx-pointer" />
      <View className="fx-aurora fx-aurora-a" />
      <View className="fx-aurora fx-aurora-b" />
      <View className="fx-beam" />
      <View className="fx-grid" />
      <View className="fx-vignette" />
    </View>
  );
}

function usePointerLighting() {
  const effectsStyle = useCustomizationStore((state) => state.effectsStyle);
  const performance = useCustomizationStore((state) => state.performance);

  useEffect(() => {
    if (performance || effectsStyle === 'clean') return;
    const root = document.documentElement;
    let frame = 0;
    let x = window.innerWidth * 0.66;
    let y = window.innerHeight * 0.22;

    const apply = () => {
      frame = 0;
      root.style.setProperty('--pointer-x', `${Math.round(x)}px`);
      root.style.setProperty('--pointer-y', `${Math.round(y)}px`);
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
      root.style.removeProperty('--pointer-x');
      root.style.removeProperty('--pointer-y');
    };
  }, [effectsStyle, performance]);
}

function EngineBanner() {
  const ytdlp = useRuntimeStore((state) => state.ytdlp);
  if (!ytdlp || ytdlp.state === 'ready') return null;

  const failed = ytdlp.state === 'error';
  const downloading = ytdlp.state === 'downloading' || ytdlp.state === 'missing';
  const label = failed
    ? 'Музыкальный движок не запустился'
    : downloading
      ? `Готовлю музыкальный движок${ytdlp.progress > 0 ? ` · ${ytdlp.progress}%` : ''}`
      : 'Проверяю музыкальный движок';

  return (
    <View
      className="engine-banner fade-in"
      style={{
        height: 38,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: failed ? 'color-mix(in srgb, var(--danger) 22%, transparent)' : 'var(--glass-border)',
        backgroundColor: failed
          ? 'color-mix(in srgb, var(--danger) 7%, transparent)'
          : 'color-mix(in srgb, var(--lilac) 5%, var(--glass-bg))',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {failed ? (
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.danger }} />
      ) : (
        <Spinner size={10} color={colors.lilac} />
      )}
      <Text style={{ color: failed ? colors.danger : colors.textDim, fontSize: 10.5, fontWeight: '550' }}>{label}</Text>
      <Text style={{ color: colors.textFaint, fontSize: 10 }}>
        {failed ? '· проверь соединение или обнови вручную' : '· один раз, без VPN'}
      </Text>
      <View style={{ flex: 1 }} />
      {failed ? (
        <Button
          label="Настройки"
          variant="ghost"
          small
          onPress={() => useUiStore.getState().setSettingsOpen(true)}
          style={{ height: 26, paddingHorizontal: 10, borderWidth: 1, borderColor: 'color-mix(in srgb, var(--danger) 34%, transparent)' }}
        />
      ) : null}
      {downloading ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            height: 1,
            width: `${Math.max(3, ytdlp.progress)}%`,
            backgroundColor: 'color-mix(in srgb, var(--lilac) 70%, transparent)',
            transition: 'width var(--motion-slow) var(--motion-ease)',
          }}
        />
      ) : null}
    </View>
  );
}

function ScreenFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
      <Spinner size={18} color={colors.textDim} />
    </View>
  );
}

function renderScreen(route: Route) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'flow':
      return <FlowScreen />;
    case 'search':
      return <SearchScreen />;
    case 'library':
      return <LibraryScreen />;
    case 'playlist':
      return <PlaylistScreen id={route.id} />;
    case 'artist':
      return <ArtistScreen />;
    case 'account':
      return <AccountScreen />;
    default:
      return <HomeScreen />;
  }
}

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
      const control = tag === 'BUTTON' || tag === 'A';

      if (event.key === 'Escape') {
        if (typing) {
          target?.blur();
          return;
        }
        const ui = useUiStore.getState();
        if (ui.createPlaylistOpen) ui.setCreatePlaylistOpen(false);
        else if (ui.importOpen) ui.setImportOpen(false);
        else if (ui.settingsOpen) ui.setSettingsOpen(false);
        else if (ui.trackMenu) ui.setTrackMenu(null);
        else if (ui.pickerTrack) ui.setPickerTrack(null);
        else if (ui.playerOpen) ui.closePlayer();
        return;
      }

      if (typing || control || event.metaKey || event.ctrlKey || event.altKey) return;

      const player = usePlayerStore.getState();
      if (event.code === 'Space') {
        event.preventDefault();
        player.toggle();
      } else if (event.key === 'ArrowRight') {
        if (player.duration > 0) {
          event.preventDefault();
          player.seek(Math.min(player.duration, player.position + 5));
        }
      } else if (event.key === 'ArrowLeft') {
        if (player.duration > 0) {
          event.preventDefault();
          player.seek(Math.max(0, player.position - 5));
        }
      } else if (event.key === '/' || event.code === 'Slash') {
        event.preventDefault();
        useUiStore.getState().focusSearch();
      } else if (event.code === 'KeyL') {
        if (player.current) void player.toggleLike();
      } else if (event.code === 'KeyM') {
        player.toggleMute();
      } else if (event.code === 'KeyF') {
        useUiStore.getState().navigate({ name: 'flow' });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

function Shell() {
  const route = useUiStore((state) => state.route);
  const playerOpen = useUiStore((state) => state.playerOpen);
  const current = usePlayerStore((state) => state.current);
  const ytdlpState = useRuntimeStore((state) => state.ytdlp?.state);

  useKeyboardShortcuts();
  usePointerLighting();

  useEffect(() => {
    const runtime = useRuntimeStore.getState();
    void runtime.loadInfo();

    let stopped = false;
    let timer = 0;
    const tick = async () => {
      await useRuntimeStore.getState().refreshYtdlp();
      if (stopped) return;
      const status = useRuntimeStore.getState().ytdlp;
      const delay = status?.state === 'ready' ? 60_000 : status?.state === 'error' ? 15_000 : 2_000;
      timer = window.setTimeout(() => void tick(), delay);
    };
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [ytdlpState === 'ready']);

  useEffect(() => {
    if (!current) document.title = 'Platinum';
  }, [current]);

  const screen = useMemo(() => renderScreen(route), [route]);
  const screenKey =
    route.name === 'playlist'
      ? `${route.name}:${route.id}`
      : route.name === 'artist'
        ? `${route.name}:${route.artist}`
        : route.name === 'library'
          ? `${route.name}:${route.tab || 'playlists'}`
          : route.name === 'search'
            ? `${route.name}:${route.query || ''}`
            : route.name;

  return (
    <View className="app-shell" style={{ flex: 1, overflow: 'hidden' }}>
      <View className="app-backdrop" pointerEvents="none">
        {current?.thumbnail ? (
          <View
            key={current.id}
            className="ambient-cover"
            style={{ backgroundImage: `url("${current.thumbnail}")` }}
          />
        ) : null}
        <View className="ambient-wash" />
        <View
          className="orb orb-a"
          style={{ width: 540, height: 540, left: '-12%', top: '-24%', backgroundColor: 'var(--lilac)' }}
        />
        <View
          className="orb orb-b"
          style={{ width: 460, height: 460, right: '-10%', bottom: '-22%', backgroundColor: 'var(--sky)' }}
        />
        <View className="app-grain" />
      </View>
      <SceneFx />

      <TitleBar />
      <View className="app-body">
        <Sidebar />
        <View className="app-main">
          <TopBar />
          <EngineBanner />
          <View className="content-stage">
            <Suspense fallback={<ScreenFallback />}>
              <View key={screenKey} className="screen-enter">
                {screen}
              </View>
            </Suspense>
          </View>
          <PlayerBar />
        </View>
      </View>

      {playerOpen && current ? <NowPlaying /> : null}
      <Modals />
      <Toasts />
    </View>
  );
}

export default function App() {
  const user = useAuthStore((state) => state.user);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    let alive = true;
    void useAuthStore
      .getState()
      .init()
      .finally(() => {
        if (alive) setBooted(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.title = user ? 'Platinum' : 'Platinum — вход';
  }, [user]);

  if (!booted) return <BootSplash />;
  if (!user) return <AuthScreen />;
  return <Shell />;
}
