import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, useColorScheme } from 'react-native';

import { getLocalDateString } from '../game/seed';
import {
  clearFreezeNotice,
  createDefaultState,
  getProgress,
  saveDailyResult,
  saveLevelResult,
  savePracticeResult,
  updateSettings as persistSettings,
  useHint as consumeStoredHint,
} from '../storage/storage';
import { setHapticsEnabled, triggerWinHaptic } from '../utils/haptics';
import { syncNotifications } from '../utils/notifications';
import { setSoundEnabled } from '../utils/sound';
import { getTheme } from '../utils/theme';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const systemScheme = useColorScheme();
  const [todayStr, setTodayStr] = useState(() => getLocalDateString());
  const [progress, setProgress] = useState(() => createDefaultState(todayStr));
  const [loading, setLoading] = useState(true);
  const [toastQueue, setToastQueue] = useState([]);

  const applyLoadedProgress = useCallback((data, dateStr) => {
    setProgress(data);
    setHapticsEnabled(data.settings.hapticsEnabled);
    setSoundEnabled(data.settings.soundEnabled);
    setLoading(false);
    syncNotifications({
      settings: data.settings,
      todaySolved: Boolean(data.dailyResults[dateStr]),
      currentStreak: data.streak?.current || 0,
    });
  }, []);

  useEffect(() => {
    let active = true;
    getProgress(todayStr).then((data) => {
      if (active) {
        applyLoadedProgress(data, todayStr);
      }
    });
    return () => {
      active = false;
    };
  }, [applyLoadedProgress, todayStr]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const nowStr = getLocalDateString();
        if (nowStr !== todayStr) {
          setTodayStr(nowStr);
        } else {
          getProgress(nowStr).then((data) => {
            applyLoadedProgress(data, nowStr);
          });
        }
      }
    });
    return () => sub.remove();
  }, [applyLoadedProgress, todayStr]);

  const enqueueAchievements = useCallback((badges) => {
    if (!badges || badges.length === 0) return;
    triggerWinHaptic();
    setToastQueue((prev) => [...prev, ...badges]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  const recordDailyResult = useCallback(
    async (params) => {
      const res = await saveDailyResult({ ...params, todayStr });
      setProgress(res.state);
      enqueueAchievements(res.newlyUnlocked);
      syncNotifications({
        settings: res.state.settings,
        todaySolved: Boolean(res.state.dailyResults[todayStr]),
        currentStreak: res.state.streak?.current || 0,
      });
      return res;
    },
    [enqueueAchievements, todayStr]
  );

  const recordLevelResult = useCallback(
    async (params) => {
      const res = await saveLevelResult({ ...params, todayStr });
      setProgress(res.state);
      enqueueAchievements(res.newlyUnlocked);
      return res;
    },
    [enqueueAchievements, todayStr]
  );

  const recordPracticeResult = useCallback(
    async (params) => {
      const res = await savePracticeResult({ ...params, todayStr });
      setProgress(res.state);
      enqueueAchievements(res.newlyUnlocked);
      return res;
    },
    [enqueueAchievements, todayStr]
  );

  const consumeHint = useCallback(async () => {
    const res = await consumeStoredHint(todayStr);
    if (res.ok) {
      setProgress(res.state);
    }
    return res;
  }, [todayStr]);

  const updateSettings = useCallback(
    async (partial) => {
      const nextState = await persistSettings(partial, todayStr);
      setProgress(nextState);
      setHapticsEnabled(nextState.settings.hapticsEnabled);
      setSoundEnabled(nextState.settings.soundEnabled);
      syncNotifications({
        settings: nextState.settings,
        todaySolved: Boolean(nextState.dailyResults[todayStr]),
        currentStreak: nextState.streak?.current || 0,
      });
      return nextState;
    },
    [todayStr]
  );

  const dismissFreezeNotice = useCallback(async () => {
    const nextState = await clearFreezeNotice(todayStr);
    setProgress(nextState);
  }, [todayStr]);

  const theme = useMemo(
    () => getTheme(systemScheme, progress.settings?.theme || 'system'),
    [progress.settings?.theme, systemScheme]
  );

  const value = useMemo(
    () => ({
      progress,
      loading,
      todayStr,
      theme,
      activeToast: toastQueue[0] || null,
      dismissToast,
      recordDailyResult,
      recordLevelResult,
      recordPracticeResult,
      consumeHint,
      updateSettings,
      dismissFreezeNotice,
    }),
    [
      consumeHint,
      dismissFreezeNotice,
      dismissToast,
      loading,
      progress,
      recordDailyResult,
      recordLevelResult,
      recordPracticeResult,
      theme,
      toastQueue,
      todayStr,
      updateSettings,
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used inside GameProvider');
  }
  return ctx;
}
