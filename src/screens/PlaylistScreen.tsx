import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Check, ListMusic, Pencil, Play, Plus, Shuffle, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { fmtMinutes, pluralRu } from '../lib/format';
import { useAsync } from '../hooks/useAsync';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors, fonts } from '../theme';
import { Artwork, Button, EmptyState, IconButton, Skeleton } from '../components/ui';
import { TrackRow } from '../components/TrackRow';

export function PlaylistScreen({ id }: { id: string }) {
  const libraryVersion = useUiStore((state) => state.libraryVersion);
  const navigate = useUiStore((state) => state.navigate);
  const { data, loading, error, reload } = useAsync(() => api.playlist(id), [id, libraryVersion]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
  }, [id]);

  const tracks = data?.tracks ?? [];
  const totalMinutes = useMemo(
    () => Math.round(tracks.reduce((sum, track) => sum + (track.duration || 0), 0) / 60),
    [tracks],
  );

  const startEdit = () => {
    if (!data) return;
    setDraft(data.name);
    setEditing(true);
  };

  const saveName = async () => {
    if (!data) return;
    const name = draft.trim().slice(0, 80);
    if (!name) {
      useUiStore.getState().toast('Название не может быть пустым', 'error');
      return;
    }
    if (name === data.name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.updatePlaylist(id, { name });
      useUiStore.getState().toast('Плейлист переименован');
      useUiStore.getState().bumpLibrary();
      setEditing(false);
    } catch (err) {
      useUiStore.getState().toast(err instanceof Error ? err.message : 'Не удалось переименовать', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.deletePlaylist(id);
      useUiStore.getState().toast('Плейлист удалён');
      useUiStore.getState().bumpLibrary();
      navigate({ name: 'library', tab: 'playlists' });
    } catch (err) {
      useUiStore.getState().toast(err instanceof Error ? err.message : 'Не удалось удалить', 'error');
      setDeleting(false);
    }
  };

  const removeTrack = async (trackId: string) => {
    try {
      await api.removeFromPlaylist(id, trackId);
      useUiStore.getState().toast('Трек убран из плейлиста');
      useUiStore.getState().bumpLibrary();
    } catch (err) {
      useUiStore.getState().toast(err instanceof Error ? err.message : 'Не удалось убрать трек', 'error');
    }
  };

  if (loading && !data) {
    return (
      <View style={{ paddingHorizontal: 36, paddingTop: 30 }}>
        <View style={{ flexDirection: 'row', gap: 26 }}>
          <Skeleton height={216} width={216} radius={20} />
          <View style={{ flex: 1, paddingTop: 12, gap: 12 }}>
            <Skeleton height={9} width={90} />
            <Skeleton height={44} width={360} />
            <Skeleton height={11} width={220} />
            <Skeleton height={36} width={240} style={{ marginTop: 14 }} />
          </View>
        </View>
        <View style={{ gap: 8, marginTop: 36 }}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} height={56} radius={12} />
          ))}
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={ListMusic}
          title="Плейлист не найден"
          description={error || 'Возможно, он был удалён на другом устройстве.'}
          action="К библиотеке"
          onAction={() => navigate({ name: 'library', tab: 'playlists' })}
        />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 36, paddingTop: 26, paddingBottom: 52 }} className="screen-scroll no-scrollbar">
      <View style={{ flexDirection: 'row', gap: 26, alignItems: 'flex-end' }}>
        <View style={{ width: 218, height: 218, borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--art-shadow)' }}>
          <Artwork uri={data.cover?.thumbnail} seed={data.name} size={218} radius={20} />
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 100%)' }} />
        </View>

        <View style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
          <Text style={{ color: colors.textFaint, fontSize: 9, fontWeight: '700', letterSpacing: 2.2 }}>ПЛЕЙЛИСТ</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }}>
            {editing ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={() => void saveName()}
                  autoFocus
                  maxLength={80}
                  selectionColor={colors.lilac}
                  className="display"
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontFamily: fonts.display,
                    fontSize: 42,
                    letterSpacing: -1,
                    paddingVertical: 3,
                    outlineStyle: 'none',
                    borderBottomWidth: 1,
                    borderBottomColor: 'var(--accent-line)',
                  }}
                />
                <IconButton icon={Check} size={18} buttonSize={34} label="Сохранить" disabled={saving} onPress={() => void saveName()} />
                <IconButton icon={X} size={17} buttonSize={34} label="Отмена" onPress={() => setEditing(false)} />
              </View>
            ) : (
              <>
                <Text numberOfLines={1} className="display" style={{ color: colors.text, fontSize: 46, lineHeight: 50, letterSpacing: -1.4, flexShrink: 1 }}>
                  {data.name}
                </Text>
                <IconButton icon={Pencil} size={15} buttonSize={32} label="Переименовать" onPress={startEdit} />
              </>
            )}
          </View>
          <Text numberOfLines={2} style={{ color: colors.textFaint, fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 560 }}>
            {data.description || 'Личная подборка. Добавляй треки из поиска, потока или меню трека.'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <Text style={{ color: colors.textDim, fontSize: 11 }}>
              {data.trackCount} {pluralRu(data.trackCount, 'трек', 'трека', 'треков')}
            </Text>
            {tracks.length ? (
              <>
                <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint }} />
                <Text style={{ color: colors.textFaint, fontSize: 11 }}>{fmtMinutes(totalMinutes)}</Text>
              </>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 }}>
            <Button
              label="Слушать"
              icon={Play}
              disabled={!tracks.length}
              onPress={() => usePlayerStore.getState().playQueue(tracks, 0)}
              small
            />
            <Button
              label="Перемешать"
              icon={Shuffle}
              variant="soft"
              disabled={!tracks.length}
              onPress={() => usePlayerStore.getState().playQueue(tracks, Math.floor(Math.random() * tracks.length))}
              small
            />
            <Button
              label="Добавить треки"
              icon={Plus}
              variant="ghost"
              onPress={() => navigate({ name: 'search' })}
              small
              style={{ borderWidth: 1, borderColor: colors.border }}
            />
            <View style={{ flex: 1 }} />
            <IconButton
              icon={Trash2}
              size={15}
              buttonSize={34}
              label="Удалить плейлист"
              onPress={() => setConfirmDelete(true)}
            />
          </View>
        </View>
      </View>

      {confirmDelete ? (
        <View
          className="fade-in"
          style={{
            marginTop: 22,
            padding: 14,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--danger) 8%, transparent)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <Trash2 size={16} color={colors.danger} />
          <Text style={{ color: colors.textDim, fontSize: 12, flex: 1 }}>
            Удалить «{data.name}»? Треки останутся в библиотеке, плейлист исчезнет навсегда.
          </Text>
          <Button label="Отмена" variant="ghost" small onPress={() => setConfirmDelete(false)} />
          <Button
            label="Удалить"
            small
            loading={deleting}
            onPress={() => void remove()}
            style={{ backgroundColor: colors.danger }}
          />
        </View>
      ) : null}

      <View style={{ height: 1, backgroundColor: colors.border, marginTop: 28, marginBottom: 10 }} />

      {tracks.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 28 }}>
            <Text style={{ color: colors.textFaint, fontSize: 9.5, width: 24, letterSpacing: 0.5 }}>#</Text>
            <Text style={{ color: colors.textFaint, fontSize: 9.5, flex: 1, letterSpacing: 0.5 }}>ТРЕК</Text>
            <Text style={{ color: colors.textFaint, fontSize: 9.5, width: 40, textAlign: 'right', letterSpacing: 0.5 }}>ВРЕМЯ</Text>
            <View style={{ width: 30 }} />
          </View>
          {tracks.map((track, index) => (
            <TrackRow key={track.id} track={track} queue={tracks} index={index} onRemove={(entry) => void removeTrack(entry.id)} />
          ))}
        </>
      ) : (
        <EmptyState
          icon={ListMusic}
          title="В плейлисте пока пусто"
          description="Найди что-нибудь в поиске или запусти поток — добавляй треки через меню «Ещё»."
          action="Найти треки"
          onAction={() => navigate({ name: 'search' })}
        />
      )}
    </ScrollView>
  );
}
