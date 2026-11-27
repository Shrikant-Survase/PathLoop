import { cellKey, getNextExpectedCheckpoint, hasWallBetween, isInBounds } from './validator.js';

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * Check whether `path` matches the exact prefix of `solution`.
 * @param {Array<{ row: number, col: number }>} path
 * @param {Array<{ row: number, col: number }>} solution
 * @returns {boolean}
 */
export function isPrefixOfSolution(path, solution) {
  if (!Array.isArray(path) || !Array.isArray(solution) || path.length > solution.length) {
    return false;
  }
  for (let i = 0; i < path.length; i += 1) {
    if (path[i].row !== solution[i].row || path[i].col !== solution[i].col) {
      return false;
    }
  }
  return true;
}

/**
 * Bounded backtracking solver checking if `path` can still be completed into a valid win.
 * Returns the full completed path if solvable, or `null` if dead-end / budget exhausted.
 * @param {object} puzzle
 * @param {Array<{ row: number, col: number }>} path
 * @param {number} [maxSteps]
 * @returns {Array<{ row: number, col: number }> | null}
 */
export function findCompletionFromPath(puzzle, path, maxSteps = 25000) {
  if (!puzzle || !Array.isArray(path)) return null;
  const size = puzzle.size;
  const total = size * size;
  const totalCheckpoints = puzzle.checkpoints.length;

  if (path.length === 0) {
    return puzzle.solution ? [...puzzle.solution] : null;
  }

  const visited = new Uint8Array(total);
  for (let i = 0; i < path.length; i += 1) {
    const cell = path[i];
    if (!isInBounds(size, cell)) return null;
    const idx = cell.row * size + cell.col;
    if (visited[idx]) return null;
    visited[idx] = 1;
  }

  const initialExpectedCp = getNextExpectedCheckpoint(puzzle, path);
  if (path.length === total) {
    const last = path[path.length - 1];
    const lastCp = puzzle.checkpointMap[cellKey(last.row, last.col)];
    return initialExpectedCp === totalCheckpoints + 1 && lastCp === totalCheckpoints
      ? [...path]
      : null;
  }

  // If the final checkpoint was already hit early, no valid continuation exists.
  if (initialExpectedCp > totalCheckpoints) {
    return null;
  }

  // Verify remaining unvisited cells can form a connected component from the tip
  // and that every remaining checkpoint is still unvisited.
  for (let cp = initialExpectedCp; cp <= totalCheckpoints; cp += 1) {
    const target = puzzle.checkpoints[cp - 1];
    if (visited[target.row * size + target.col]) {
      return null;
    }
  }

  const resultPath = new Array(total);
  for (let i = 0; i < path.length; i += 1) {
    resultPath[i] = path[i];
  }

  let steps = 0;

  function countFreeNeighbors(row, col) {
    let count = 0;
    const cur = { row, col };
    for (let i = 0; i < 4; i += 1) {
      const nr = row + DIRECTIONS[i][0];
      const nc = col + DIRECTIONS[i][1];
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr * size + nc]) {
        if (!hasWallBetween(puzzle, cur, { row: nr, col: nc })) {
          count += 1;
        }
      }
    }
    return count;
  }

  function search(row, col, depth, expectedCp) {
    steps += 1;
    if (steps > maxSteps) return false;
    if (depth === total) {
      return expectedCp === totalCheckpoints + 1;
    }

    const cur = { row, col };
    const candidates = [];
    for (let i = 0; i < 4; i += 1) {
      const nr = row + DIRECTIONS[i][0];
      const nc = col + DIRECTIONS[i][1];
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const nIdx = nr * size + nc;
      if (visited[nIdx]) continue;
      const nextCell = { row: nr, col: nc };
      if (hasWallBetween(puzzle, cur, nextCell)) continue;

      const cp = puzzle.checkpointMap[cellKey(nr, nc)];
      if (cp !== undefined && cp !== expectedCp) continue;
      // Final checkpoint must only be entered on the very last cell.
      if (cp === totalCheckpoints && depth < total - 1) continue;

      const nextExpected = cp === expectedCp ? expectedCp + 1 : expectedCp;
      const degree = countFreeNeighbors(nr, nc);
      if (degree === 0 && depth < total - 1) continue;

      candidates.push({ row: nr, col: nc, nIdx, nextExpected, degree });
    }

    candidates.sort((a, b) => a.degree - b.degree);

    for (let i = 0; i < candidates.length; i += 1) {
      const cand = candidates[i];
      visited[cand.nIdx] = 1;
      resultPath[depth] = { row: cand.row, col: cand.col };
      if (search(cand.row, cand.col, depth + 1, cand.nextExpected)) {
        return true;
      }
      visited[cand.nIdx] = 0;
    }

    return false;
  }

  const tip = path[path.length - 1];
  return search(tip.row, tip.col, path.length, initialExpectedCp) ? resultPath : null;
}

/**
 * Analyze the current path and compute either:
 * - { type: 'reveal', cells } (up to next 3 cells along a valid completion)
 * - { type: 'mistake', undoToIndex, mistakeStartIndex } (when current path cannot be completed)
 * @param {object} puzzle
 * @param {Array<{ row: number, col: number }>} path
 */
export function analyzeHint(puzzle, path) {
  if (!path || path.length === 0) {
    return {
      type: 'reveal',
      cells: puzzle.solution.slice(0, 3),
    };
  }

  if (isPrefixOfSolution(path, puzzle.solution)) {
    return {
      type: 'reveal',
      cells: puzzle.solution.slice(path.length, path.length + 3),
    };
  }

  const completion = findCompletionFromPath(puzzle, path);
  if (completion) {
    return {
      type: 'reveal',
      cells: completion.slice(path.length, path.length + 3),
    };
  }

  // Binary search for the longest completable prefix length in [1, path.length - 1].
  let low = 1;
  let high = path.length - 1;
  let bestLen = 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const ok = findCompletionFromPath(puzzle, path.slice(0, mid)) !== null;
    if (ok) {
      bestLen = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return {
    type: 'mistake',
    undoToIndex: bestLen - 1,
    mistakeStartIndex: bestLen,
  };
}
