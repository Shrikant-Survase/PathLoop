import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cellKey } from '../game/validator';
import { Cell, CheckpointBadge } from './Cell';
import { PathLayer } from './PathLayer';

const HALO_SIZE = 44;

export function Grid({
  puzzle,
  path,
  nextCheckpoint,
  isWon,
  hintCells = [],
  mistakeStartIndex = null,
  onCellTouch,
  theme,
}) {
  const { width } = useWindowDimensions();
  const maxBoardWidth = Math.min(width - 32, 400);
  const cellSize = Math.floor(maxBoardWidth / puzzle.size);
  const boardSize = cellSize * puzzle.size;

  const lastRow = useSharedValue(-1);
  const lastCol = useSharedValue(-1);
  const isDragging = useSharedValue(0);
  const fingerX = useSharedValue(0);
  const fingerY = useSharedValue(0);

  const visitedSet = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < path.length; i += 1) {
      set.add(cellKey(path[i].row, path[i].col));
    }
    return set;
  }, [path]);

  const hintSet = useMemo(() => {
    const set = new Set();
    for (let i = 0; i < hintCells.length; i += 1) {
      set.add(cellKey(hintCells[i].row, hintCells[i].col));
    }
    return set;
  }, [hintCells]);

  const mistakeSet = useMemo(() => {
    const set = new Set();
    if (mistakeStartIndex != null && mistakeStartIndex >= 0) {
      for (let i = mistakeStartIndex; i < path.length; i += 1) {
        set.add(cellKey(path[i].row, path[i].col));
      }
    }
    return set;
  }, [mistakeStartIndex, path]);

  const panGesture = usePanGesture({
    minDistance: 0,
    enabled: !isWon,
    shouldCancelWhenOutside: false,
    onBegin(event) {
      'worklet';
      isDragging.value = 1;
      fingerX.value = event.x;
      fingerY.value = event.y;
      const col = Math.floor(event.x / cellSize);
      const row = Math.floor(event.y / cellSize);
      lastRow.value = row;
      lastCol.value = col;
      if (row >= 0 && row < puzzle.size && col >= 0 && col < puzzle.size) {
        scheduleOnRN(onCellTouch, row, col, true);
      }
    },
    onUpdate(event) {
      'worklet';
      fingerX.value = event.x;
      fingerY.value = event.y;
      const col = Math.floor(event.x / cellSize);
      const row = Math.floor(event.y / cellSize);
      if (row < 0 || row >= puzzle.size || col < 0 || col >= puzzle.size) {
        return;
      }
      if (row !== lastRow.value || col !== lastCol.value) {
        lastRow.value = row;
        lastCol.value = col;
        scheduleOnRN(onCellTouch, row, col, false);
      }
    },
    onFinalize() {
      'worklet';
      isDragging.value = 0;
      lastRow.value = -1;
      lastCol.value = -1;
    },
  });

  const fingerHaloStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value,
    transform: [
      { translateX: fingerX.value - HALO_SIZE / 2 },
      { translateY: fingerY.value - HALO_SIZE / 2 },
    ],
  }));

  const rows = [];
  for (let row = 0; row < puzzle.size; row += 1) {
    const cells = [];
    for (let col = 0; col < puzzle.size; col += 1) {
      const key = cellKey(row, col);
      cells.push(
        <Cell
          key={key}
          cellSize={cellSize}
          isVisited={visitedSet.has(key)}
          isWon={isWon}
          isHinted={hintSet.has(key)}
          isMistake={mistakeSet.has(key)}
          theme={theme}
        />
      );
    }
    rows.push(
      <View key={`row-${row}`} style={styles.row}>
        {cells}
      </View>
    );
  }

  const wallThickness = 5;
  const wallInset = 2;

  return (
    <View
      style={[
        styles.boardFrame,
        {
          backgroundColor: theme.surface,
          borderColor: isWon ? theme.success : theme.border,
        },
      ]}>
      <GestureDetector gesture={panGesture}>
        <View
          style={[
            styles.board,
            {
              width: boardSize,
              height: boardSize,
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}>
          <View pointerEvents="none">{rows}</View>

          <PathLayer
            path={path}
            boardSize={boardSize}
            cellSize={cellSize}
            isWon={isWon}
            theme={theme}
          />

          {puzzle.checkpoints.map((cp) => (
            <CheckpointBadge
              key={`cp-${cp.num}`}
              num={cp.num}
              row={cp.row}
              col={cp.col}
              cellSize={cellSize}
              isVisited={visitedSet.has(cellKey(cp.row, cp.col))}
              isNext={cp.num === nextCheckpoint}
              isWon={isWon}
              theme={theme}
            />
          ))}

          {puzzle.walls.map((wall) => {
            const isVertical = wall.a.row === wall.b.row;
            const style = isVertical
              ? {
                  left: Math.max(wall.a.col, wall.b.col) * cellSize - wallThickness / 2,
                  top: wall.a.row * cellSize + wallInset,
                  width: wallThickness,
                  height: cellSize - wallInset * 2,
                }
              : {
                  left: wall.a.col * cellSize + wallInset,
                  top: Math.max(wall.a.row, wall.b.row) * cellSize - wallThickness / 2,
                  width: cellSize - wallInset * 2,
                  height: wallThickness,
                };
            return (
              <View
                key={wall.key}
                pointerEvents="none"
                style={[
                  styles.wall,
                  style,
                  {
                    backgroundColor: theme.wall,
                    borderRadius: wallThickness / 2,
                  },
                ]}
              />
            );
          })}

          <Animated.View
            pointerEvents="none"
            style={[
              styles.fingerHalo,
              {
                backgroundColor: theme.trailGlow,
                borderColor: theme.trail,
              },
              fingerHaloStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: {
    padding: 8,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  board: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
  },
  wall: {
    position: 'absolute',
  },
  fingerHalo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 1.5,
  },
});
