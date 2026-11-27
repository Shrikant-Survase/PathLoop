import { StyleSheet, Text, View } from 'react-native';

/**
 * Base grid cell background tile (rendered underneath the SVG path layer).
 */
export function Cell({ cellSize, isVisited, isWon, isHinted, isMistake, theme }) {
  let backgroundColor = 'transparent';
  if (isMistake) {
    backgroundColor = theme.dangerSoft;
  } else if (isHinted) {
    backgroundColor = theme.goldSoft;
  } else if (isVisited) {
    backgroundColor = isWon ? theme.successSoft : theme.accentSoft;
  }

  return (
    <View
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          borderColor: isHinted ? theme.gold : isMistake ? theme.danger : theme.gridLine,
          borderWidth: isHinted || isMistake ? 1.5 : StyleSheet.hairlineWidth,
          backgroundColor,
        },
      ]}
    />
  );
}

/**
 * Numbered checkpoint badge (rendered above the SVG path layer so numbers stay crisp).
 */
export function CheckpointBadge({ num, row, col, cellSize, isVisited, isNext, isWon, theme }) {
  const badgeSize = Math.round(cellSize * 0.56);
  const fontSize = Math.max(11, Math.round(cellSize * 0.28));
  const top = row * cellSize + (cellSize - badgeSize) / 2;
  const left = col * cellSize + (cellSize - badgeSize) / 2;

  const activeAccent = isWon ? theme.success : theme.trail;
  const bg = isVisited ? theme.checkpointVisitedBg : theme.checkpointBg;
  const textColor = isVisited
    ? isWon
      ? theme.success
      : theme.checkpointVisitedText
    : theme.checkpointText;
  const borderColor = isVisited || isNext ? activeAccent : 'transparent';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        {
          top,
          left,
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: bg,
          borderColor,
          borderWidth: isVisited ? 2.5 : isNext ? 2 : 0,
        },
      ]}>
      <Text style={[styles.badgeText, { color: textColor, fontSize }]}>{num}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontWeight: '700',
    includeFontPadding: false,
  },
});
