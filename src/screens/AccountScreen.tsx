import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  CalendarDays,
  Check,
  Clock3,
  Download,
  FolderOpen,
  Heart,
  ListMusic,
  LogOut,
  Play,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useRuntimeStore } from '../store/runtime';
import { useUiStore } from '../store/ui';
import { colors, fonts } from '../theme';
import { fmtMinutes, pluralRu } from '../lib/format';
import { Avatar, Button, Field, IconButton, Skeleton } from '../components/ui';

const ACCENTS = ['#C9B8FF', '#B9E6C9', '#F3C9B8', '#B8D8F3', '#E8D7A8', '#F0B8C8'];

function Stat({ icon: Icon, value, label, hint }: { icon: typeof Heart; value: string; label: string; hint?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 120, paddingHorizontal: 18, paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Icon size={12} color={colors.textFaint} strokeWidth={1.6} />
        <Text style={{ color: colors.textFaint, fontSize: 9, fontWeight: '650', letterSpacing: 1.3 }}>{label.toUpperCase()}</Text>
      </View>
      <Text className="display" style={{ color: colors.text, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, marginTop: 10 }}>
        {value}
      </Text>
      {hint ? <Text style={{ color: colors.textFaint, fontSize: 9.5, marginTop: 3 }}>{hint}</Text> : null}
    </View>
  );
}

function SectionCard({ title, children, style }: { title: string; children: React.ReactNode; style?: any }) {
  return (
    <View
      className="glass"
      style={[
        {
          borderRadius: 22,
          padding: 22,
          flex: 1,
          minWidth: 280,
        },
        style,
      ]}
    >
      <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 2, marginBottom: 16 }}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

export function AccountScreen() {
  const user = useAuthStore((state) => state.user);
  const stats = useAuthStore((state) => state.stats);
  const refresh = useAuthStore((state) => state.refresh);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const libraryVersion = useUiStore((state) => state.libraryVersion);
  const ytdlp = useRuntimeStore((state) => state.ytdlp);
  const info = useRuntimeStore((state) => state.info);
  const runtimeLoading = useRuntimeStore((state) => state.loading);
  const updateYtdlp = useRuntimeStore((state) => state.updateYtdlp);

  const [name, setName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [accentBusy, setAccentBusy] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.displayName || '');
  }, [user?.displayName]);

  useEffect(() => {
    void refresh();
  }, [libraryVersion, refresh]);

  if (!user) {
    return (
      <View style={{ flex: 1, padding: 36, gap: 16 }}>
        <Skeleton height={180} radius={26} />
        <Skeleton height={94} radius={22} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Skeleton height={260} radius={22} />
          <Skeleton height={260} radius={22} />
        </View>
      </View>
    );
  }

  const joinDate = new Date(user.createdAt || Date.now()).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const values = stats || { liked: 0, playlists: 0, plays: 0, minutes: 0, downloads: 0 };

  const saveName = async () => {
    const next = name.trim().slice(0, 40);
    if (!next) {
      useUiStore.getState().toast('Имя не может быть пустым', 'error');
      return;
    }
    if (next === user.displayName) {
      useUiStore.getState().toast('Имя не изменилось');
      return;
    }
    setSavingName(true);
    useAuthStore.setState({ error: null });
    await updateProfile({ displayName: next });
    const failure = useAuthStore.getState().error;
    setSavingName(false);
    useUiStore.getState().toast(failure || 'Имя обновлено', failure ? 'error' : 'success');
  };

  const chooseAccent = async (accent: string) => {
    if (accent === user.accent || accentBusy) return;
    setAccentBusy(accent);
    useAuthStore.setState({ error: null });
    await updateProfile({ accent });
    const failure = useAuthStore.getState().error;
    setAccentBusy(null);
    if (failure) useUiStore.getState().toast(failure, 'error');
  };

  const engineLabel =
    ytdlp?.state === 'ready'
      ? 'Готов'
      : ytdlp?.state === 'downloading'
        ? `Загрузка ${ytdlp.progress}%`
        : ytdlp?.state === 'missing'
          ? 'Не установлен'
          : ytdlp?.state === 'error'
            ? 'Ошибка'
            : 'Проверка…';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 36, paddingTop: 28, paddingBottom: 52 }} className="screen-scroll no-scrollbar">
      <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 2.1, marginBottom: 9 }}>АККАУНТ</Text>
      <Text className="display" style={{ color: colors.text, fontSize: 44, letterSpacing: -1.3 }}>
        Профиль
      </Text>

      <View
        className="grain fade-up"
        style={{
          marginTop: 24,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          padding: 28,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          backgroundImage: `radial-gradient(100% 160% at 0% 0%, ${user.accent}26 0%, color-mix(in srgb, var(--text) 3%, transparent) 42%, color-mix(in srgb, var(--text) 1.5%, transparent) 100%)`,
        }}
      >
        <View style={{ position: 'relative' }}>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 120,
              height: 120,
              top: -16,
              left: -16,
              borderRadius: 120,
              backgroundColor: user.accent,
              opacity: 0.18,
              filter: 'blur(24px)',
            }}
          />
          <Avatar name={user.displayName} accent={user.accent} size={92} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text numberOfLines={1} className="display" style={{ color: colors.text, fontSize: 38, letterSpacing: -1, flexShrink: 1 }}>
              {user.displayName}
            </Text>
            {user.isGuest ? (
              <View style={{ paddingHorizontal: 8, height: 21, borderRadius: 6, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textDim, fontSize: 8.5, fontWeight: '650', letterSpacing: 0.8 }}>ГОСТЬ</Text>
              </View>
            ) : (
              <ShieldCheck size={15} color={colors.mint} />
            )}
          </View>
          <Text style={{ color: colors.textDim, fontSize: 12, marginTop: 5 }}>
            {user.isGuest ? 'Локальный гостевой профиль' : `@${user.username}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 }}>
            <CalendarDays size={11} color={colors.textFaint} />
            <Text style={{ color: colors.textFaint, fontSize: 10 }}>С нами с {joinDate}</Text>
            <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint }} />
            <Text style={{ color: colors.textFaint, fontSize: 10 }}>Данные хранятся локально</Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <Button
            label="Настройки"
            icon={Settings}
            variant="soft"
            small
            onPress={() => useUiStore.getState().setSettingsOpen(true)}
          />
          {!user.isGuest ? (
            <Text style={{ color: colors.textFaint, fontSize: 9.5 }}>ID · {user.id.slice(0, 8)}</Text>
          ) : (
            <Text style={{ color: colors.textFaint, fontSize: 9.5 }}>Без пароля</Text>
          )}
        </View>
      </View>

      <View
        style={{
          marginTop: 16,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          flexWrap: 'wrap',
        }}
      >
        <Stat icon={Heart} value={String(values.liked)} label="Любимое" hint="треков" />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Stat icon={ListMusic} value={String(values.playlists)} label="Плейлисты" hint={pluralRu(values.playlists, 'подборка', 'подборки', 'подборок')} />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Stat icon={Play} value={String(values.plays)} label="Прослушано" hint="раз" />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Stat icon={Clock3} value={fmtMinutes(values.minutes)} label="Время" hint="в музыке" />
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <Stat icon={Download} value={String(values.downloads)} label="Офлайн" hint="файлов" />
      </View>

      {user.isGuest ? (
        <View
          style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'var(--accent-line)',
            backgroundColor: 'var(--accent-soft)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Sparkles size={16} color={colors.lilac} />
          <Text style={{ color: colors.textDim, fontSize: 11.5, lineHeight: 17, flex: 1 }}>
            Гостевой режим не защищён паролем: коллекцию увидит любой, кто откроет Platinum на этом компьютере. Создай аккаунт, чтобы хранить музыку отдельно.
          </Text>
          <Button label="Создать аккаунт" small variant="outline" onPress={() => void logout()} style={{ borderColor: 'var(--accent-line)' }} />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
        <SectionCard title="Профиль">
          <View style={{ gap: 14 }}>
            <Field label="Отображаемое имя" value={name} onChangeText={setName} placeholder="Как тебя называть" maxLength={40} onSubmitEditing={() => void saveName()} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Button
                label="Сохранить"
                icon={Check}
                small
                loading={savingName}
                disabled={!name.trim() || name.trim() === user.displayName}
                onPress={() => void saveName()}
              />
              {name.trim() !== user.displayName ? (
                <Text style={{ color: colors.textFaint, fontSize: 10 }}>Есть несохранённые изменения</Text>
              ) : (
                <Text style={{ color: colors.textFaint, fontSize: 10 }}>Видно только на этом устройстве</Text>
              )}
            </View>
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
            <View>
              <Text style={{ color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 11 }}>Акцентный цвет</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                {ACCENTS.map((accent) => {
                  const active = accent.toLowerCase() === user.accent.toLowerCase();
                  return (
                    <Pressable
                      key={accent}
                      onPress={() => void chooseAccent(accent)}
                      className="press-scale"
                      accessibilityLabel={`Акцент ${accent}`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 28,
                        backgroundColor: accent,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 2,
                        borderColor: active ? colors.text : colors.borderStrong,
                        opacity: accentBusy && accentBusy !== accent ? 0.5 : 1,
                      }}
                    >
                      {active ? <Check size={12} color={colors.accentInk} strokeWidth={3} /> : null}
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: colors.textFaint, fontSize: 10, marginTop: 10 }}>Используется в подсветке профиля и плеере.</Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard title="Система">
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 8,
                  backgroundColor:
                    ytdlp?.state === 'ready' ? colors.mint : ytdlp?.state === 'error' ? colors.danger : colors.gold,
                }}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>Музыкальный движок</Text>
                <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 10, marginTop: 2 }}>
                  {engineLabel}
                  {ytdlp?.version ? ` · ${ytdlp.version}` : ''}
                </Text>
              </View>
              <Button
                label="Обновить"
                icon={RefreshCw}
                variant="soft"
                small
                loading={runtimeLoading || ytdlp?.state === 'downloading'}
                onPress={() => void updateYtdlp()}
              />
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            <View style={{ gap: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.textFaint, fontSize: 10, width: 92 }}>Версия</Text>
                <Text style={{ color: colors.textDim, fontSize: 10.5 }}>Platinum {info?.version || '0.1.0'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: colors.textFaint, fontSize: 10, width: 92 }}>Платформа</Text>
                <Text style={{ color: colors.textDim, fontSize: 10.5 }}>{info?.platform || 'linux'} · Electron</Text>
              </View>
              <Pressable
                onPress={() => info?.userData && void window.platinum?.openPath(info.userData)}
                className="link-hover"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: colors.textFaint, fontSize: 10, width: 92 }}>Данные</Text>
                <Text numberOfLines={1} style={{ color: colors.textDim, fontSize: 10, flex: 1 }}>
                  {info?.userData || '—'}
                </Text>
                <FolderOpen size={12} color={colors.textFaint} />
              </Pressable>
              <Pressable
                onPress={() => info?.downloadsDir && void window.platinum?.openPath(info.downloadsDir)}
                className="link-hover"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ color: colors.textFaint, fontSize: 10, width: 92 }}>Офлайн</Text>
                <Text numberOfLines={1} style={{ color: colors.textDim, fontSize: 10, flex: 1 }}>
                  {info?.downloadsDir || '—'}
                </Text>
                <FolderOpen size={12} color={colors.textFaint} />
              </Pressable>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            {confirmLogout ? (
              <View className="fade-in" style={{ gap: 10 }}>
                <Text style={{ color: colors.textDim, fontSize: 11.5, lineHeight: 17 }}>
                  Выйти из аккаунта? Музыка останется на устройстве.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Отмена" variant="ghost" small onPress={() => setConfirmLogout(false)} />
                  <Button
                    label="Выйти"
                    icon={LogOut}
                    small
                    onPress={() => void logout()}
                    style={{ backgroundColor: 'color-mix(in srgb, var(--danger) 16%, transparent)', borderWidth: 1, borderColor: 'color-mix(in srgb, var(--danger) 34%, transparent)' }}
                  />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Button
                  label="Выйти из аккаунта"
                  icon={LogOut}
                  variant="ghost"
                  small
                  onPress={() => setConfirmLogout(true)}
                  style={{ borderWidth: 1, borderColor: colors.border }}
                />
                <IconButton icon={Settings} size={15} buttonSize={36} label="Настройки" onPress={() => useUiStore.getState().setSettingsOpen(true)} />
              </View>
            )}
          </View>
        </SectionCard>
      </View>

      <Text style={{ color: colors.textFaint, fontSize: 9.5, textAlign: 'center', marginTop: 30, lineHeight: 16 }}>
        Platinum — локальный музыкальный сервис. Аккаунт, история и коллекция не покидают этот компьютер.
        {'\n'}Музыка доступна только для личного прослушивания.
      </Text>
    </ScrollView>
  );
}
