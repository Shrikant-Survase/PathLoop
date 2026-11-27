import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime } from '../components/Timer';
import { getDailyDifficulty } from '../game/difficulty';
import { addCalendarDays, diffCalendarDays, getPuzzleNumber, LAUNCH_DATE } from '../game/seed';
import { useGame } from '../storage/GameProvider';

export default function ArchiveScreen() {
  const router = useRouter();
  const { progress, todayStr, theme } = useGame();

  const entries = useMemo(() => {
    const daysSinceLaunch = Math.max(0, diffCalendarDays(LAUNCH_DATE, todayStr));
    const totalDays = Math.min(30, daysSinceLaunch + 1);
    const list = [];
    for (let offset = 0; offset < totalDays; offset += 1) {
      const dateStr = addCalendarDays(todayStr, -offset);
      if (diffCalendarDays(LAUNCH_DATE, dateStr) < 0) break;
      const diff = getDailyDifficulty(dateStr);
      const solved = progress.dailyResults?.[dateStr] || null;
      list.push({
        dateStr,
        puzzleNumber: getPuzzleNumber(dateStr),
        difficulty: diff,
        solved,
        isToday: dateStr === todayStr,
      });
    }
    return list;
  }, [progress.dailyResults, todayStr]);

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
          <Text style={[styles.title, { color: theme.text }]}>Daily Archive</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Last 30 days · Archive solves don&apos;t change streak
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {entries.map((item) => (
          <Pressable
            key={item.dateStr}
            onPress={() =>
              router.push({
                pathname: '/game',
                params: {
                  mode: item.isToday ? 'daily' : 'archive',
                  date: item.dateStr,
                },
              })
            }
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.surface,
                borderColor: item.solved ? theme.success : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <View style={styles.rowLeft}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>
                Puzzle #{item.puzzleNumber} {item.isToday ? '· Today' : ''}
              </Text>
              <Text style={[styles.rowMeta, { color: theme.textMuted }]}>
                {item.dateStr} · {item.difficulty.label} ({item.difficulty.size}×
                {item.difficulty.size})
              </Text>
            </View>

            {item.solved ? (
              <View style={[styles.solvedPill, { backgroundColor: theme.successSoft }]}>
                <Ionicons name="checkmark-circle" size={15} color={theme.success} />
                <Text style={[styles.solvedText, { color: theme.success }]}>
                  {formatTime(item.solved.time)}
                </Text>
              </View>
            ) : (
              <View style={[styles.playPill, { backgroundColor: theme.surfaceMuted }]}>
                <Text style={[styles.playText, { color: theme.text }]}>Play</Text>
              </View>
            )}
          </Pressable>
        ))}
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
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 12,
  },
  solvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  solvedText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  playPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  playText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
