import { StyleSheet, Text, View } from 'react-native';

export function formatTime(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function Timer({ seconds, theme }) {
  return (
    <View style={[styles.pill, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.text, { color: theme.text }]}>{formatTime(seconds)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
