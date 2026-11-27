import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DIFFICULTIES, WORLD_ORDER } from '../game/difficulty';
import { useGame } from '../storage/GameProvider';

function buildRandomPracticeSeed(diffId) {
  return `practice-${diffId}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

export default function PracticeScreen() {
  const router = useRouter();
  const { theme } = useGame();

  const startPractice = (diffId) => {
    const seed = buildRandomPracticeSeed(diffId);
    router.push({
      pathname: '/game',
      params: { mode: 'practice', difficulty: diffId, seed },
    });
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="arrow-back" size={20} color={theme.text} />
        </Pressable>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>Practice Mode</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Random seeds · No effect on streak or stats
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {WORLD_ORDER.map((diffId) => {
          const cfg = DIFFICULTIES[diffId];
          return (
            <Pressable
              key={diffId}
              onPress={() => startPractice(diffId)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}>
              <View style={[styles.sizeBadge, { backgroundColor: `${cfg.color}20` }]}>
                <Text style={[styles.sizeText, { color: cfg.color }]}>
                  {cfg.size}×{cfg.size}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{cfg.label}</Text>
                <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
                  {cfg.minCheckpoints}–{cfg.maxCheckpoints} checkpoints ·{' '}
                  {cfg.maxWalls === 0 ? 'No walls' : `${cfg.minWalls}–${cfg.maxWalls} walls`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  sizeBadge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 13,
    marginTop: 3,
  },
});
