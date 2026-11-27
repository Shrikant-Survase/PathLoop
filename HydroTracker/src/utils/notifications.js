import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTIFICATION_IDS = {
  DAILY: 'pathloop-daily-reminder',
  STREAK_RISK: 'pathloop-streak-risk',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('pathloop-reminders', {
      name: 'Daily Reminders',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // Non-fatal fallback to default channel.
  }
}

export async function ensureNotificationPermissions() {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

function buildNextReminderDate(hour, minute, forceTomorrow) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  if (forceTomorrow || target.getTime() <= now.getTime() + 5000) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Sync PathLoop's local reminder and 10:00 PM streak-at-risk reminder.
 * Cancels today's reminders once today's daily puzzle is solved.
 */
export async function syncNotifications({ settings, todaySolved, currentStreak }) {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_RISK).catch(
      () => {}
    );

    if (!settings?.dailyReminderEnabled) {
      return;
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) return;

    const hour = typeof settings.reminderHour === 'number' ? settings.reminderHour : 20;
    const minute = typeof settings.reminderMinute === 'number' ? settings.reminderMinute : 0;
    const dailyDate = buildNextReminderDate(hour, minute, todaySolved);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.DAILY,
      content: {
        title: "Today's PathLoop is ready!",
        body: 'Draw the path and keep your daily streak alive.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dailyDate,
      },
    });

    if (!todaySolved && currentStreak >= 3) {
      const now = new Date();
      const riskDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0, 0);
      if (riskDate.getTime() > now.getTime() + 5000) {
        await Notifications.scheduleNotificationAsync({
          identifier: NOTIFICATION_IDS.STREAK_RISK,
          content: {
            title: 'Streak at risk!',
            body: `Your ${currentStreak}-day PathLoop streak ends at midnight.`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: riskDate,
          },
        });
      }
    }
  } catch {
    // Ignore scheduling errors in unsupported simulators/environments.
  }
}
