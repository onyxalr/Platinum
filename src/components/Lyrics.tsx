import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AudioLines } from 'lucide-react';
import type { Lyrics, Track } from '@shared/types';
import { api } from '../lib/api';
import { usePlayerStore } from '../store/player';
import { colors, fonts } from '../theme';
import { Button, Skeleton } from './ui';

const cache = new Map<string, Lyrics>();

function activeLineIndex(synced: { time: number }[] | null, position: number): number {
  if (!synced || !synced.length) return -1;
  let index = -1;
  for (let i = 0; i < synced.length; i++) {
    if (synced[i].time <= position + 0.12) index = i;
    else break;
  }
  return index;
}

export function LyricsPane({ track }: { track: Track }) {
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const offsets = useRef<number[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const key = `${track.id}:${track.title}:${track.artist}`;

  useEffect(() => {
    let alive = true;
    const cached = cache.get(key);
    if (cached) {
      setLyrics(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLyrics(null);
    offsets.current = [];
    api
      .lyrics(track)
      .then((value) => {
        if (!alive) return;
        if (value.synced?.length || value.plain) cache.set(key, value);
        setLyrics(value);
      })
      .catch(() => {
        if (alive) setLyrics({ synced: null, plain: null, source: 'LRCLIB' });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const activeIndex = usePlayerStore((state) => activeLineIndex(lyrics?.synced ?? null, state.position));

  useEffect(() => {
    if (activeIndex < 0) return;
    const offset = offsets.current[activeIndex];
    if (offset === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, offset - 120), animated: true });
  }, [activeIndex]);

  if (loading) {
    return (
      <View style={{ paddingTop: 8, gap: 18 }}>
        <Skeleton height={12} width={90} radius={6} />
        {[78, 62, 88, 54, 70, 44, 82, 58, 74, 50].map((width, index) => (
          <Skeleton key={index} height={index === 0 ? 24 : 16} width={`${width}%`} radius={7} />
        ))}
      </View>
    );
  }

  if (!lyrics || (!lyrics.synced?.length && !lyrics.plain)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 18,
          }}
        >
          <AudioLines size={22} color={colors.textDim} strokeWidth={1.5} />
        </View>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Текст не найден</Text>
        <Text style={{ color: colors.textFaint, fontSize: 12.5, marginTop: 7, textAlign: 'center', maxWidth: 300, lineHeight: 19 }}>
          Мы не нашли текст этого трека на LRCLIB. Попробуй другой трек — синхронизация появится автоматически.
        </Text>
        <Button
          label="Повторить"
          variant="soft"
          small
          style={{ marginTop: 16 }}
          onPress={() => {
            cache.delete(key);
            setLyrics(null);
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      </View>
    );
  }

  if (lyrics.synced?.length) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6 }}>СИНХРОНИЗИРОВАННЫЙ ТЕКСТ</Text>
          <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint }} />
          <Text style={{ color: colors.textFaint, fontSize: 9.5, letterSpacing: 0.4 }}>{lyrics.source}</Text>
        </View>
        <ScrollView
          ref={scrollRef}
          className="lyrics-scroll no-scrollbar"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 140 }}
        >
          {lyrics.synced.map((line, index) => {
            const active = index === activeIndex;
            const passed = index < activeIndex;
            return (
              <Text
                key={`${line.time}-${index}`}
                className={`lyric-line ${active ? 'is-active' : ''}`}
                onLayout={(event: any) => {
                  offsets.current[index] = event.nativeEvent.layout.y;
                }}
                style={{
                  fontFamily: fonts.ui,
                  fontSize: active ? 24 : 19,
                  lineHeight: active ? 34 : 29,
                  fontWeight: active ? '650' : '500',
                  letterSpacing: active ? -0.6 : -0.25,
                  color: active ? colors.text : passed ? colors.textFaint : colors.textDim,
                  paddingVertical: active ? 7 : 4,
                  opacity: active ? 1 : 0.92,
                }}
              >
                {line.text}
              </Text>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView className="lyrics-scroll no-scrollbar" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 12, paddingBottom: 60 }}>
      <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.6, marginBottom: 14 }}>
        ТЕКСТ · {lyrics.source}
      </Text>
      {String(lyrics.plain)
        .split('\n')
        .map((line, index) => (
          <Text
            key={index}
            style={{
              color: line.trim() ? colors.textDim : 'transparent',
              fontSize: 18,
              lineHeight: 30,
              fontWeight: '500',
              letterSpacing: -0.2,
            }}
          >
            {line || ' '}
          </Text>
        ))}
    </ScrollView>
  );
}
