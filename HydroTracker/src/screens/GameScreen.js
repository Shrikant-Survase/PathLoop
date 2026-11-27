import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Grid } from '../components/Grid';
import { ResultModal } from '../components/ResultModal';
import { Timer } from '../components/Timer';
import {
  calculateLevelStars,
  DIFFICULTIES,
  getLevelSeed,
  LEVELS_PER_WORLD,
} from '../game/difficulty';
import { generateDailyPuzzle, generatePuzzleAsync, generatePuzzleBySeed } from '../game/generator';
import { analyzeHint } from '../game/hints';
import { getPuzzleNumber } from '../game/seed';
import { getNextExpectedCheckpoint, resolveDragStep, validatePath } from '../game/validator';
import { useGame } from '../storage/GameProvider';
import { triggerBacktrackTick, triggerCellTick, triggerWinHaptic } from '../utils/haptics';
import { sharePuzzleResult } from '../utils/share';
import { playBacktrackSound, playStepSound, playWinSound } from '../utils/sound';

function GameBoard({ mode, targetDate, difficultyParam, levelNumber, practiceSeed }) {
  const router = useRouter();
  const {
    progress,
    theme,
    recordDailyResult,
    recordLevelResult,
    recordPracticeResult,
    consumeHint,
  } = useGame();

  const [puzzle, setPuzzle] = useState(null);
  const [path, setPath] = useState([]);
  const pathRef = useRef([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [hintsUsedHere, setHintsUsedHere] = useState(0);
  const [hintCells, setHintCells] = useState([]);
  const [mistakeInfo, setMistakeInfo] = useState(null);
  const [hintNotice, setHintNotice] = useState(null);
  const [isWon, setIsWon] = useState(false);
  const [wonStars, setWonStars] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const revealTimeoutRef = useRef(null);

  useEffect(() => {
    let active = true;

    const build = () => {
      if (mode === 'daily' || mode === 'archive') {
        return generateDailyPuzzle(targetDate);
      }
      if (mode === 'level') {
        return generatePuzzleBySeed(getLevelSeed(difficultyParam, levelNumber), difficultyParam, {
          levelNumber,
        });
      }
      return generatePuzzleBySeed(practiceSeed, difficultyParam);
    };

    generatePuzzleAsync(build).then((generated) => {
      if (active) {
        setPuzzle(generated);
      }
    });

    return () => {
      active = false;
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, [difficultyParam, levelNumber, mode, practiceSeed, targetDate]);

  const totalCells = puzzle ? puzzle.size * puzzle.size : 0;
  const totalCheckpoints = puzzle ? puzzle.checkpoints.length : 0;
  const nextCheckpoint = puzzle ? getNextExpectedCheckpoint(puzzle, path) : 1;
  const isTimerRunning = Boolean(puzzle) && path.length > 0 && !isWon;
  const displaySeconds =
    mode === 'daily' || mode === 'archive' ? elapsedSeconds + hintsUsedHere * 10 : elapsedSeconds;
  const currentStreak = progress.streak?.current || 0;

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const finalizeWin = useCallback(
    async (finalSeconds, usedHintsCount) => {
      if (!puzzle) return;
      setIsWon(true);
      triggerWinHaptic();
      playWinSound();

      if (mode === 'daily' || mode === 'archive') {
        const finalTime = finalSeconds + usedHintsCount * 10;
        await recordDailyResult({
          date: puzzle.date || targetDate,
          time: finalTime,
          hintsUsed: usedHintsCount,
          difficulty: puzzle.difficulty,
          puzzleNumber: puzzle.puzzleNumber || getPuzzleNumber(targetDate),
          isArchive: mode === 'archive',
        });
      } else if (mode === 'level') {
        const stars = calculateLevelStars({
          hintsUsed: usedHintsCount,
          elapsedSeconds: finalSeconds,
          targetTimeSeconds: puzzle.targetTimeSeconds,
        });
        setWonStars(stars);
        await recordLevelResult({
          difficulty: puzzle.difficulty,
          number: levelNumber,
          stars,
          time: finalSeconds,
          hintsUsed: usedHintsCount,
        });
      } else if (mode === 'practice') {
        await recordPracticeResult({ difficulty: puzzle.difficulty });
      }

      setShowResultModal(true);
    },
    [
      levelNumber,
      mode,
      puzzle,
      recordDailyResult,
      recordLevelResult,
      recordPracticeResult,
      targetDate,
    ]
  );

  const handleCellTouch = useCallback(
    (row, col, isBegin) => {
      if (isWon || !puzzle) return;
      const result = resolveDragStep(puzzle, pathRef.current, { row, col }, isBegin);
      if (result.action === 'none') return;

      setMistakeInfo(null);
      setHintNotice(null);
      pathRef.current = result.path;
      setPath(result.path);

      if (result.path.length === totalCells && validatePath(puzzle, result.path).valid) {
        finalizeWin(elapsedSeconds, hintsUsedHere);
        return;
      }

      if (result.action === 'advance') {
        triggerCellTick();
        playStepSound();
      } else if (result.action === 'backtrack') {
        triggerBacktrackTick();
        playBacktrackSound();
      }
    },
    [elapsedSeconds, finalizeWin, hintsUsedHere, isWon, puzzle, totalCells]
  );

  const handleUndo = useCallback(() => {
    if (isWon || pathRef.current.length === 0) return;
    const next = pathRef.current.slice(0, -1);
    pathRef.current = next;
    setPath(next);
    setMistakeInfo(null);
    triggerBacktrackTick();
    playBacktrackSound();
  }, [isWon]);

  const handleClear = useCallback(() => {
    if (isWon || pathRef.current.length === 0) return;
    pathRef.current = [];
    setPath([]);
    setMistakeInfo(null);
    setHintCells([]);
    triggerBacktrackTick();
    playBacktrackSound();
  }, [isWon]);

  const handleReplay = useCallback(() => {
    pathRef.current = [];
    setPath([]);
    setElapsedSeconds(0);
    setHintsUsedHere(0);
    setHintCells([]);
    setMistakeInfo(null);
    setHintNotice(null);
    setIsWon(false);
    setWonStars(null);
    setShowResultModal(false);
  }, []);

  const handleHintPress = useCallback(async () => {
    if (isWon || !puzzle) return;
    if (progress.hintsAvailable <= 0) {
      setHintNotice('No hints left today — solve hintless dailies or 3★ levels to earn more.');
      return;
    }

    const analysis = analyzeHint(puzzle, pathRef.current);
    if (analysis.type === 'mistake') {
      const consumeRes = await consumeHint();
      if (!consumeRes.ok) return;
      setHintsUsedHere((h) => h + 1);
      setMistakeInfo(analysis);
      setHintNotice(
        mode === 'daily' || mode === 'archive'
          ? 'Path blocked ahead (+10s hint penalty)'
          : 'Path blocked ahead'
      );
      triggerBacktrackTick();
      return;
    }

    if (!analysis.cells || analysis.cells.length === 0) return;
    const consumeRes = await consumeHint();
    if (!consumeRes.ok) return;

    const nextHintsCount = hintsUsedHere + 1;
    setHintsUsedHere(nextHintsCount);
    setMistakeInfo(null);
    setHintCells(analysis.cells);
    setHintNotice(
      mode === 'daily' || mode === 'archive'
        ? `Revealed ${analysis.cells.length} cells (+10s penalty)`
        : `Revealed ${analysis.cells.length} cells`
    );
    triggerCellTick();

    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }
    revealTimeoutRef.current = setTimeout(() => {
      const nextPath = [...pathRef.current, ...analysis.cells];
      pathRef.current = nextPath;
      setPath(nextPath);
      setHintCells([]);
      if (nextPath.length === totalCells && validatePath(puzzle, nextPath).valid) {
        finalizeWin(elapsedSeconds, nextHintsCount);
      }
    }, 550);
  }, [
    consumeHint,
    elapsedSeconds,
    finalizeWin,
    hintsUsedHere,
    isWon,
    mode,
    progress.hintsAvailable,
    puzzle,
    totalCells,
  ]);

  const handleUndoToMistake = useCallback(() => {
    if (!mistakeInfo) return;
    const next = pathRef.current.slice(0, mistakeInfo.undoToIndex + 1);
    pathRef.current = next;
    setPath(next);
    setMistakeInfo(null);
    setHintNotice(null);
    triggerBacktrackTick();
  }, [mistakeInfo]);

  const handleNextLevel = useCallback(() => {
    if (mode !== 'level' || levelNumber >= LEVELS_PER_WORLD) return;
    setShowResultModal(false);
    router.replace({
      pathname: '/game',
      params: {
        mode: 'level',
        difficulty: difficultyParam,
        level: String(levelNumber + 1),
      },
    });
  }, [difficultyParam, levelNumber, mode, router]);

  const handleShare = useCallback(() => {
    if (!puzzle) return;
    sharePuzzleResult({
      puzzleNumber: puzzle.puzzleNumber || levelNumber,
      difficultyLabel: puzzle.difficultyLabel || DIFFICULTIES[puzzle.difficulty]?.label || 'Daily',
      seconds: displaySeconds,
      hintsUsed: hintsUsedHere,
      streak: currentStreak,
    }).catch(() => {});
  }, [currentStreak, displaySeconds, hintsUsedHere, levelNumber, puzzle]);

  if (!puzzle) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.loadingWrap, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textMuted }]}>Generating puzzle...</Text>
      </SafeAreaView>
    );
  }

  let headerTitle = `Daily #${puzzle.puzzleNumber}`;
  let headerSub = `${puzzle.difficultyLabel} · ${puzzle.size}×${puzzle.size}`;
  if (mode === 'archive') {
    headerTitle = `Archive #${puzzle.puzzleNumber}`;
    headerSub = `${puzzle.date} · ${puzzle.difficultyLabel}`;
  } else if (mode === 'level') {
    headerTitle = `${puzzle.difficultyLabel} · Level ${levelNumber}`;
    headerSub = `3★ target ${puzzle.targetTimeSeconds}s`;
  } else if (mode === 'practice') {
    headerTitle = `Practice · ${puzzle.difficultyLabel}`;
    headerSub = `${puzzle.size}×${puzzle.size} · No streak impact`;
  }

  const canUndoOrClear = path.length > 0 && !isWon;
  const modalTitle =
    mode === 'level'
      ? `Level ${levelNumber} Complete`
      : mode === 'practice'
        ? `${puzzle.difficultyLabel} Solved`
        : `PathLoop #${puzzle.puzzleNumber}`;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={[
                styles.iconBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Ionicons name="arrow-back" size={20} color={theme.text} />
            </Pressable>
            <View>
              <Text style={[styles.title, { color: theme.text }]}>{headerTitle}</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{headerSub}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={handleHintPress}
              disabled={isWon}
              style={[
                styles.hintBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: isWon ? 0.5 : 1,
                },
              ]}>
              <Ionicons name="bulb" size={18} color={theme.gold} />
              <View style={[styles.hintBadge, { backgroundColor: theme.accent }]}>
                <Text style={[styles.hintBadgeText, { color: theme.accentText }]}>
                  {progress.hintsAvailable}
                </Text>
              </View>
            </Pressable>

            <Timer seconds={displaySeconds} theme={theme} />
          </View>
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isWon ? theme.successSoft : theme.surface,
                borderColor: isWon ? theme.success : theme.border,
              },
            ]}>
            <Text style={[styles.statusText, { color: isWon ? theme.success : theme.text }]}>
              {isWon
                ? `Solved · ${totalCells}/${totalCells} cells`
                : `Cells ${path.length}/${totalCells}`}
            </Text>
          </View>

          {isWon ? (
            <Pressable
              onPress={() => setShowResultModal(true)}
              style={[
                styles.statusPill,
                { backgroundColor: theme.accentSoft, borderColor: theme.accent },
              ]}>
              <Text style={[styles.statusText, { color: theme.accent }]}>View Result</Text>
            </Pressable>
          ) : (
            <View
              style={[
                styles.statusPill,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}>
              <Text style={[styles.statusText, { color: theme.textMuted }]}>
                {nextCheckpoint <= totalCheckpoints
                  ? `Next checkpoint: ${nextCheckpoint}`
                  : 'Fill remaining cells'}
              </Text>
            </View>
          )}
        </View>

        {mistakeInfo ? (
          <View
            style={[
              styles.mistakeBar,
              { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
            ]}>
            <Text style={[styles.mistakeText, { color: theme.text }]}>No valid path from here</Text>
            <Pressable
              onPress={handleUndoToMistake}
              style={[styles.undoMistakeBtn, { backgroundColor: theme.danger }]}>
              <Text style={styles.undoMistakeText}>Undo to here</Text>
            </Pressable>
          </View>
        ) : hintNotice ? (
          <View
            style={[
              styles.noticeBar,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <Text style={[styles.noticeText, { color: theme.textMuted }]}>{hintNotice}</Text>
          </View>
        ) : null}

        <View style={styles.gridWrapper}>
          <Grid
            puzzle={puzzle}
            path={path}
            nextCheckpoint={nextCheckpoint}
            isWon={isWon}
            hintCells={hintCells}
            mistakeStartIndex={mistakeInfo ? mistakeInfo.mistakeStartIndex : null}
            onCellTouch={handleCellTouch}
            theme={theme}
          />
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={handleUndo}
            disabled={!canUndoOrClear}
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: !canUndoOrClear ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}>
            <Text style={[styles.controlText, { color: theme.text }]}>Undo</Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            disabled={!canUndoOrClear}
            style={({ pressed }) => [
              styles.controlButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: !canUndoOrClear ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}>
            <Text style={[styles.controlText, { color: theme.text }]}>Clear</Text>
          </Pressable>
        </View>

        <Text style={[styles.hintText, { color: theme.textMuted }]}>
          Drag from 1 to {totalCheckpoints} in order · Cover every cell · Avoid walls
        </Text>
      </View>

      <ResultModal
        visible={showResultModal}
        title={modalTitle}
        seconds={displaySeconds}
        totalCells={totalCells}
        stars={wonStars}
        hintsUsed={hintsUsedHere}
        onShare={mode === 'daily' || mode === 'archive' ? handleShare : null}
        onNextLevel={mode === 'level' && levelNumber < LEVELS_PER_WORLD ? handleNextLevel : null}
        onReplay={handleReplay}
        onClose={() => setShowResultModal(false)}
        theme={theme}
      />
    </SafeAreaView>
  );
}

export default function GameScreen() {
  const params = useLocalSearchParams();
  const { todayStr } = useGame();

  const mode = typeof params.mode === 'string' ? params.mode : 'daily';
  const targetDate = typeof params.date === 'string' ? params.date : todayStr;
  const difficultyParam = typeof params.difficulty === 'string' ? params.difficulty : 'medium';
  const levelNumber = params.level ? Number(params.level) : 1;
  const practiceSeed =
    typeof params.seed === 'string' ? params.seed : `practice-${difficultyParam}-default`;

  const boardKey = `${mode}:${targetDate}:${difficultyParam}:${levelNumber}:${practiceSeed}`;

  return (
    <GameBoard
      key={boardKey}
      mode={mode}
      targetDate={targetDate}
      difficultyParam={difficultyParam}
      levelNumber={levelNumber}
      practiceSeed={practiceSeed}
    />
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBtn: {
    width: 40,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  hintBadge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  mistakeBar: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mistakeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  undoMistakeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  undoMistakeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noticeBar: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  controlButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlText: {
    fontSize: 15,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
