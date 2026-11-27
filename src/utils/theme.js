import { useColorScheme } from 'react-native';

export const LIGHT_THEME = {
  mode: 'light',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EDF0F7',
  border: '#DFE4EE',
  gridLine: '#E2E7F0',
  text: '#141924',
  textMuted: '#667085',
  accent: '#4F46E5',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(79, 70, 229, 0.11)',
  trail: '#5B54F5',
  trailGlow: 'rgba(91, 84, 245, 0.22)',
  checkpointBg: '#161B26',
  checkpointText: '#FFFFFF',
  checkpointVisitedBg: '#FFFFFF',
  checkpointVisitedText: '#4F46E5',
  wall: '#1B2130',
  success: '#12B76A',
  successSoft: 'rgba(18, 183, 106, 0.14)',
  warning: '#F79009',
  warningSoft: 'rgba(247, 144, 9, 0.15)',
  danger: '#F04438',
  dangerSoft: 'rgba(240, 68, 56, 0.14)',
  gold: '#F59E0B',
  goldSoft: 'rgba(245, 158, 11, 0.16)',
  freeze: '#0EA5E9',
  freezeSoft: 'rgba(14, 165, 233, 0.14)',
  modalBackdrop: 'rgba(15, 23, 42, 0.45)',
};

export const DARK_THEME = {
  mode: 'dark',
  background: '#0D1118',
  surface: '#161B25',
  surfaceMuted: '#1F2634',
  border: '#2A3346',
  gridLine: '#252E40',
  text: '#F3F5FA',
  textMuted: '#98A2B3',
  accent: '#7C74FF',
  accentText: '#FFFFFF',
  accentSoft: 'rgba(124, 116, 255, 0.17)',
  trail: '#7C74FF',
  trailGlow: 'rgba(124, 116, 255, 0.26)',
  checkpointBg: '#F3F5FA',
  checkpointText: '#0D1118',
  checkpointVisitedBg: '#161B25',
  checkpointVisitedText: '#ACA6FF',
  wall: '#E2E8F0',
  success: '#32D583',
  successSoft: 'rgba(50, 213, 131, 0.17)',
  warning: '#FDB022',
  warningSoft: 'rgba(253, 176, 34, 0.18)',
  danger: '#F97066',
  dangerSoft: 'rgba(249, 112, 102, 0.18)',
  gold: '#FBBF24',
  goldSoft: 'rgba(251, 191, 36, 0.18)',
  freeze: '#38BDF8',
  freezeSoft: 'rgba(56, 189, 248, 0.18)',
  modalBackdrop: 'rgba(0, 0, 0, 0.65)',
};

export function getTheme(colorScheme, preference = 'system') {
  const resolved = preference === 'light' || preference === 'dark' ? preference : colorScheme;
  return resolved === 'dark' ? DARK_THEME : LIGHT_THEME;
}

export function useTheme(preference = 'system') {
  const colorScheme = useColorScheme();
  return getTheme(colorScheme, preference);
}
