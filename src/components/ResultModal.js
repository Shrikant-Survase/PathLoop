import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatTime } from './Timer';

export function ResultModal({
  visible,
  title,
  subtitle,
  seconds,
  totalCells,
  stars = null,
  hintsUsed = 0,
  onShare,
  onNextLevel,
  onReplay,
  onClose,
  theme,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: theme.modalBackdrop }]}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
            <Text style={[styles.badgeText, { color: theme.success }]}>SOLVED</Text>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle || `All ${totalCells} cells connected in order`}
          </Text>

          {stars != null ? (
            <View style={styles.starsRow}>
              {[1, 2, 3].map((idx) => (
                <Ionicons
                  key={idx}
                  name={idx <= stars ? 'star' : 'star-outline'}
                  size={30}
                  color={idx <= stars ? theme.gold : theme.border}
                />
              ))}
            </View>
          ) : null}

          <View
            style={[
              styles.statBox,
              { backgroundColor: theme.surfaceMuted, borderColor: theme.border },
            ]}>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Completion Time</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>{formatTime(seconds)}</Text>
            {hintsUsed > 0 ? (
              <Text style={[styles.hintNote, { color: theme.textMuted }]}>
                Includes {hintsUsed} {hintsUsed === 1 ? 'hint' : 'hints'}
              </Text>
            ) : null}
          </View>

          {onShare ? (
            <Pressable
              onPress={onShare}
              style={({ pressed }) => [
                styles.shareButton,
                {
                  backgroundColor: theme.accentSoft,
                  borderColor: theme.accent,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}>
              <Ionicons name="share-outline" size={18} color={theme.accent} />
              <Text style={[styles.shareText, { color: theme.accent }]}>Share Result</Text>
            </Pressable>
          ) : null}

          <View style={styles.actions}>
            {onNextLevel ? (
              <>
                <Pressable
                  onPress={onReplay}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.surfaceMuted,
                      borderColor: theme.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}>
                  <Text style={[styles.buttonText, { color: theme.text }]}>Replay</Text>
                </Pressable>

                <Pressable
                  onPress={onNextLevel}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <Text style={[styles.buttonText, { color: theme.accentText }]}>Next Level</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={onReplay}
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    {
                      backgroundColor: theme.surfaceMuted,
                      borderColor: theme.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}>
                  <Text style={[styles.buttonText, { color: theme.text }]}>Replay</Text>
                </Pressable>

                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <Text style={[styles.buttonText, { color: theme.accentText }]}>Done</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 14,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hintNote: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  shareButton: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  shareText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
