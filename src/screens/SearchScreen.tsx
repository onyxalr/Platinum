import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BadgeCheck, Music2, Play, Search, Shuffle, Sparkles, X } from 'lucide-react';
import type { SearchResponse } from '@shared/types';
import { api } from '../lib/api';
import { pluralRu } from '../lib/format';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors, fonts } from '../theme';
import { Artwork, Button, EmptyState, IconButton, Skeleton } from '../components/ui';
import { TrackRow } from '../components/TrackRow';

const QUICK = ['synthwave', 'lofi hip hop', 'phonk', 'r&b', 'jazz', 'instrumental'];

export function SearchScreen() {
  const route = useUiStore((state) => state.route);
  const routeQuery = route.name === 'search' ? route.query : undefined;
  const focusToken = useUiStore((state) => state.searchFocus);
  const [query, setQuery] = useState(routeQuery || '');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);
  const lastRun = useRef('');

  const execute = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const response = await api.search(value);
      if (id !== requestId.current) return;
      setData(response);
      lastRun.current = value;
    } catch (err) {
      if (id !== requestId.current) return;
      setData(null);
      setError(err instanceof Error ? err.message : 'Поиск не удался');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    if (routeQuery && routeQuery !== query) {
      setQuery(routeQuery);
      void execute(routeQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeQuery]);

  useEffect(() => {
    if (!query.trim()) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => {
      if (lastRun.current !== query.trim()) void execute(query);
    }, 480);
    return () => clearTimeout(timeout);
  }, [query, execute]);

  useEffect(() => {
    if (!showSuggestions || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    const timeout = setTimeout(() => {
      api
        .suggest(query.trim())
        .then((response) => {
          if (alive) setSuggestions(response.suggestions);
        })
        .catch(() => undefined);
    }, 220);
    return () => {
      alive = false;
      clearTimeout(timeout);
    };
  }, [query, showSuggestions]);

  const pick = (value: string) => {
    setQuery(value);
    setShowSuggestions(false);
    inputRef.current?.blur();
    void execute(value);
  };

  const clear = () => {
    setQuery('');
    setData(null);
    setError(null);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const tracks = data?.tracks ?? [];
  const top = data?.top ?? null;
  const rest = top ? tracks.filter((track) => track.id !== top.id) : tracks;

  return (
    <View style={{ flex: 1 }}>
      <View className="content-pad" style={{ paddingTop: 26, zIndex: 20 }}>
        <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 2.1, marginBottom: 10 }}>ПОИСК</Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <Text className="display" style={{ color: colors.text, fontSize: 42, letterSpacing: -1.2 }}>
            Что послушаем?
          </Text>
          <Text style={{ color: colors.textFaint, fontSize: 10.5, marginBottom: 7 }}>Официальный каталог · полные треки</Text>
        </View>

        <View style={{ position: 'relative', zIndex: 30 }}>
          <View
            className="search-field"
            style={{
              height: 54,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              gap: 12,
            }}
          >
            <Search size={18} color={colors.textDim} strokeWidth={1.7} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={(value: string) => {
                setQuery(value);
                setShowSuggestions(true);
              }}
              onSubmitEditing={() => {
                void execute(query);
                inputRef.current?.blur();
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 140)}
              placeholder="Трек, исполнитель или настроение…"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.lilac}
              style={{ flex: 1, color: colors.text, fontSize: 15, fontFamily: fonts.ui, letterSpacing: -0.2, outlineStyle: 'none' }}
            />
            {query ? (
              <IconButton icon={X} size={15} buttonSize={28} label="Очистить" onPress={clear} />
            ) : (
              <View style={{ paddingHorizontal: 7, height: 21, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textFaint, fontSize: 9.5 }}>Enter</Text>
              </View>
            )}
          </View>

          {showSuggestions && suggestions.length > 0 ? (
            <View
              className="glass fade-in"
              style={{
                position: 'absolute',
                top: 60,
                left: 0,
                right: 0,
                borderRadius: 16,
                paddingVertical: 6,
                zIndex: 40,
                overflow: 'hidden',
                boxShadow: 'var(--shadow)',
              }}
            >
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => pick(suggestion)}
                  className="menu-row"
                  style={{ height: 40, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 11 }}
                >
                  <Search size={13} color={colors.textFaint} />
                  <Text numberOfLines={1} style={{ color: colors.textDim, fontSize: 12.5 }}>
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, marginBottom: 3 }}>
          <Text style={{ color: colors.textFaint, fontSize: 9.5, marginRight: 2 }}>Популярное</Text>
          {QUICK.map((item) => (
            <Pressable
              key={item}
              onPress={() => pick(item)}
              className="tab-pill"
              style={{
                height: 26,
                paddingHorizontal: 11,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textDim, fontSize: 10.5 }}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 36, paddingTop: 20, paddingBottom: 48 }} className="screen-scroll no-scrollbar">
        {loading ? (
          <View style={{ gap: 10, paddingTop: 8 }}>
            <Skeleton height={12} width={150} />
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <View key={index} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', height: 58 }}>
                <Skeleton height={42} width={42} radius={9} />
                <View style={{ flex: 1, gap: 7 }}>
                  <Skeleton height={11} width={`${52 + ((index * 13) % 30)}%`} />
                  <Skeleton height={9} width={`${28 + ((index * 7) % 18)}%`} />
                </View>
                <Skeleton height={10} width={36} />
              </View>
            ))}
          </View>
        ) : error ? (
          <EmptyState
            icon={Music2}
            title="Поиск не отвечает"
            description={error}
            action="Повторить"
            onAction={() => void execute(query)}
          />
        ) : !query.trim() ? (
          <View style={{ paddingTop: 46, alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}>
              <Sparkles size={24} color={colors.lilac} strokeWidth={1.4} />
            </View>
            <Text className="display" style={{ color: colors.text, fontSize: 38, letterSpacing: -1 }}>
              Начни с одной строки
            </Text>
            <Text style={{ color: colors.textFaint, fontSize: 12.5, lineHeight: 20, textAlign: 'center', maxWidth: 420, marginTop: 11 }}>
              Исполнитель, название или настроение. Platinum найдёт полный трек и подтянет текст песни.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, marginTop: 26, maxWidth: 520 }}>
              {QUICK.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => pick(item)}
                  className="tab-pill"
                  style={{
                    height: 38,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.textDim, fontSize: 12 }}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : data && tracks.length === 0 ? (
          <EmptyState icon={Music2} title="Ничего не нашлось" description="Попробуй другое название, исполнителя или более короткий запрос." />
        ) : data ? (
          <View className="fade-up">
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: colors.textFaint, fontSize: 10.5 }}>
                Найдено {tracks.length} · по запросу «{data.query}»
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Button
                  label="Слушать всё"
                  icon={Play}
                  small
                  onPress={() => usePlayerStore.getState().playQueue(tracks, 0)}
                />
                <Button
                  label=""
                  icon={Shuffle}
                  small
                  variant="soft"
                  onPress={() => usePlayerStore.getState().playQueue(tracks, Math.floor(Math.random() * tracks.length))}
                />
              </View>
            </View>

            {data.artists?.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="no-scrollbar"
                contentContainerStyle={{ gap: 9, paddingBottom: 18 }}
              >
                {data.artists.map((artist) => (
                  <Pressable
                    key={artist.name}
                    onPress={() => useUiStore.getState().navigate({ name: 'artist', artist: artist.name })}
                    className="artist-chip no-drag"
                    style={{
                      height: 46,
                      paddingLeft: 6,
                      paddingRight: 14,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 9,
                    }}
                  >
                    <Artwork uri={artist.thumbnail} seed={artist.name} size={34} radius={17} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 11.5, fontWeight: '600' }}>{artist.name}</Text>
                        <BadgeCheck size={11} color={colors.lilac} strokeWidth={2.2} />
                      </View>
                      <Text style={{ color: colors.textFaint, fontSize: 9.5, marginTop: 1 }}>
                        {artist.trackCount} {pluralRu(artist.trackCount, 'трек', 'трека', 'треков')} · страница
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 26, alignItems: 'flex-start' }}>
              {top ? (
                <View
                  style={{
                    width: 302,
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    padding: 18,
                  }}
                >
                  <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 1.8, marginBottom: 12 }}>ЛУЧШИЙ РЕЗУЛЬТАТ</Text>
                  <Pressable
                    onPress={() => usePlayerStore.getState().playTrack(top, tracks)}
                    className="cover-card no-drag"
                    style={{ width: 266, height: 266 }}
                  >
                    <Artwork uri={top.thumbnail} seed={top.title} size={266} radius={16} />
                    <View
                      className="cover-play"
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 12,
                        width: 44,
                        height: 44,
                        borderRadius: 44,
                        backgroundColor: colors.text,
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-soft)',
                      }}
                    >
                      <Play size={17} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
                    </View>
                  </Pressable>
                  <Text numberOfLines={2} style={{ color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '650', letterSpacing: -0.5, marginTop: 16 }}>
                    {top.title}
                  </Text>
                  <Pressable
                    onPress={() => useUiStore.getState().navigate({ name: 'artist', artist: top.channelName || top.artist })}
                    className="artist-link"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, alignSelf: 'flex-start' }}
                  >
                    <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5 }}>
                      {top.artist}
                    </Text>
                    {top.verified ? <BadgeCheck size={11} color={colors.lilac} strokeWidth={2.2} /> : null}
                  </Pressable>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    <Pressable
                      onPress={() => usePlayerStore.getState().playTrack(top, tracks)}
                      className="press-scale"
                      style={{ height: 30, paddingHorizontal: 13, borderRadius: 999, backgroundColor: colors.text, flexDirection: 'row', alignItems: 'center', gap: 7 }}
                    >
                      <Play size={11} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
                      <Text style={{ color: colors.accentInk, fontSize: 11, fontWeight: '650' }}>Слушать</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => usePlayerStore.getState().addToQueue(top)}
                      className="tab-pill"
                      style={{ height: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: colors.textDim, fontSize: 10.5 }}>В очередь</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={{ flex: 1, minWidth: 0 }}>
                {rest.map((track, index) => (
                  <TrackRow key={track.id} track={track} queue={tracks} index={index} showArtwork compact />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
