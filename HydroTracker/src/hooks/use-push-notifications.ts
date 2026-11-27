import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'default';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Show notifications while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Set once the Android channel exists, so we only reference it when it is safe to.
let channelReady = false;

async function ensureAndroidChannelAsync() {
  if (Platform.OS !== 'android' || channelReady) return;
  try {
    // The channel must exist before the permission prompt appears on Android 13+.
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Default',
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF208AEF',
    });
    channelReady = true;
  } catch (e) {
    // Non-fatal: notifications fall back to the default channel.
    console.warn('[push] Could not create notification channel:', e);
  }
}

async function registerForPushNotificationsAsync(): Promise<string> {
  await ensureAndroidChannelAsync();

  if (
    Platform.OS === 'android' &&
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  ) {
    throw new Error('Remote push is not available in Expo Go on Android. Use a development build.');
  }

  if (!Device.isDevice) {
    throw new Error('Push tokens need a physical device or an emulator with Google Play services.');
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('EAS projectId not found in app.json (extra.eas.projectId).');
  }

  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

export type UsePushNotifications = {
  /** Expo push token, or null until registered (or if registration failed). */
  expoPushToken: string | null;
  /** Last notification received while the app was open. */
  notification: Notifications.Notification | null;
  /** Last notification the user tapped. */
  response: Notifications.NotificationResponse | null;
  /** Registration error message, if any. */
  error: string | null;
  /** (Re)run permission request + token fetch. */
  register: () => Promise<void>;
  /** Fire a local notification after `seconds` (works in Expo Go; no token needed). */
  scheduleLocalNotification: (seconds?: number) => Promise<void>;
  /** Send a push to this device through Expo's push service (needs a token + dev build). */
  sendTestPush: () => Promise<void>;
};

export function usePushNotifications(): UsePushNotifications {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [response, setResponse] = useState<Notifications.NotificationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      setError(null);
      setExpoPushToken(token);
      console.log('[push] Expo push token:', token);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    // Initial registration on mount (state is only set after the async work resolves).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    register();

    const receivedSub = Notifications.addNotificationReceivedListener(setNotification);
    const responseSub = Notifications.addNotificationResponseReceivedListener(setResponse);

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [register]);

  const scheduleLocalNotification = useCallback(async (seconds = 2) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to hydrate 💧',
        body: 'This is a local test notification.',
        data: { source: 'local-test' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        ...(channelReady ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }, []);

  const sendTestPush = useCallback(async () => {
    if (!expoPushToken) {
      setError('No push token yet. Register first.');
      return;
    }
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          title: 'Time to hydrate 💧',
          body: 'This is a remote test push.',
          data: { source: 'remote-test' },
          ...(channelReady ? { channelId: ANDROID_CHANNEL_ID } : {}),
        }),
      });
      const json = await res.json();
      console.log('[push] send result:', JSON.stringify(json));
      if (json?.data?.status === 'error') {
        setError(json.data.message ?? 'Expo push service returned an error.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [expoPushToken]);

  return {
    expoPushToken,
    notification,
    response,
    error,
    register,
    scheduleLocalNotification,
    sendTestPush,
  };
}
