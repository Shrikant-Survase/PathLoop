import { Platform } from 'react-native';

import backtrackAsset from '../../assets/sounds/backtrack.wav';
import stepAsset from '../../assets/sounds/step.wav';
import winAsset from '../../assets/sounds/win.wav';

let soundEnabled = true;
let audioModulePromise = null;
let players = null;
let warnedUnavailable = false;

async function getAudioPlayers() {
  if (players) return players;

  if (!audioModulePromise) {
    audioModulePromise = (async () => {
      try {
        const mod = await import('expo-audio');
        if (!mod || typeof mod.createAudioPlayer !== 'function') {
          return null;
        }
        if (typeof mod.setAudioModeAsync === 'function') {
          await mod
            .setAudioModeAsync({
              playsInSilentMode: true,
              interruptionMode: 'mixWithOthers',
            })
            .catch(() => {});
        }
        const stepPlayer = mod.createAudioPlayer(stepAsset, { downloadFirst: true });
        const backtrackPlayer = mod.createAudioPlayer(backtrackAsset, { downloadFirst: true });
        const winPlayer = mod.createAudioPlayer(winAsset, { downloadFirst: true });
        stepPlayer.volume = 0.85;
        backtrackPlayer.volume = 0.75;
        winPlayer.volume = 1.0;
        players = {
          step: stepPlayer,
          backtrack: backtrackPlayer,
          win: winPlayer,
        };
        return players;
      } catch (err) {
        audioModulePromise = null;
        if (!warnedUnavailable) {
          warnedUnavailable = true;
          console.warn(
            '[PathLoop] expo-audio native module is unavailable in this build; rebuild the native app to enable sound effects.',
            err?.message || err
          );
        }
        return null;
      }
    })();
  }

  return audioModulePromise;
}

function playEffect(key) {
  if (!soundEnabled) return;
  if (Platform.OS === 'web' && typeof window === 'undefined') return;

  getAudioPlayers()
    .then(async (map) => {
      const player = map?.[key];
      if (!player) return;
      if (player.currentTime > 0 || player.playing) {
        try {
          await player.seekTo(0);
        } catch {
          // Ignore seek errors on short clips or unready players; still attempt play().
        }
      }
      try {
        player.play();
      } catch (err) {
        if (!warnedUnavailable) {
          warnedUnavailable = true;
          console.warn('[PathLoop] Failed to play sound effect:', err?.message || err);
        }
      }
    })
    .catch(() => {});
}

export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
  if (soundEnabled) {
    // Pre-initialize players so first drag has minimal latency.
    getAudioPlayers().catch(() => {});
  }
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function playStepSound() {
  playEffect('step');
}

export function playBacktrackSound() {
  playEffect('backtrack');
}

export function playWinSound() {
  playEffect('win');
}
