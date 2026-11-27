import { DIFFICULTIES, getDailyDifficulty } from './difficulty.js';
import { createDateRng, getLocalDateString, getPuzzleNumber } from './seed.js';
import { cellKey, wallKey } from './validator.js';

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

function buildSerpentineFallback(size) {
  const path = [];
  for (let row = 0; row < size; row += 1) {
    if (row % 2 === 0) {
      for (let col = 0; col < size; col += 1) {
        path.push({ row, col });
      }
    } else {
      for (let col = size - 1; col >= 0; col -= 1) {
        path.push({ row, col });
      }
    }
  }
  return path;
}

function tryHamiltonianFrom(size, startRow, startCol, rng, maxSteps) {
  const total = size * size;
  const visited = new Uint8Array(total);
  const path = new Array(total);
  let steps = 0;

  function countUnvisitedNeighbors(row, col) {
    let count = 0;
    for (let i = 0; i < 4; i += 1) {
      const nr = row + DIRECTIONS[i][0];
      const nc = col + DIRECTIONS[i][1];
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr * size + nc]) {
        count += 1;
      }
    }
    return count;
  }

  function backtrack(row, col, depth) {
    steps += 1;
    if (steps > maxSteps) {
      return false;
    }

    const idx = row * size + col;
    visited[idx] = 1;
    path[depth] = { row, col };

    if (depth === total - 1) {
      return true;
    }

    const candidates = [];
    for (let i = 0; i < 4; i += 1) {
      const nr = row + DIRECTIONS[i][0];
      const nc = col + DIRECTIONS[i][1];
      if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited[nr * size + nc]) {
        const degree = countUnvisitedNeighbors(nr, nc);
        if (degree === 0 && depth + 1 < total - 1) {
          continue;
        }
        candidates.push({ row: nr, col: nc, degree, tie: rng() });
      }
    }

    candidates.sort((a, b) => a.degree - b.degree || a.tie - b.tie);

    for (let i = 0; i < candidates.length; i += 1) {
      const next = candidates[i];
      if (backtrack(next.row, next.col, depth + 1)) {
        return true;
      }
    }

    visited[idx] = 0;
    return false;
  }

  return backtrack(startRow, startCol, 0) ? path : null;
}

/**
 * Generate a random Hamiltonian path covering every cell of a `size x size` grid.
 * @param {number} size
 * @param {() => number} rng
 * @returns {Array<{ row: number, col: number }>}
 */
export function generateHamiltonianPath(size, rng) {
  const maxAttempts = 30;
  const maxSteps = 45000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const startRow = Math.floor(rng() * size);
    const startCol = Math.floor(rng() * size);
    const path = tryHamiltonianFrom(size, startRow, startCol, rng, maxSteps);
    if (path) {
      return path;
    }
  }

  return buildSerpentineFallback(size);
}

function placeCheckpoints(solution, checkpointCount) {
  const total = solution.length;
  const count = Math.max(2, Math.min(checkpointCount, total));
  const indices = new Set([0, total - 1]);

  for (let i = 1; i < count - 1; i += 1) {
    const idx = Math.round((i * (total - 1)) / (count - 1));
    indices.add(idx);
  }

  const sortedIndices = Array.from(indices).sort((a, b) => a - b);
  const checkpoints = [];
  const checkpointMap = {};

  for (let i = 0; i < sortedIndices.length; i += 1) {
    const cell = solution[sortedIndices[i]];
    const num = i + 1;
    checkpoints.push({ num, row: cell.row, col: cell.col });
    checkpointMap[cellKey(cell.row, cell.col)] = num;
  }

  return { checkpoints, checkpointMap };
}

function placeWalls(size, solution, wallCount, rng) {
  if (wallCount <= 0) {
    return { walls: [], wallKeys: [] };
  }

  const solutionEdges = new Set();
  for (let i = 0; i < solution.length - 1; i += 1) {
    solutionEdges.add(wallKey(solution[i], solution[i + 1]));
  }

  const candidates = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const a = { row, col };
      if (col + 1 < size) {
        const b = { row, col: col + 1 };
        const key = wallKey(a, b);
        if (!solutionEdges.has(key)) {
          candidates.push({ a, b, key });
        }
      }
      if (row + 1 < size) {
        const b = { row: row + 1, col };
        const key = wallKey(a, b);
        if (!solutionEdges.has(key)) {
          candidates.push({ a, b, key });
        }
      }
    }
  }

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const walls = candidates.slice(0, Math.min(wallCount, candidates.length));
  const wallKeys = walls.map((w) => w.key).sort();

  return { walls, wallKeys };
}

function randomIntInclusive(rng, min, max) {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Deterministically generate a puzzle from an arbitrary seed and difficulty config.
 * @param {string} seedStr
 * @param {string} [difficultyId]
 * @param {object} [meta]
 */
export function generatePuzzleBySeed(seedStr, difficultyId = 'medium', meta = {}) {
  const cfg = DIFFICULTIES[difficultyId] || DIFFICULTIES.medium;
  const size = meta.size ?? cfg.size;
  const rng = createDateRng(seedStr, `v2-${difficultyId}-${size}`);
  const checkpointCount =
    meta.checkpointCount ?? randomIntInclusive(rng, cfg.minCheckpoints, cfg.maxCheckpoints);
  const wallCount = meta.wallCount ?? randomIntInclusive(rng, cfg.minWalls, cfg.maxWalls);

  const solution = generateHamiltonianPath(size, rng);
  const { checkpoints, checkpointMap } = placeCheckpoints(solution, checkpointCount);
  const { walls, wallKeys } = placeWalls(size, solution, wallCount, rng);

  return {
    id: meta.id ?? seedStr,
    seed: seedStr,
    difficulty: cfg.id,
    difficultyLabel: cfg.label,
    targetTimeSeconds: cfg.targetTimeSeconds,
    size,
    checkpoints,
    checkpointMap,
    walls,
    wallKeys,
    solution,
    ...meta,
  };
}

/**
 * Deterministically generate a daily puzzle for `dateStr` ("YYYY-MM-DD"),
 * rotating difficulty by weekday (Mon Easy -> Sun Expert).
 * @param {string} [dateStr]
 * @param {object} [options]
 */
export function generateDailyPuzzle(dateStr = getLocalDateString(), options = {}) {
  const difficulty = options.difficulty
    ? DIFFICULTIES[options.difficulty] || getDailyDifficulty(dateStr)
    : getDailyDifficulty(dateStr);

  return generatePuzzleBySeed(dateStr, difficulty.id, {
    id: dateStr,
    date: dateStr,
    puzzleNumber: getPuzzleNumber(dateStr),
    ...options,
  });
}

/**
 * Yield to the UI thread before generating heavy (e.g. Expert 8x8) puzzles.
 * @param {() => object} buildFn
 * @returns {Promise<object>}
 */
export function generatePuzzleAsync(buildFn) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(buildFn());
    }, 0);
  });
}
