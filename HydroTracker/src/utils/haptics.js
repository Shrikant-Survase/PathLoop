import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let hapticsEnabled = true;

export function setHapticsEnabled(enabled) {
  hapticsEnabled = Boolean(enabled);
}

/**
 * Light haptic tick when entering a new grid cell.
 */
export function triggerCellTick() {
  if (!hapticsEnabled || Platform.OS === 'web') return;
  Haptics.selectionAsync().catch(() => {});
}

/**
 * Subtle haptic feedback when backtracking along the path.
 */
export function triggerBacktrackTick() {
  if (!hapticsEnabled || Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/**
 * Success haptic notification when the puzzle is solved or badge unlocked.
 */
export function triggerWinHaptic() {
  if (!hapticsEnabled || Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
