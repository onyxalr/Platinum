import React, { useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AtSign, Lock, Sparkles, User } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { colors, fonts } from '../theme';
import { Button, Field } from '../components/ui';
import { TitleBar } from '../components/TitleBar';
import { LogoMark, LogoWordmark } from '../components/Logo';

type Mode = 'login' | 'register';

function Cover({
  from,
  to,
  letter,
  label,
  meta,
  style,
  compact = false,
}: {
  from: string;
  to: string;
  letter: string;
  label: string;
  meta: string;
  style: any;
  compact?: boolean;
}) {
  return (
    <View
      className="grain"
      style={[
        {
          position: 'absolute',
          width: 166,
          height: 166,
          borderRadius: 18,
          overflow: 'hidden',
          backgroundImage: `linear-gradient(150deg, ${from} 0%, ${to} 100%)`,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.13)',
          boxShadow: '0 28px 60px rgba(0,0,0,0.55)',
          padding: 15,
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <Text className="display" style={{ color: 'rgba(255,255,255,0.34)', fontSize: compact ? 52 : 62, lineHeight: compact ? 50 : 60 }}>
        {letter}
      </Text>
      <View>
        <Text style={{ color: 'rgba(255,255,255,0.86)', fontSize: 10.5, fontWeight: '650', letterSpacing: 1.5 }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5, letterSpacing: 0.8, marginTop: 3 }}>{meta}</Text>
      </View>
    </View>
  );
}

export function AuthScreen() {
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const guest = useAuthStore((state) => state.guest);
  const error = useAuthStore((state) => state.error);
  const status = useAuthStore((state) => state.status);

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const submitting = status === 'loading';
  const { width, height } = useWindowDimensions();
  const compact = width < 1180 || height < 760;

  const dateLabel = useMemo(() => {
    const value = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    return value.toUpperCase();
  }, []);

  const submit = async () => {
    setLocalError(null);
    if (mode === 'register' && !displayName.trim()) {
      setLocalError('Как тебя называть?');
      return;
    }
    if (!username.trim() || !password) {
      setLocalError('Заполни все поля');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setLocalError('Пароль — минимум 6 символов');
      return;
    }
    if (mode === 'login') await login(username.trim(), password);
    else await register(username.trim(), password, displayName.trim());
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setLocalError(null);
    useAuthStore.getState().clearError();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, overflow: 'hidden' }}>
      <TitleBar />
      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        <View style={{ flex: 1, minHeight: 0, paddingHorizontal: compact ? 46 : 62, paddingVertical: compact ? 26 : 42, justifyContent: 'space-between', overflow: 'hidden' }}>
          <View pointerEvents="none" className="orb orb-a" style={{ width: 420, height: 420, top: -130, left: -100, backgroundColor: 'rgba(201,184,255,0.10)' }} />
          <View pointerEvents="none" className="orb orb-b" style={{ width: 360, height: 360, bottom: -60, left: 320, backgroundColor: 'rgba(185,230,201,0.055)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <LogoMark size={30} glow />
            <LogoWordmark size={24} style={{ letterSpacing: -0.7 }} />
            <Text style={{ color: colors.textFaint, fontSize: 8.5, letterSpacing: 2, fontWeight: '700', marginLeft: 4, marginTop: 6 }}>LOCAL MUSIC SYSTEM</Text>
          </View>

          <View style={{ marginTop: compact ? 2 : 10 }}>
            <Text style={{ color: colors.textFaint, fontSize: 9.5, fontWeight: '700', letterSpacing: 2.6, marginBottom: compact ? 13 : 18 }}>
              ЧАСТНАЯ КОЛЛЕКЦИЯ · {dateLabel}
            </Text>
            <Text
              className="display"
              style={{
                color: colors.text,
                fontSize: compact ? 48 : 62,
                lineHeight: compact ? 50 : 64,
                letterSpacing: compact ? -1.6 : -2.2,
                maxWidth: compact ? 560 : 700,
              }}
            >
              Музыка,{'\n'}которая остаётся{' '}
              <Text className="platinum-text">
                твоей.
              </Text>
            </Text>
            <Text style={{ color: colors.textDim, fontSize: compact ? 12.5 : 13.5, lineHeight: compact ? 20 : 22, maxWidth: 430, marginTop: compact ? 16 : 22 }}>
              Приватный стриминг для Linux. Без подписок, рекламы и лишнего шума — только ты, твоя коллекция и любимые треки.
            </Text>

            <View style={{ height: compact ? 200 : 236, marginTop: compact ? 18 : 26, position: 'relative' }}>
              <Cover compact={compact} from="#3B2A6B" to="#0C0A13" letter="N" label="NOCTURNE" meta="SYNTH · 2026" style={compact ? { left: 2, top: 36, transform: 'rotate(-7deg)' } : { left: 2, top: 42, transform: 'rotate(-7deg)' }} />
              <Cover compact={compact} from="#1C3A30" to="#0A0D0B" letter="S" label="SILK" meta="SOUL · 2026" style={compact ? { left: 116, top: 4, transform: 'rotate(2.5deg)', width: 158, height: 158, zIndex: 2 } : { left: 138, top: 8, transform: 'rotate(2.5deg)', width: 190, height: 190, zIndex: 2 }} />
              <Cover compact={compact} from="#48222A" to="#120B0C" letter="A" label="AFTER HOURS" meta="R&B · 2026" style={compact ? { left: 274, top: 44, transform: 'rotate(8deg)' } : { left: 326, top: 52, transform: 'rotate(8deg)' }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {['YouTube без VPN', 'Локальные аккаунты', 'Тексты LRCLIB'].map((item, index) => (
              <React.Fragment key={item}>
                {index > 0 ? <View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.textFaint }} /> : null}
                <Text style={{ color: colors.textFaint, fontSize: 10, letterSpacing: 0.4 }}>{item}</Text>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ width: compact ? 440 : 470, minHeight: 0, paddingRight: compact ? 36 : 54, paddingLeft: 6, justifyContent: 'center' }}>
          <View
            className="glass fade-up"
            style={{
              borderRadius: compact ? 24 : 28,
              padding: compact ? 24 : 30,
              boxShadow: 'var(--shadow)',
            }}
          >
            <Text style={{ color: colors.textFaint, fontSize: 8.5, fontWeight: '700', letterSpacing: 2.4 }}>PRIVATE ACCESS</Text>
            <Text style={{ color: colors.text, fontSize: 25, fontWeight: '650', letterSpacing: -0.8, marginTop: 9 }}>
              {mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}
            </Text>
            <Text style={{ color: colors.textFaint, fontSize: 12, lineHeight: 18, marginTop: 7 }}>
              {mode === 'login' ? 'Войди, чтобы вернуться к своей музыке.' : 'Аккаунт живёт только на этом устройстве.'}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                gap: 3,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 3,
                marginTop: 22,
                marginBottom: 20,
              }}
            >
              {[
                { id: 'login' as Mode, label: 'Вход' },
                { id: 'register' as Mode, label: 'Регистрация' },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => switchMode(item.id)}
                  className="tab-pill"
                  style={{
                    flex: 1,
                    height: 32,
                    borderRadius: 9,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: mode === item.id ? colors.surfaceStrong : 'transparent',
                  }}
                >
                  <Text style={{ color: mode === item.id ? colors.text : colors.textFaint, fontSize: 11.5, fontWeight: '600' }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ gap: 13 }}>
              {mode === 'register' ? (
                <Field label="Имя" value={displayName} onChangeText={setDisplayName} placeholder="Как тебя называть" icon={User} maxLength={40} />
              ) : null}
              <Field
                label="Имя пользователя"
                value={username}
                onChangeText={setUsername}
                placeholder="например, onyx"
                icon={AtSign}
                autoFocus={mode === 'login'}
                maxLength={24}
              />
              <Field
                label="Пароль"
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'login' ? 'Твой пароль' : 'Минимум 6 символов'}
                icon={Lock}
                secureTextEntry
                onSubmitEditing={submit}
              />
            </View>

            {localError || error ? (
              <View style={{ marginTop: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: 'color-mix(in srgb, var(--danger) 8%, transparent)', borderWidth: 1, borderColor: 'color-mix(in srgb, var(--danger) 22%, transparent)' }}>
                <Text style={{ color: colors.danger, fontSize: 11.5 }}>{localError || error}</Text>
              </View>
            ) : null}

            <Button
              label={mode === 'login' ? 'Войти' : 'Создать аккаунт'}
              onPress={() => void submit()}
              loading={submitting}
              style={{ marginTop: 18, width: '100%' }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textFaint, fontSize: 9.5, letterSpacing: 1.2 }}>ИЛИ</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>

            <Button
              label="Продолжить как гость"
              icon={Sparkles}
              variant="soft"
              onPress={() => void guest()}
              disabled={submitting}
              style={{ width: '100%' }}
            />

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 18 }}>
              <Lock size={11} color={colors.textFaint} style={{ marginTop: 2 }} />
              <Text style={{ color: colors.textFaint, fontSize: 9.5, lineHeight: 15, flex: 1 }}>
                Пароль хешируется и хранится только на этом устройстве. Восстановления пароля нет — запомни его.
              </Text>
            </View>
          </View>

          <Text style={{ color: colors.textFaint, fontSize: 9, textAlign: 'center', marginTop: 18, opacity: 0.75 }}>
            Продолжая, ты соглашаешься слушать музыку только для личного пользования.
          </Text>
        </View>
      </View>
    </View>
  );
}
