import { Share } from 'react-native';

import { formatTime } from '../components/Timer';

export function buildShareText({ puzzleNumber, difficultyLabel, seconds, hintsUsed, streak }) {
  const lines = [
    `PathLoop #${puzzleNumber} 🧩 ${difficultyLabel}`,
    `⏱ ${formatTime(seconds)} | 💡 ${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'}`,
    `🔥 ${streak}-day streak`,
  ];
  return lines.join('\n');
}

export async function sharePuzzleResult(params) {
  const message = buildShareText(params);
  return Share.share({ message });
}
