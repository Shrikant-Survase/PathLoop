import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const NOTIFICATION_IDS = {
  DAILY: 'pathloop-daily-reminder',
  STREAK_RISK: 'pathloop-streak-risk',
};

export const REMINDER_CHANNEL_ID = 'pathloop-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let channelConfigured = false;

async function ensureChannel() {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'Daily Reminders',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    channelConfigured = true;
  } catch (err) {
    console.warn('[notifications] Could not create notification channel:', err);
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

export function getNextReminderDate(hour, minute, forceTomorrow) {
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
  if (Platform.OS === 'web') return { scheduled: false, reason: 'web' };

  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_RISK).catch(
      () => {}
    );

    if (!settings?.dailyReminderEnabled) {
      return { scheduled: false, reason: 'disabled' };
    }

    const granted = await ensureNotificationPermissions();
    if (!granted) return { scheduled: false, reason: 'permission-denied' };

    const hour = typeof settings.reminderHour === 'number' ? settings.reminderHour : 20;
    const minute = typeof settings.reminderMinute === 'number' ? settings.reminderMinute : 0;
    const dailyDate = getNextReminderDate(hour, minute, todaySolved);
    const androidChannel = Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {};

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.DAILY,
      content: {
        title: "Today's PathLoop is ready!",
        body: 'Draw the path and keep your daily streak alive.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dailyDate,
        ...androidChannel,
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
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: riskDate,
            ...androidChannel,
          },
        });
      }
    }

    return { scheduled: true, dailyDate };
  } catch (err) {
    console.warn('[notifications] Failed to sync notifications:', err);
    return { scheduled: false, reason: err?.message || 'schedule-error' };
  }
}

/**
 * Schedule an immediate 5-second local test notification (works on emulators).
 */
export async function sendTestReminderNotification(seconds = 5) {
  if (Platform.OS === 'web') return { ok: false, reason: 'web' };
  const granted = await ensureNotificationPermissions();
  if (!granted) return { ok: false, reason: 'permission-denied' };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'PathLoop Reminder Test',
      body: 'Local notifications are working on this device.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
    },
  });
  return { ok: true };
}
