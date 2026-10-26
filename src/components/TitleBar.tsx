import React from 'react';
import { Text, View } from 'react-native';
import { WindowControls } from './ui';
import { LogoMark, LogoWordmark } from './Logo';
import { colors } from '../theme';

export function TitleBar() {
  const bridge = typeof window !== 'undefined' ? window.platinum : undefined;

  return (
    <View
      className="titlebar drag-region"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <LogoMark size={22} />
        <LogoWordmark size={12.5} caps style={{ letterSpacing: 3.1, fontWeight: '650' }} />
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textFaint, fontSize: 7.5, fontWeight: '700', letterSpacing: 1.2 }}>LOCAL</Text>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mint, opacity: 0.85 }} />
          <Text style={{ color: colors.textFaint, fontSize: 9.5, letterSpacing: 0.6, fontWeight: '500' }}>
            PRIVATE SESSION
          </Text>
        </View>
        {bridge ? (
          <WindowControls
            onClose={() => void bridge.window.close()}
            onMinimize={() => void bridge.window.minimize()}
            onToggleMaximize={() => void bridge.window.toggleMaximize()}
          />
        ) : null}
      </View>
    </View>
  );
}
