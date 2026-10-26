import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Heart,
  ListPlus,
  MoreHorizontal,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { Track } from '@shared/types';
import { api } from '../lib/api';
import { artGradient, fmtTime } from '../lib/format';
import { downloadTrack } from '../lib/actions';
import { useAsync } from '../hooks/useAsync';
import { usePlayerStore } from '../store/player';
import { useUiStore } from '../store/ui';
import { colors, fonts } from '../theme';
import { Artwork, Button, EmptyState, IconButton, Spinner } from '../components/ui';

// Flow is an immersive, cover-led theatre. It intentionally keeps a dark
// high-contrast palette even in light themes, like a cinema screen.
const FLOW_TEXT = '#F5F2ED';
const FLOW_DIM = 'rgba(255,255,255,0.64)';
const FLOW_FAINT = 'rgba(255,255,255,0.42)';
const FLOW_LINE = 'rgba(255,255,255,0.14)';

function FlowPage({
  track,
  index,
  total,
  height,
  active,
  isCurrent,
  isPlaying,
  onPlay,
}: {
  track: Track;
  index: number;
  total: number;
  height: number;
  active: boolean;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  const [c1, c2] = artGradient(track.id);
  const liked = usePlayerStore((state) => !!state.liked[track.id]);

  return (
    <View style={{ height, position: 'relative', overflow: 'hidden' }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundImage: `linear-gradient(150deg, ${c1} 0%, ${c2} 58%, #08080A 100%)`,
        }}
      />
      {active ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -160,
            right: -160,
            bottom: -160,
            left: -160,
            backgroundImage: `url("${track.thumbnail}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(100px) saturate(120%)',
            opacity: 0.38,
            willChange: 'filter',
          }}
        />
      ) : null}
      <View pointerEvents="none" className="flow-vignette" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      <View pointerEvents="none" className="grain" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />

      <View style={{ flex: 1, paddingHorizontal: 56, paddingTop: 58, paddingBottom: 70, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 54 }}>
          <View style={{ width: 340, height: 340, alignItems: 'center', justifyContent: 'center' }}>
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 300,
                height: 300,
                borderRadius: 200,
                backgroundImage: `url("${track.thumbnail}")`,
                backgroundSize: 'cover',
                filter: 'blur(48px)',
                opacity: 0.5,
              }}
            />
            <Pressable
              onPress={onPlay}
              className="cover-card no-drag"
              style={{ width: 340, height: 340, borderRadius: 24, boxShadow: '0 42px 90px rgba(0,0,0,0.62)' }}
            >
              <Artwork uri={track.thumbnail} seed={track.title} size={340} radius={24} />
              <View
                className="cover-play"
                style={{
                  position: 'absolute',
                  right: 18,
                  bottom: 18,
                  width: 56,
                  height: 56,
                  borderRadius: 56,
                  backgroundColor: colors.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isCurrent && isPlaying ? (
                  <Pause size={21} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
                ) : (
                  <Play size={21} color={colors.accentInk} fill={colors.accentInk} strokeWidth={0} />
                )}
              </View>
            </Pressable>
          </View>

          <View style={{ flex: 1, maxWidth: 580 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Text style={{ color: colors.lilac, fontSize: 8.5, fontWeight: '700', letterSpacing: 2.2 }}>ПОТОК · ПЕРСОНАЛЬНО</Text>
              <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: FLOW_FAINT }} />
              <Text style={{ color: FLOW_FAINT, fontSize: 8.5, letterSpacing: 1 }}>{String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</Text>
            </View>
            <Text numberOfLines={3} className="display" style={{ color: FLOW_TEXT, fontSize: 58, lineHeight: 60, letterSpacing: -2, marginTop: 16 }}>
              {track.title}
            </Text>
            <Text style={{ color: FLOW_DIM, fontSize: 12, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase', marginTop: 16 }}>
              {track.artist}
            </Text>
            <Text style={{ color: FLOW_FAINT, fontSize: 11, marginTop: 10 }}>
              {fmtTime(track.duration)} · YouTube · AAC
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 30 }}>
              <Pressable
                onPress={onPlay}
                className="press-scale no-drag"
                style={{ height: 48, paddingHorizontal: 22, borderRadius: 999, backgroundColor: FLOW_TEXT, flexDirection: 'row', alignItems: 'center', gap: 9 }}
              >
                {isCurrent && isPlaying ? (
                  <Pause size={16} color="#101010" fill="#101010" strokeWidth={0} />
                ) : (
                  <Play size={16} color="#101010" fill="#101010" strokeWidth={0} />
                )}
                <Text style={{ color: '#101010', fontSize: 13, fontWeight: '650' }}>{isCurrent && isPlaying ? 'Пауза' : 'Слушать'}</Text>
              </Pressable>
              <Pressable
                onPress={() => void usePlayerStore.getState().toggleLike(track)}
                className="icon-btn no-drag"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 42,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: liked ? 'var(--accent-line)' : FLOW_LINE,
                  backgroundColor: liked ? 'var(--accent-soft)' : 'rgba(255,255,255,0.045)',
                }}
              >
                <Heart size={16} color={liked ? colors.lilac : FLOW_DIM} fill={liked ? colors.lilac : 'transparent'} strokeWidth={1.7} />
              </Pressable>
              <IconButton
                icon={ListPlus}
                size={16}
                buttonSize={42}
                label="В плейлист"
                onPress={() => useUiStore.getState().setPickerTrack(track)}
                style={{ borderWidth: 1, borderColor: FLOW_LINE, backgroundColor: 'rgba(255,255,255,0.045)' }}
              />
              <IconButton
                icon={Download}
                size={16}
                buttonSize={42}
                label="Скачать"
                onPress={() => downloadTrack(track)}
                style={{ borderWidth: 1, borderColor: FLOW_LINE, backgroundColor: 'rgba(255,255,255,0.045)' }}
              />
              <IconButton
                icon={MoreHorizontal}
                size={17}
                buttonSize={42}
                label="Ещё"
                onPress={() => useUiStore.getState().setTrackMenu(track)}
                style={{ borderWidth: 1, borderColor: FLOW_LINE, backgroundColor: 'rgba(255,255,255,0.045)' }}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function FlowScreen() {
  const [exclude, setExclude] = useState<string[]>([]);
  const { data, loading, error, reload } = useAsync(() => api.flow(exclude), [exclude.join(',')]);
  const currentId = usePlayerStore((state) => state.current?.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const [index, setIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const scrollRef = useRef<any>(null);
  const hostRef = useRef<any>(null);
  const startAt = useRef(Date.now());

  const tracks = data?.tracks ?? [];

  useEffect(() => {
    if (!data) return;
    setIndex(0);
    startAt.current = Date.now();
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
  }, [data]);

  // React Native Web can skip the first onLayout event for a freshly mounted
  // screen. Measure the stage directly so the paged feed is never left empty.
  useEffect(() => {
    if (!data) return;
    const node = hostRef.current as HTMLElement | null;
    if (!node) return;
    const measure = () => {
      const height = Math.round(node.getBoundingClientRect().height);
      if (height > 0) setPageHeight(height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [data]);

  const handleScroll = (event: any) => {
    if (!pageHeight || !tracks.length) return;
    if (Date.now() - startAt.current < 650) return;
    const next = Math.max(0, Math.min(tracks.length - 1, Math.round(event.nativeEvent.contentOffset.y / pageHeight)));
    if (next === index) return;
    setIndex(next);
    const playing = usePlayerStore.getState().isPlaying;
    const current = usePlayerStore.getState().current;
    if (playing && current?.id !== tracks[next].id) {
      usePlayerStore.getState().playTrack(tracks[next], tracks);
    }
  };

  const jump = (next: number) => {
    if (!pageHeight || !tracks.length) return;
    const target = Math.max(0, Math.min(tracks.length - 1, next));
    scrollRef.current?.scrollTo?.({ y: target * pageHeight, animated: true });
    setIndex(target);
  };

  const playAt = (track: Track) => {
    const current = usePlayerStore.getState().current;
    if (current?.id === track.id) usePlayerStore.getState().toggle();
    else usePlayerStore.getState().playTrack(track, tracks);
  };

  const refresh = () => {
    if (tracks.length) setExclude(tracks.map((track) => track.id));
    else reload();
  };

  if (loading && !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
        <View style={{ width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Spinner size={20} color={colors.lilac} />
        </View>
        <Text className="display" style={{ color: colors.text, fontSize: 30, letterSpacing: -0.8 }}>
          Собираю поток
        </Text>
        <Text style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 8 }}>Подбираю треки под твой вкус…</Text>
      </View>
    );
  }

  if (!data || !tracks.length) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState
          icon={Sparkles}
          title="Поток не собрался"
          description={error || 'Не удалось получить рекомендации. Попробуй ещё раз.'}
          action="Собрать заново"
          onAction={reload}
        />
      </View>
    );
  }

  return (
    <View
      ref={hostRef}
      style={{ flex: 1, position: 'relative' }}
      onLayout={(event: any) => {
        const height = Math.round(event.nativeEvent.layout.height);
        if (height > 0) setPageHeight(height);
      }}
    >
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 18, left: 56, right: 56, zIndex: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Sparkles size={13} color={colors.lilac} />
          <Text style={{ color: FLOW_DIM, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.6 }}>БЕСКОНЕЧНЫЙ ПОТОК</Text>
        </View>
        <Button
          label="Обновить"
          icon={RefreshCw}
          variant="ghost"
          small
          onPress={refresh}
          style={{ borderWidth: 1, borderColor: FLOW_LINE, backgroundColor: 'rgba(255,255,255,0.06)' }}
          textColor={FLOW_TEXT}
        />
      </View>

      {pageHeight > 0 ? (
        <ScrollView
          ref={scrollRef}
          pagingEnabled
          snapToInterval={pageHeight}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={80}
          className="flow-scroll no-scrollbar"
        >
          {tracks.map((track, trackIndex) => (
            <FlowPage
              key={`${track.id}-${trackIndex}`}
              track={track}
              index={trackIndex}
              total={tracks.length}
              height={pageHeight}
              active={Math.abs(trackIndex - index) <= 1}
              isCurrent={currentId === track.id}
              isPlaying={isPlaying}
              onPlay={() => playAt(track)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', right: 40, bottom: 30, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 10 }}
      >
        <Text style={{ color: FLOW_FAINT, fontSize: 9.5, letterSpacing: 1.2 }}>
          {String(index + 1).padStart(2, '0')} — {String(tracks.length).padStart(2, '0')}
        </Text>
        <IconButton
          icon={ChevronUp}
          size={16}
          buttonSize={32}
          label="Предыдущий"
          onPress={() => jump(index - 1)}
          iconColor={FLOW_DIM}
          style={{ borderWidth: 1, borderColor: FLOW_LINE }}
        />
        <IconButton
          icon={ChevronDown}
          size={16}
          buttonSize={32}
          label="Следующий"
          onPress={() => jump(index + 1)}
          iconColor={FLOW_DIM}
          style={{ borderWidth: 1, borderColor: FLOW_LINE }}
        />
      </View>
    </View>
  );
}
