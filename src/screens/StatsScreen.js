import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { formatTime } from '../components/Timer';
import { DIFFICULTIES, WORLD_ORDER } from '../game/difficulty';
import { parseDateParts } from '../game/seed';
import { computeStatsSummary, getMonthHeatmap } from '../game/stats';
import { useGame } from '../storage/GameProvider';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function StatsScreen() {
  const { progress, todayStr, theme } = useGame();
  const { width } = useWindowDimensions();

  const summary = useMemo(() => computeStatsSummary(progress), [progress]);
  const { year, month } = useMemo(() => parseDateParts(todayStr), [todayStr]);
  const heatmap = useMemo(
    () => getMonthHeatmap(progress, year, month, todayStr),
    [month, progress, todayStr, year]
  );

  const chartWidth = Math.min(width - 64, 360);
  const chartHeight = 148;
  const maxBucketCount = Math.max(1, ...summary.buckets.map((b) => b.count));

  const totals = [
    { label: 'Dailies Solved', value: String(summary.dailiesSolved) },
    { label: 'Levels Done', value: String(summary.levelsCompleted) },
    { label: 'Total Stars', value: String(summary.totalStars) },
    {
      label: 'Avg Daily Time',
      value: summary.averageTime != null ? formatTime(summary.averageTime) : '—',
    },
    {
      label: 'Best Time',
      value: summary.bestTime != null ? formatTime(summary.bestTime) : '—',
    },
    { label: 'Streak / Best', value: `${summary.currentStreak} / ${summary.bestStreak}` },
    { label: 'Hints Used', value: String(summary.hintsUsed) },
  ];

  const leadingBlanks = new Array(heatmap.startWeekday).fill(null);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Statistics</Text>

        <View style={styles.totalsGrid}>
          {totals.map((item) => (
            <View
              key={item.label}
              style={[
                styles.statCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textMuted }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {MONTH_NAMES[month - 1]} {year}
            </Text>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Solved</Text>
              <View style={[styles.legendDot, { backgroundColor: theme.freeze }]} />
              <Text style={[styles.legendText, { color: theme.textMuted }]}>Frozen</Text>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} style={[styles.weekdayLabel, { color: theme.textMuted }]}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {leadingBlanks.map((_, idx) => (
              <View key={`blank-${idx}`} style={styles.calendarCellSlot} />
            ))}
            {heatmap.cells.map((cell) => {
              let bg = theme.surfaceMuted;
              let textColor = theme.textMuted;
              if (cell.status === 'solved') {
                bg = theme.success;
                textColor = '#FFFFFF';
              } else if (cell.status === 'frozen') {
                bg = theme.freeze;
                textColor = '#FFFFFF';
              }
              return (
                <View key={cell.dateStr} style={styles.calendarCellSlot}>
                  <View
                    style={[
                      styles.calendarCell,
                      {
                        backgroundColor: bg,
                        borderColor: cell.isToday ? theme.accent : 'transparent',
                        borderWidth: cell.isToday ? 2 : 0,
                      },
                    ]}>
                    <Text style={[styles.calendarDayText, { color: textColor }]}>{cell.day}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Time Distribution</Text>
          <View style={styles.chartWrap}>
            <Svg width={chartWidth} height={chartHeight}>
              {summary.buckets.map((bucket, idx) => {
                const slotWidth = chartWidth / summary.buckets.length;
                const barWidth = Math.min(34, slotWidth * 0.56);
                const maxBarHeight = 92;
                const barHeight =
                  bucket.count > 0
                    ? Math.max(8, (bucket.count / maxBucketCount) * maxBarHeight)
                    : 4;
                const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                const y = 112 - barHeight;

                return (
                  <Rect
                    key={bucket.key}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    rx={6}
                    fill={bucket.count > 0 ? theme.accent : theme.surfaceMuted}
                  />
                );
              })}

              {summary.buckets.map((bucket, idx) => {
                const slotWidth = chartWidth / summary.buckets.length;
                const cx = idx * slotWidth + slotWidth / 2;
                const maxBarHeight = 92;
                const barHeight =
                  bucket.count > 0
                    ? Math.max(8, (bucket.count / maxBucketCount) * maxBarHeight)
                    : 4;
                const countY = 112 - barHeight - 6;

                return (
                  <SvgText
                    key={`${bucket.key}-labels`}
                    x={cx}
                    y={countY}
                    fontSize="11"
                    fontWeight="700"
                    fill={theme.text}
                    textAnchor="middle">
                    {bucket.count > 0 ? String(bucket.count) : ''}
                  </SvgText>
                );
              })}

              {summary.buckets.map((bucket, idx) => {
                const slotWidth = chartWidth / summary.buckets.length;
                const cx = idx * slotWidth + slotWidth / 2;
                return (
                  <SvgText
                    key={`${bucket.key}-x`}
                    x={cx}
                    y={134}
                    fontSize="11"
                    fontWeight="600"
                    fill={theme.textMuted}
                    textAnchor="middle">
                    {bucket.label}
                  </SvgText>
                );
              })}
            </Svg>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Best Time by Difficulty</Text>
          <View style={styles.diffList}>
            {WORLD_ORDER.map((diffId) => {
              const cfg = DIFFICULTIES[diffId];
              const best = summary.bestByDifficulty[diffId];
              return (
                <View key={diffId} style={[styles.diffRow, { borderBottomColor: theme.border }]}>
                  <View style={styles.diffLeft}>
                    <Ionicons name="radio-button-on" size={14} color={cfg.color} />
                    <Text style={[styles.diffName, { color: theme.text }]}>
                      {cfg.label} ({cfg.size}×{cfg.size})
                    </Text>
                  </View>
                  <Text style={[styles.diffBest, { color: theme.text }]}>
                    {best != null ? formatTime(best) : '—'}
                  </Text>
                </View>
              );
            })}
          </View>
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    width: '31.7%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCellSlot: {
    width: '14.28%',
    paddingVertical: 3,
    alignItems: 'center',
  },
  calendarCell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartWrap: {
    alignItems: 'center',
  },
  diffList: {
    gap: 4,
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  diffLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffName: {
    fontSize: 14,
    fontWeight: '600',
  },
  diffBest: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
