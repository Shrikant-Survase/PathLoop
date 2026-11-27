/**
 * Canonical cell coordinate key.
 * @param {number} row
 * @param {number} col
 * @returns {string}
 */
export function cellKey(row, col) {
  return `${row},${col}`;
}

/**
 * Canonical undirected edge key between two adjacent cells.
 * @param {{ row: number, col: number }} a
 * @param {{ row: number, col: number }} b
 * @returns {string}
 */
export function wallKey(a, b) {
  const ka = cellKey(a.row, a.col);
  const kb = cellKey(b.row, b.col);
  return ka <= kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

/**
 * Check whether cell coordinates fall inside a square grid of `size`.
 * @param {number} size
 * @param {{ row: number, col: number } | null | undefined} cell
 * @returns {boolean}
 */
export function isInBounds(size, cell) {
  return (
    cell != null &&
    Number.isInteger(cell.row) &&
    Number.isInteger(cell.col) &&
    cell.row >= 0 &&
    cell.row < size &&
    cell.col >= 0 &&
    cell.col < size
  );
}

/**
 * Check strict orthogonal adjacency (Manhattan distance === 1).
 * @param {{ row: number, col: number }} a
 * @param {{ row: number, col: number }} b
 * @returns {boolean}
 */
export function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/**
 * Check whether a wall blocks direct movement between two cells.
 * @param {{ wallKeys?: string[] }} puzzle
 * @param {{ row: number, col: number }} a
 * @param {{ row: number, col: number }} b
 * @returns {boolean}
 */
export function hasWallBetween(puzzle, a, b) {
  if (!puzzle || !Array.isArray(puzzle.wallKeys) || puzzle.wallKeys.length === 0) {
    return false;
  }
  return puzzle.wallKeys.includes(wallKey(a, b));
}

/**
 * Determine the next checkpoint number (1-based) that must be visited next.
 * @param {{ checkpointMap: Record<string, number> }} puzzle
 * @param {Array<{ row: number, col: number }>} path
 * @returns {number}
 */
export function getNextExpectedCheckpoint(puzzle, path) {
  let expected = 1;
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    const cp = puzzle.checkpointMap[cellKey(cell.row, cell.col)];
    if (cp === expected) {
      expected += 1;
    }
  }
  return expected;
}

/**
 * Check whether appending `nextCell` to `path` is a legal move.
 * @param {{ size: number, checkpoints: Array, checkpointMap: Record<string, number>, wallKeys?: string[] }} puzzle
 * @param {Array<{ row: number, col: number }>} path
 * @param {{ row: number, col: number }} nextCell
 * @returns {boolean}
 */
export function canStep(puzzle, path, nextCell) {
  if (!puzzle || !isInBounds(puzzle.size, nextCell)) {
    return false;
  }

  const nextKey = cellKey(nextCell.row, nextCell.col);
  const cp = puzzle.checkpointMap[nextKey];

  if (!path || path.length === 0) {
    return cp === 1;
  }

  const expectedCp = getNextExpectedCheckpoint(puzzle, path);
  if (expectedCp > puzzle.checkpoints.length) {
    return false;
  }

  const prev = path[path.length - 1];
  if (!isAdjacent(prev, nextCell)) {
    return false;
  }
  if (hasWallBetween(puzzle, prev, nextCell)) {
    return false;
  }

  for (let i = 0; i < path.length; i += 1) {
    if (path[i].row === nextCell.row && path[i].col === nextCell.col) {
      return false;
    }
  }

  if (cp !== undefined && cp !== expectedCp) {
    return false;
  }

  return true;
}

/**
 * Validate a complete player path against every game rule.
 * @param {{ size: number, checkpoints: Array, checkpointMap: Record<string, number>, wallKeys?: string[] }} puzzle
 * @param {Array<{ row: number, col: number }>} path
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validatePath(puzzle, path) {
  if (!puzzle || !Array.isArray(path)) {
    return { valid: false, reason: 'Invalid puzzle or path' };
  }

  const totalCells = puzzle.size * puzzle.size;
  if (path.length !== totalCells) {
    return { valid: false, reason: `Path covers ${path.length} of ${totalCells} cells` };
  }

  const visited = new Set();
  let expectedCp = 1;

  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    if (!isInBounds(puzzle.size, cell)) {
      return { valid: false, reason: 'Cell out of bounds' };
    }

    const key = cellKey(cell.row, cell.col);
    if (visited.has(key)) {
      return { valid: false, reason: 'Duplicate cell visited' };
    }
    visited.add(key);

    if (i > 0) {
      const prev = path[i - 1];
      if (!isAdjacent(prev, cell)) {
        return { valid: false, reason: 'Non-adjacent step in path' };
      }
      if (hasWallBetween(puzzle, prev, cell)) {
        return { valid: false, reason: 'Path crosses a wall' };
      }
    }

    const cp = puzzle.checkpointMap[key];
    if (cp !== undefined) {
      if (cp !== expectedCp) {
        return { valid: false, reason: `Checkpoint ${cp} visited out of order` };
      }
      expectedCp += 1;
    }
  }

  const totalCheckpoints = puzzle.checkpoints.length;
  if (expectedCp !== totalCheckpoints + 1) {
    return { valid: false, reason: 'Not all checkpoints were visited' };
  }

  const lastCell = path[path.length - 1];
  const lastCp = puzzle.checkpointMap[cellKey(lastCell.row, lastCell.col)];
  if (lastCp !== totalCheckpoints) {
    return { valid: false, reason: 'Path must end on the final checkpoint' };
  }

  return { valid: true };
}

/**
 * Resolve a drag/touch transition onto `targetCell`, supporting:
 * - starting on checkpoint 1
 * - backtracking onto recent tail cells (or any visited cell on a fresh press)
 * - advancing 1 step orthogonally
 * - bridging 2-cell straight or 1-corner fast drags when unambiguous & legal
 * @param {object} puzzle
 * @param {Array<{ row: number, col: number }>} path
 * @param {{ row: number, col: number }} targetCell
 * @param {boolean} [isBegin]
 * @returns {{ path: Array<{ row: number, col: number }>, action: 'advance' | 'backtrack' | 'none' }}
 */
export function resolveDragStep(puzzle, path, targetCell, isBegin = false) {
  if (!puzzle || !isInBounds(puzzle.size, targetCell)) {
    return { path, action: 'none' };
  }

  if (path.length === 0) {
    if (canStep(puzzle, path, targetCell)) {
      return { path: [{ row: targetCell.row, col: targetCell.col }], action: 'advance' };
    }
    return { path, action: 'none' };
  }

  const existingIndex = path.findIndex((c) => c.row === targetCell.row && c.col === targetCell.col);
  if (existingIndex !== -1) {
    if (existingIndex === path.length - 1) {
      return { path, action: 'none' };
    }
    if (isBegin || existingIndex >= path.length - 3) {
      return { path: path.slice(0, existingIndex + 1), action: 'backtrack' };
    }
    return { path, action: 'none' };
  }

  if (canStep(puzzle, path, targetCell)) {
    return {
      path: [...path, { row: targetCell.row, col: targetCell.col }],
      action: 'advance',
    };
  }

  const tip = path[path.length - 1];
  const dRow = targetCell.row - tip.row;
  const dCol = targetCell.col - tip.col;
  const manhattan = Math.abs(dRow) + Math.abs(dCol);

  if (manhattan === 2) {
    const bridges = [];
    if (dRow === 0 || dCol === 0) {
      bridges.push({
        row: tip.row + dRow / 2,
        col: tip.col + dCol / 2,
      });
    } else {
      bridges.push({ row: tip.row, col: targetCell.col });
      bridges.push({ row: targetCell.row, col: tip.col });
    }

    const validPaths = [];
    for (let i = 0; i < bridges.length; i += 1) {
      const mid = bridges[i];
      if (canStep(puzzle, path, mid)) {
        const nextPath = [...path, mid];
        if (canStep(puzzle, nextPath, targetCell)) {
          validPaths.push([...nextPath, { row: targetCell.row, col: targetCell.col }]);
        }
      }
    }

    if (validPaths.length === 1) {
      return { path: validPaths[0], action: 'advance' };
    }
  }

  return { path, action: 'none' };
}
