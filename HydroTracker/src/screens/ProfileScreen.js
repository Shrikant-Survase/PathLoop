import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACHIEVEMENTS } from '../game/achievements';
import { useGame } from '../storage/GameProvider';

const THEME_OPTIONS = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function formatReminderTime(hour, minute) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

export default function ProfileScreen() {
  const { progress, theme, updateSettings } = useGame();
  const settings = progress.settings || {};
  const unlockedSet = new Set(progress.unlockedAchievements || []);

  const [showTimeModal, setShowTimeModal] = useState(false);
  const [draftHour, setDraftHour] = useState(settings.reminderHour ?? 20);
  const [draftMinute, setDraftMinute] = useState(settings.reminderMinute ?? 0);

  const openTimePicker = () => {
    setDraftHour(settings.reminderHour ?? 20);
    setDraftMinute(settings.reminderMinute ?? 0);
    setShowTimeModal(true);
  };

  const adjustHour = (delta) => {
    setDraftHour((h) => (h + delta + 24) % 24);
  };

  const adjustMinute = (delta) => {
    setDraftMinute((m) => (m + delta + 60) % 60);
  };

  const saveReminderTime = () => {
    updateSettings({ reminderHour: draftHour, reminderMinute: draftMinute });
    setShowTimeModal(false);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>Profile</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Daily Reminder</Text>
              <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                Only notifies if today is unsolved (+10 PM streak alert at 3+ days)
              </Text>
            </View>
            <Switch
              value={Boolean(settings.dailyReminderEnabled)}
              onValueChange={(val) => updateSettings({ dailyReminderEnabled: val })}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>

          {settings.dailyReminderEnabled ? (
            <Pressable
              onPress={openTimePicker}
              style={[styles.settingRow, { borderBottomColor: theme.border }]}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Reminder Time</Text>
              <View style={[styles.timeBadge, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name="time-outline" size={16} color={theme.accent} />
                <Text style={[styles.timeBadgeText, { color: theme.accent }]}>
                  {formatReminderTime(settings.reminderHour ?? 20, settings.reminderMinute ?? 0)}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Haptics</Text>
            <Switch
              value={settings.hapticsEnabled !== false}
              onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Sound</Text>
            <Switch
              value={settings.soundEnabled !== false}
              onValueChange={(val) => updateSettings({ soundEnabled: val })}
              trackColor={{ false: theme.border, true: theme.accent }}
            />
          </View>

          <View style={styles.themeBlock}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Appearance</Text>
            <View style={styles.themePills}>
              {THEME_OPTIONS.map((opt) => {
                const active = (settings.theme || 'system') === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => updateSettings({ theme: opt.id })}
                    style={[
                      styles.themePill,
                      {
                        backgroundColor: active ? theme.accent : theme.surfaceMuted,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.themePillText,
                        { color: active ? theme.accentText : theme.text },
                      ]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.achHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Achievements</Text>
          <Text style={[styles.achCount, { color: theme.textMuted }]}>
            {unlockedSet.size} / {ACHIEVEMENTS.length}
          </Text>
        </View>

        <View style={styles.achList}>
          {ACHIEVEMENTS.map((badge) => {
            const unlocked = unlockedSet.has(badge.id);
            return (
              <View
                key={badge.id}
                style={[
                  styles.achCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: unlocked ? theme.gold : theme.border,
                    opacity: unlocked ? 1 : 0.6,
                  },
                ]}>
                <View
                  style={[
                    styles.achIconWrap,
                    { backgroundColor: unlocked ? theme.goldSoft : theme.surfaceMuted },
                  ]}>
                  <Ionicons
                    name={unlocked ? badge.icon : 'lock-closed'}
                    size={20}
                    color={unlocked ? theme.gold : theme.textMuted}
                  />
                </View>
                <View style={styles.achInfo}>
                  <Text style={[styles.achTitle, { color: theme.text }]}>{badge.title}</Text>
                  <Text style={[styles.achDesc, { color: theme.textMuted }]}>
                    {badge.description}
                  </Text>
                </View>
                {unlocked ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimeModal(false)}>
        <View style={[styles.backdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              styles.pickerCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Daily Reminder Time</Text>

            <View style={styles.stepperRow}>
              <View style={styles.stepperCol}>
                <Pressable
                  onPress={() => adjustHour(1)}
                  style={[styles.stepBtn, { backgroundColor: theme.surfaceMuted }]}>
                  <Ionicons name="chevron-up" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.stepVal, { color: theme.text }]}>
                  {String(draftHour).padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => adjustHour(-1)}
                  style={[styles.stepBtn, { backgroundColor: theme.surfaceMuted }]}>
                  <Ionicons name="chevron-down" size={20} color={theme.text} />
                </Pressable>
              </View>

              <Text style={[styles.colon, { color: theme.text }]}>:</Text>

              <View style={styles.stepperCol}>
                <Pressable
                  onPress={() => adjustMinute(15)}
                  style={[styles.stepBtn, { backgroundColor: theme.surfaceMuted }]}>
                  <Ionicons name="chevron-up" size={20} color={theme.text} />
                </Pressable>
                <Text style={[styles.stepVal, { color: theme.text }]}>
                  {String(draftMinute).padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => adjustMinute(-15)}
                  style={[styles.stepBtn, { backgroundColor: theme.surfaceMuted }]}>
                  <Ionicons name="chevron-down" size={20} color={theme.text} />
                </Pressable>
              </View>
            </View>

            <Text style={[styles.formattedPreview, { color: theme.textMuted }]}>
              {formatReminderTime(draftHour, draftMinute)}
            </Text>

            <View style={styles.pickerActions}>
              <Pressable
                onPress={() => setShowTimeModal(false)}
                style={[
                  styles.pickerBtn,
                  {
                    backgroundColor: theme.surfaceMuted,
                    borderColor: theme.border,
                    borderWidth: 1,
                  },
                ]}>
                <Text style={[styles.pickerBtnText, { color: theme.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveReminderTime}
                style={[styles.pickerBtn, { backgroundColor: theme.accent }]}>
                <Text style={[styles.pickerBtnText, { color: theme.accentText }]}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeBlock: {
    paddingTop: 12,
    gap: 10,
  },
  themePills: {
    flexDirection: 'row',
    gap: 8,
  },
  themePill: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  achHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  achCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  achList: {
    gap: 10,
  },
  achCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  achIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achInfo: {
    flex: 1,
  },
  achTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  achDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    gap: 14,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperCol: {
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 48,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 28,
    fontWeight: '800',
  },
  formattedPreview: {
    fontSize: 13,
    fontWeight: '600',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  pickerBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
