import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AchievementToast } from '../components/AchievementToast';
import { GameProvider, useGame } from '../storage/GameProvider';

function RootNavigator() {
  const { theme } = useGame();

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="practice" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="archive" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <AchievementToast />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <GameProvider>
          <RootNavigator />
        </GameProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
