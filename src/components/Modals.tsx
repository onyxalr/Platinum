import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Heart,
  ListMusic,
  ListPlus,
  Play,
  Plus,
  SkipForward,
  X,
} from 'lucide-react';
import type { Playlist, Track } from '@shared/types';
import { api } from '../lib/api';
import { copyTrackLink, downloadTrack, openOnYouTube } from '../lib/actions';
import { usePlayerStore } from '../store/player';
import { useUiStore, type Toast } from '../store/ui';
import { colors } from '../theme';
import { Artwork, Button, Field, IconButton, Modal, ModalHeader, Spinner } from './ui';

const SettingsModal = React.lazy(() =>
  import('./SettingsModal').then((module) => ({ default: module.SettingsModal })),
);

function MenuRow({
  icon: Icon,
  label,
  hint,
  onPress,
  danger = false,
  active = false,
}: {
  icon: typeof Heart;
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="menu-row"
      style={{
        height: 44,
        borderRadius: 11,
        paddingHorizontal: 11,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'transparent',
      }}
    >
      <View style={{ width: 26, alignItems: 'center' }}>
        <Icon size={16} color={danger ? colors.danger : active ? colors.lilac : colors.textDim} strokeWidth={1.7} />
      </View>
      <Text style={{ color: danger ? colors.danger : colors.text, fontSize: 13, fontWeight: '500', flex: 1 }}>{label}</Text>
      {hint ? <Text style={{ color: colors.textFaint, fontSize: 10.5 }}>{hint}</Text> : null}
    </Pressable>
  );
}

export function TrackActionsModal() {
  const track = useUiStore((state) => state.trackMenu);
  const isLiked = usePlayerStore((state) => (track ? !!state.liked[track.id] : false));

  if (!track) return null;
  const close = () => useUiStore.getState().setTrackMenu(null);

  return (
    <Modal onClose={close} width={420}>
      <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center', marginBottom: 16 }}>
        <Artwork uri={track.thumbnail} seed={track.title} size={56} radius={13} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14.5, fontWeight: '650', letterSpacing: -0.3 }}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 3 }}>
            {track.artist}
          </Text>
        </View>
        <IconButton icon={X} size={16} label="Закрыть" onPress={close} />
      </View>

      <View style={{ gap: 1 }}>
        <MenuRow
          icon={Play}
          label="Играть сейчас"
          onPress={() => {
            usePlayerStore.getState().playTrack(track);
            close();
          }}
        />
        <MenuRow
          icon={SkipForward}
          label="Играть следующим"
          onPress={() => {
            usePlayerStore.getState().playNext(track);
            close();
          }}
        />
        <MenuRow
          icon={ListMusic}
          label="Добавить в очередь"
          onPress={() => {
            usePlayerStore.getState().addToQueue(track);
            close();
          }}
        />
        <MenuRow
          icon={Heart}
          label={isLiked ? 'Убрать из любимого' : 'В любимое'}
          active={isLiked}
          onPress={() => {
            void usePlayerStore.getState().toggleLike(track);
            close();
          }}
        />
        <MenuRow
          icon={ListPlus}
          label="Добавить в плейлист"
          onPress={() => {
            useUiStore.getState().setTrackMenu(null);
            useUiStore.getState().setPickerTrack(track);
          }}
        />
        <MenuRow
          icon={Download}
          label="Скачать офлайн"
          hint="audio"
          onPress={() => {
            downloadTrack(track);
            close();
          }}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 7 }} />
        <MenuRow
          icon={ArrowUpRight}
          label="Открыть на YouTube"
          onPress={() => {
            openOnYouTube(track);
            close();
          }}
        />
        <MenuRow
          icon={Copy}
          label="Скопировать ссылку"
          onPress={() => {
            void copyTrackLink(track);
            close();
          }}
        />
      </View>
    </Modal>
  );
}

export function PlaylistPickerModal() {
  const track = useUiStore((state) => state.pickerTrack);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!track) return;
    setCreating(false);
    setName('');
    api.playlists().then(setPlaylists).catch(() => undefined);
  }, [track?.id]);

  if (!track) return null;
  const close = () => useUiStore.getState().setPickerTrack(null);

  const add = async (playlist: Playlist) => {
    setBusy(true);
    try {
      await api.addToPlaylist(playlist.id, track);
      useUiStore.getState().toast(`Добавлено в «${playlist.name}»`);
      useUiStore.getState().bumpLibrary();
      close();
    } catch {
      useUiStore.getState().toast('Не удалось добавить трек', 'error');
    } finally {
      setBusy(false);
    }
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const playlist = await api.createPlaylist(name.trim());
      await api.addToPlaylist(playlist.id, track);
      useUiStore.getState().toast(`Плейлист «${playlist.name}» создан`);
      useUiStore.getState().bumpLibrary();
      close();
    } catch {
      useUiStore.getState().toast('Не удалось создать плейлист', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={close} width={440}>
      <ModalHeader title="Добавить в плейлист" subtitle={track.title} onClose={close} />
      {creating ? (
        <View style={{ gap: 12 }}>
          <Field
            label="Название"
            value={name}
            onChangeText={setName}
            placeholder="Например, Ночная поездка"
            autoFocus
            onSubmitEditing={createAndAdd}
            maxLength={80}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Создать и добавить" onPress={createAndAdd} loading={busy} style={{ flex: 1 }} small />
            <Button label="Отмена" variant="ghost" onPress={() => setCreating(false)} small />
          </View>
        </View>
      ) : (
        <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => setCreating(true)}
            className="hoverable"
            style={{ height: 50, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={15} color={colors.textDim} />
            </View>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '550' }}>Новый плейлист</Text>
          </Pressable>
          {playlists.map((playlist) => (
            <Pressable
              key={playlist.id}
              onPress={() => void add(playlist)}
              disabled={busy}
              className="track-row"
              style={{ height: 56, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Artwork uri={playlist.cover?.thumbnail} seed={playlist.name} size={38} radius={10} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 12.5, fontWeight: '550' }}>
                  {playlist.name}
                </Text>
                <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 2 }}>{playlist.trackCount} треков</Text>
              </View>
              {busy ? <Spinner size={14} /> : <Plus size={15} color={colors.textFaint} />}
            </Pressable>
          ))}
          {playlists.length === 0 ? (
            <Text style={{ color: colors.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 20 }}>
              Пока нет плейлистов
            </Text>
          ) : null}
        </ScrollView>
      )}
    </Modal>
  );
}

export function CreatePlaylistModal() {
  const open = useUiStore((state) => state.createPlaylistOpen);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  if (!open) return null;
  const close = () => useUiStore.getState().setCreatePlaylistOpen(false);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const playlist = await api.createPlaylist(name.trim());
      useUiStore.getState().bumpLibrary();
      useUiStore.getState().toast(`Плейлист «${playlist.name}» создан`);
      close();
      useUiStore.getState().navigate({ name: 'playlist', id: playlist.id, title: playlist.name });
    } catch {
      useUiStore.getState().toast('Не удалось создать плейлист', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={close} width={420}>
      <ModalHeader title="Новый плейлист" subtitle="Собери свою коллекцию" onClose={close} />
      <View style={{ gap: 16 }}>
        <Field label="Название" value={name} onChangeText={setName} placeholder="Ночная поездка" autoFocus onSubmitEditing={create} maxLength={80} />
        <Button label="Создать плейлист" onPress={create} loading={busy} />
      </View>
    </Modal>
  );
}

export function Toasts() {
  const toasts = useUiStore((state) => state.toasts);
  if (!toasts.length) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 108, alignItems: 'center', gap: 8, zIndex: 120 }}
    >
      {toasts.map((toast: Toast) => (
        <Pressable
          key={toast.id}
          onPress={() => useUiStore.getState().dismissToast(toast.id)}
          className="glass toast"
          style={{
            minHeight: 40,
            paddingHorizontal: 15,
            paddingVertical: 10,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: toast.kind === 'error' ? 'color-mix(in srgb, var(--danger) 16%, transparent)' : 'color-mix(in srgb, var(--mint) 14%, transparent)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {toast.kind === 'error' ? <X size={10} color={colors.danger} /> : <Check size={10} color={colors.mint} />}
          </View>
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>{toast.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Modals() {
  return (
    <>
      <TrackActionsModal />
      <PlaylistPickerModal />
      <CreatePlaylistModal />
      <React.Suspense fallback={null}>
        <SettingsModal />
      </React.Suspense>
    </>
  );
}
