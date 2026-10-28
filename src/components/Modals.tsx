import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import {
  Check,
  Copy,
  Download,
  FileText,
  Heart,
  Link2,
  ListMusic,
  ListPlus,
  Play,
  Plus,
  SkipForward,
  Upload,
  X,
} from 'lucide-react';
import type { Playlist } from '@shared/types';
import { api, ApiError } from '../lib/api';
import { copyTrackLink, downloadTrack } from '../lib/actions';
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
          <Pressable
            onPress={() => {
              const artist = track.channelName || track.artist;
              close();
              useUiStore.getState().navigate({ name: 'artist', artist });
            }}
            className="artist-link"
            style={{ alignSelf: 'flex-start', marginTop: 3 }}
          >
            <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5 }}>
              {track.artist}
            </Text>
          </Pressable>
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
          icon={Copy}
          label="Скопировать название"
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

type ImportMode = 'link' | 'text' | 'file';

const IMPORT_MODES: Array<{ id: ImportMode; label: string; icon: typeof Link2 }> = [
  { id: 'link', label: 'Ссылка', icon: Link2 },
  { id: 'text', label: 'Список', icon: ListMusic },
  { id: 'file', label: 'Файл', icon: Upload },
];

export function ImportModal() {
  const open = useUiStore((state) => state.importOpen);
  const [mode, setMode] = useState<ImportMode>('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('link');
    setUrl('');
    setText('');
    setName('');
    setFileName('');
    setBusy(false);
    setError(null);
  }, [open]);

  if (!open) return null;
  const close = () => useUiStore.getState().setImportOpen(false);

  const submit = async () => {
    setError(null);
    if (mode === 'link' && !url.trim()) {
      setError('Вставь ссылку на плейлист');
      return;
    }
    if (mode !== 'link' && !text.trim()) {
      setError(mode === 'file' ? 'Сначала выбери файл' : 'Вставь список треков');
      return;
    }
    setBusy(true);
    try {
      const result = await api.importPlaylist({
        url: mode === 'link' ? url.trim() : undefined,
        text: mode === 'link' ? undefined : text,
        name: name.trim() || undefined,
      });
      useUiStore.getState().toast(`Импортировано ${result.matched} из ${result.total}`);
      if (result.skipped.length) {
        useUiStore.getState().toast(`${result.skipped.length} треков не найдены`, 'error');
      }
      useUiStore.getState().bumpLibrary();
      close();
      useUiStore.getState().navigate({ name: 'playlist', id: result.playlist.id, title: result.playlist.name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось импортировать плейлист');
    } finally {
      setBusy(false);
    }
  };

  const readFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 900_000) {
      setError('Файл больше 900 КБ — используй список или ссылку');
      return;
    }
    try {
      const value = await file.text();
      setText(value);
      setFileName(file.name);
      if (!name.trim()) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
      setError(null);
    } catch {
      setError('Не удалось прочитать файл');
    }
  };

  return (
    <Modal onClose={close} width={500}>
      <ModalHeader
        title="Импорт из другого сервиса"
        subtitle="Spotify, Apple Music, Яндекс Музыка — ссылка или экспорт"
        onClose={close}
      />
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {IMPORT_MODES.map((item) => {
            const Icon = item.icon;
            const active = mode === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setMode(item.id);
                  setError(null);
                }}
                className="tab-pill"
                style={{
                  height: 32,
                  paddingHorizontal: 13,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  borderWidth: 1,
                  borderColor: active ? colors.borderStrong : colors.border,
                  backgroundColor: active ? colors.surfaceStrong : 'transparent',
                }}
              >
                <Icon size={13} color={active ? colors.text : colors.textFaint} strokeWidth={1.8} />
                <Text style={{ color: active ? colors.text : colors.textFaint, fontSize: 11.5, fontWeight: '600' }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'link' ? (
          <Field
            label="Ссылка на плейлист"
            value={url}
            onChangeText={setUrl}
            placeholder="https://open.spotify.com/playlist/…"
            icon={Link2}
            autoFocus
          />
        ) : mode === 'text' ? (
          <View style={{ gap: 7 }}>
            <Text style={{ color: colors.textDim, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Список треков
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              placeholder={'Исполнитель — Название\nИсполнитель — Название\nили CSV / JSON / M3U'}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.lilac}
              style={{
                minHeight: 154,
                maxHeight: 220,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: colors.text,
                fontSize: 12.5,
                lineHeight: 20,
                fontFamily: 'var(--font-ui)',
                outlineStyle: 'none',
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.json,.txt,.m3u,.m3u8"
              style={{ display: 'none' }}
              onChange={readFile}
            />
            <Pressable
              onPress={() => fileRef.current?.click()}
              className="import-drop no-drag"
              style={{
                minHeight: 138,
                borderRadius: 16,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: text ? colors.borderStrong : colors.border,
                backgroundColor: colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                padding: 18,
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={18} color={text ? colors.lilac : colors.textDim} />
              </View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                {fileName || 'Выбрать CSV, JSON или M3U'}
              </Text>
              <Text style={{ color: colors.textFaint, fontSize: 10.5, textAlign: 'center', lineHeight: 16 }}>
                Экспорт из Spotify, Apple Music или Яндекс Музыки. До 40 треков за один импорт.
              </Text>
            </Pressable>
          </View>
        )}

        <Field
          label="Название плейлиста"
          value={name}
          onChangeText={setName}
          placeholder="Например, Из Spotify"
          maxLength={80}
        />

        <View
          className="import-note"
          style={{
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: 'color-mix(in srgb, var(--lilac) 5%, transparent)',
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <MusicIcon />
          <Text style={{ color: colors.textFaint, fontSize: 10.5, lineHeight: 16, flex: 1 }}>
            Platinum сопоставит каждый трек с официальным каталогом и сохранит совпадения в новый плейлист.
            Импорт выполняется локально.
          </Text>
        </View>

        {error ? <Text style={{ color: colors.danger, fontSize: 11.5, lineHeight: 16 }}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
          <Button label="Отмена" variant="ghost" small onPress={close} />
          <Button label="Импортировать" icon={Download} small loading={busy} onPress={submit} />
        </View>
      </View>
    </Modal>
  );
}

function MusicIcon() {
  return (
    <View style={{ width: 20, height: 20, borderRadius: 7, backgroundColor: 'var(--accent-soft)', alignItems: 'center', justifyContent: 'center' }}>
      <ListPlus size={11} color={colors.lilac} />
    </View>
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
      <ImportModal />
      <React.Suspense fallback={null}>
        <SettingsModal />
      </React.Suspense>
    </>
  );
}
