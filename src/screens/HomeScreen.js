import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatTime } from '../components/Timer';
import { getDailyDifficulty } from '../game/difficulty';
import { getPuzzleNumber, parseDateParts } from '../game/seed';
import { getLast7DaysStatus } from '../game/streaks';
import { useGame } from '../storage/GameProvider';

function getSecondsToMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((nextMidnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getWeekdayShort(dateStr) {
  const { year, month, day } = parseDateParts(dateStr);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(year, month - 1, day).getDay()];
}

export default function HomeScreen() {
  const router = useRouter();
  const { progress, todayStr, theme, dismissFreezeNotice } = useGame();
  const [countdown, setCountdown] = useState(() => getSecondsToMidnight());

  const puzzleNumber = getPuzzleNumber(todayStr);
  const difficulty = getDailyDifficulty(todayStr);
  const todayResult = progress.dailyResults?.[todayStr] || null;
  const isSolved = Boolean(todayResult);
  const streak = progress.streak || { current: 0, best: 0, freezes: 0 };
  const last7 = getLast7DaysStatus(progress, todayStr);

  useEffect(() => {
    if (!isSolved) return undefined;
    const id = setInterval(() => {
      setCountdown(getSecondsToMidnight());
    }, 1000);
    return () => clearInterval(id);
  }, [isSolved, todayStr]);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: theme.text }]}>PathLoop</Text>
            <Text style={[styles.dateText, { color: theme.textMuted }]}>{todayStr}</Text>
          </View>
          <View
            style={[
              styles.hintPill,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <Ionicons name="bulb" size={16} color={theme.gold} />
            <Text style={[styles.hintPillText, { color: theme.text }]}>
              {progress.hintsAvailable}
            </Text>
          </View>
        </View>

        {streak.freezeNotice ? (
          <Pressable
            onPress={dismissFreezeNotice}
            style={[
              styles.freezeBanner,
              { backgroundColor: theme.freezeSoft, borderColor: theme.freeze },
            ]}>
            <Ionicons name="snow" size={18} color={theme.freeze} />
            <Text style={[styles.freezeBannerText, { color: theme.text }]}>
              {streak.freezeNotice}
            </Text>
            <Ionicons name="close" size={16} color={theme.textMuted} />
          </Pressable>
        ) : null}

        <View
          style={[
            styles.dailyCard,
            {
              backgroundColor: theme.surface,
              borderColor: isSolved ? theme.success : theme.border,
            },
          ]}>
          <View style={styles.dailyTopRow}>
            <Text style={[styles.dailyKicker, { color: theme.textMuted }]}>DAILY PUZZLE</Text>
            <View
              style={[
                styles.diffBadge,
                { backgroundColor: `${difficulty.color}20`, borderColor: difficulty.color },
              ]}>
              <Text style={[styles.diffText, { color: difficulty.color }]}>
                {difficulty.label} · {difficulty.size}×{difficulty.size}
              </Text>
            </View>
          </View>

          <Text style={[styles.dailyTitle, { color: theme.text }]}>
            Today&apos;s Puzzle #{puzzleNumber}
          </Text>

          {isSolved ? (
            <View style={styles.solvedSection}>
              <View style={styles.solvedStatusRow}>
                <View style={[styles.solvedBadge, { backgroundColor: theme.successSoft }]}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                  <Text style={[styles.solvedBadgeText, { color: theme.success }]}>Solved ✓</Text>
                </View>
                <Text style={[styles.solvedTime, { color: theme.text }]}>
                  {formatTime(todayResult.time)}
                </Text>
              </View>

              <View
                style={[
                  styles.countdownBox,
                  { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
                ]}>
                <Text style={[styles.countdownLabel, { color: theme.textMuted }]}>
                  Next puzzle in
                </Text>
                <Text style={[styles.countdownValue, { color: theme.text }]}>
                  {formatCountdown(countdown)}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: '/game', params: { mode: 'daily', date: todayStr } })
                }
                style={({ pressed }) => [
                  styles.secondaryCta,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}>
                <Text style={[styles.secondaryCtaText, { color: theme.text }]}>Replay Today</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.unsolvedSection}>
              <Text style={[styles.dailyDesc, { color: theme.textMuted }]}>
                Connect checkpoints 1 to {difficulty.maxCheckpoints} while filling every cell.
              </Text>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/game', params: { mode: 'daily', date: todayStr } })
                }
                style={({ pressed }) => [
                  styles.playButton,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.88 : 1 },
                ]}>
                <Ionicons name="play" size={18} color={theme.accentText} />
                <Text style={[styles.playButtonText, { color: theme.accentText }]}>Play</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View
          style={[
            styles.streakCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.streakHeader}>
            <View style={styles.streakLeft}>
              <View style={[styles.flameCircle, { backgroundColor: theme.warningSoft }]}>
                <Ionicons name="flame" size={24} color={theme.warning} />
              </View>
              <View>
                <Text style={[styles.streakCount, { color: theme.text }]}>
                  {streak.current} {streak.current === 1 ? 'Day' : 'Days'}
                </Text>
                <Text style={[styles.streakSub, { color: theme.textMuted }]}>
                  Current streak · Best {streak.best}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.freezePill,
                { backgroundColor: theme.freezeSoft, borderColor: theme.freeze },
              ]}>
              <Ionicons name="snow" size={14} color={theme.freeze} />
              <Text style={[styles.freezeText, { color: theme.freeze }]}>{streak.freezes}/2</Text>
            </View>
          </View>

          <View style={styles.dotsRow}>
            {last7.map((item) => {
              let dotBg = theme.surfaceMuted;
              let dotBorder = theme.border;
              let icon = null;
              if (item.status === 'solved') {
                dotBg = theme.success;
                dotBorder = theme.success;
                icon = 'checkmark';
              } else if (item.status === 'frozen') {
                dotBg = theme.freeze;
                dotBorder = theme.freeze;
                icon = 'snow';
              } else if (item.isToday) {
                dotBorder = theme.accent;
              }
              return (
                <View key={item.dateStr} style={styles.dayCol}>
                  <Text style={[styles.dayLabel, { color: theme.textMuted }]}>
                    {getWeekdayShort(item.dateStr)}
                  </Text>
                  <View
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: dotBg,
                        borderColor: dotBorder,
                        borderWidth: item.isToday && item.status !== 'solved' ? 2 : 1,
                      },
                    ]}>
                    {icon ? <Ionicons name={icon} size={13} color="#FFFFFF" /> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>QUICK PLAY</Text>
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => router.push('/practice')}
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <View style={[styles.quickIcon, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="infinite" size={20} color={theme.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: theme.text }]}>Practice</Text>
            <Text style={[styles.quickSub, { color: theme.textMuted }]}>Random grid</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(tabs)/levels')}
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <View style={[styles.quickIcon, { backgroundColor: theme.goldSoft }]}>
              <Ionicons name="grid" size={20} color={theme.gold} />
            </View>
            <Text style={[styles.quickTitle, { color: theme.text }]}>Levels</Text>
            <Text style={[styles.quickSub, { color: theme.textMuted }]}>200 stages</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/archive')}
            style={({ pressed }) => [
              styles.quickCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}>
            <View style={[styles.quickIcon, { backgroundColor: theme.successSoft }]}>
              <Ionicons name="calendar" size={20} color={theme.success} />
            </View>
            <Text style={[styles.quickTitle, { color: theme.text }]}>Archive</Text>
            <Text style={[styles.quickSub, { color: theme.textMuted }]}>Past dailies</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  hintPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  freezeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  freezeBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  dailyCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 20,
  },
  dailyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dailyKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  diffText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dailyTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  unsolvedSection: {
    gap: 14,
  },
  dailyDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  playButton: {
    height: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  solvedSection: {
    gap: 12,
  },
  solvedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  solvedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  solvedTime: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  countdownLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  countdownValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  secondaryCta: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  streakCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCount: {
    fontSize: 20,
    fontWeight: '800',
  },
  streakSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  freezePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  freezeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickSub: {
    fontSize: 11,
    fontWeight: '500',
  },
});
