import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DIFFICULTIES,
  isWorldUnlocked,
  LEVELS_PER_WORLD,
  WORLD_ORDER,
  WORLD_UNLOCK_REQUIREMENT,
} from '../game/difficulty';
import { useGame } from '../storage/GameProvider';

export default function LevelsScreen() {
  const router = useRouter();
  const { progress, theme } = useGame();
  const [selectedWorld, setSelectedWorld] = useState('easy');

  const completedCounts = useMemo(() => {
    const counts = {};
    for (const diff of WORLD_ORDER) {
      let c = 0;
      for (let i = 1; i <= LEVELS_PER_WORLD; i += 1) {
        if (progress.levels?.[`${diff}-${i}`]) c += 1;
      }
      counts[diff] = c;
    }
    return counts;
  }, [progress.levels]);

  const worldCfg = DIFFICULTIES[selectedWorld];
  const worldIdx = WORLD_ORDER.indexOf(selectedWorld);
  const worldUnlocked = isWorldUnlocked(selectedWorld, completedCounts);
  const prevWorldId = worldIdx > 0 ? WORLD_ORDER[worldIdx - 1] : null;
  const prevWorldCompleted = prevWorldId ? completedCounts[prevWorldId] || 0 : 0;

  const levelNumbers = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= LEVELS_PER_WORLD; i += 1) {
      arr.push(i);
    }
    return arr;
  }, []);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Levels</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          4 Worlds · {LEVELS_PER_WORLD} Levels Each
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.worldsBar}
        style={styles.worldsScroll}>
        {WORLD_ORDER.map((worldId) => {
          const cfg = DIFFICULTIES[worldId];
          const unlocked = isWorldUnlocked(worldId, completedCounts);
          const active = selectedWorld === worldId;
          return (
            <Pressable
              key={worldId}
              onPress={() => setSelectedWorld(worldId)}
              style={[
                styles.worldTab,
                {
                  backgroundColor: active ? theme.accent : theme.surface,
                  borderColor: active ? theme.accent : theme.border,
                },
              ]}>
              {!unlocked ? (
                <Ionicons
                  name="lock-closed"
                  size={13}
                  color={active ? theme.accentText : theme.textMuted}
                />
              ) : null}
              <Text
                style={[styles.worldTabText, { color: active ? theme.accentText : theme.text }]}>
                {cfg.label}
              </Text>
              <Text
                style={[
                  styles.worldTabCount,
                  { color: active ? theme.accentText : theme.textMuted },
                ]}>
                {completedCounts[worldId]}/{LEVELS_PER_WORLD}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.worldBanner,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View>
            <Text style={[styles.worldBannerTitle, { color: theme.text }]}>
              {worldCfg.label} World ({worldCfg.size}×{worldCfg.size})
            </Text>
            <Text style={[styles.worldBannerSub, { color: theme.textMuted }]}>
              3★ Target: under {worldCfg.targetTimeSeconds}s with 0 hints
            </Text>
          </View>
          <Text style={[styles.worldProgress, { color: worldCfg.color }]}>
            {completedCounts[selectedWorld]}/{LEVELS_PER_WORLD}
          </Text>
        </View>

        {!worldUnlocked ? (
          <View
            style={[
              styles.lockedNotice,
              { backgroundColor: theme.warningSoft, borderColor: theme.warning },
            ]}>
            <Ionicons name="lock-closed" size={18} color={theme.warning} />
            <Text style={[styles.lockedText, { color: theme.text }]}>
              Complete {WORLD_UNLOCK_REQUIREMENT} {DIFFICULTIES[prevWorldId].label} levels to unlock
              ({prevWorldCompleted}/{WORLD_UNLOCK_REQUIREMENT}).
            </Text>
          </View>
        ) : null}

        <View style={styles.levelGrid}>
          {levelNumbers.map((num) => {
            const key = `${selectedWorld}-${num}`;
            const result = progress.levels?.[key];
            const prevSolved =
              num === 1 || Boolean(progress.levels?.[`${selectedWorld}-${num - 1}`]);
            const unlocked = worldUnlocked && prevSolved;
            const stars = result?.stars || 0;

            return (
              <Pressable
                key={key}
                disabled={!unlocked}
                onPress={() =>
                  router.push({
                    pathname: '/game',
                    params: { mode: 'level', difficulty: selectedWorld, level: String(num) },
                  })
                }
                style={({ pressed }) => [
                  styles.levelTile,
                  {
                    backgroundColor: result
                      ? theme.surface
                      : unlocked
                        ? theme.surface
                        : theme.surfaceMuted,
                    borderColor: result ? theme.success : unlocked ? theme.border : theme.border,
                    opacity: !unlocked ? 0.45 : pressed ? 0.75 : 1,
                  },
                ]}>
                {unlocked ? (
                  <>
                    <Text style={[styles.levelNum, { color: theme.text }]}>{num}</Text>
                    <View style={styles.tileStars}>
                      {[1, 2, 3].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= stars ? 'star' : 'star-outline'}
                          size={11}
                          color={s <= stars ? theme.gold : theme.border}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  worldsScroll: {
    flexGrow: 0,
  },
  worldsBar: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  worldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  worldTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  worldTabCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  worldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  worldBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  worldBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  worldProgress: {
    fontSize: 16,
    fontWeight: '800',
  },
  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  lockedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelTile: {
    width: '18.2%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  levelNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  tileStars: {
    flexDirection: 'row',
    gap: 1,
  },
});
