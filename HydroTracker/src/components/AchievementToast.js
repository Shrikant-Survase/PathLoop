import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGame } from '../storage/GameProvider';

export function AchievementToast() {
  const { activeToast, dismissToast, theme } = useGame();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!activeToast) return undefined;
    const timer = setTimeout(() => {
      dismissToast();
    }, 3200);
    return () => clearTimeout(timer);
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(240)}
      exiting={FadeOutUp.duration(200)}
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
        },
      ]}>
      <Pressable
        onPress={dismissToast}
        style={[
          styles.toast,
          {
            backgroundColor: theme.surface,
            borderColor: theme.gold,
          },
        ]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.goldSoft }]}>
          <Ionicons name={activeToast.icon || 'trophy'} size={20} color={theme.gold} />
        </View>
        <View style={styles.textWrap}>
          <Text style={[styles.kicker, { color: theme.gold }]}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={[styles.title, { color: theme.text }]}>{activeToast.title}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
});
