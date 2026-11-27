import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

function buildSvgPath(path, cellSize) {
  if (!path || path.length === 0) return '';
  const half = cellSize / 2;
  const segments = [];
  for (let i = 0; i < path.length; i += 1) {
    const x = path[i].col * cellSize + half;
    const y = path[i].row * cellSize + half;
    segments.push(i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
  }
  return segments.join(' ');
}

/**
 * Renders the player's continuous rounded path using react-native-svg.
 */
export function PathLayer({ path, boardSize, cellSize, isWon, theme }) {
  if (!path || path.length === 0) {
    return null;
  }

  const strokeWidth = Math.round(cellSize * 0.42);
  const glowWidth = Math.round(cellSize * 0.62);
  const d = buildSvgPath(path, cellSize);
  const tip = path[path.length - 1];
  const tipX = tip.col * cellSize + cellSize / 2;
  const tipY = tip.row * cellSize + cellSize / 2;
  const trailColor = isWon ? theme.success : theme.trail;
  const glowColor = isWon ? theme.successSoft : theme.trailGlow;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={boardSize} height={boardSize}>
        {path.length > 1 ? (
          <>
            <Path
              d={d}
              fill="none"
              stroke={glowColor}
              strokeWidth={glowWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d={d}
              fill="none"
              stroke={trailColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <Circle cx={tipX} cy={tipY} r={glowWidth / 2} fill={glowColor} />
        )}
        <Circle cx={tipX} cy={tipY} r={strokeWidth * 0.56} fill={trailColor} />
      </Svg>
    </View>
  );
}
