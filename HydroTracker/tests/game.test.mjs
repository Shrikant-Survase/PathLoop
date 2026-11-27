import assert from 'node:assert/strict';
import test from 'node:test';

import { generateDailyPuzzle, generateHamiltonianPath } from '../src/game/generator.js';
import {
  createDateRng,
  getLocalDateString,
  getPuzzleNumber,
  hashString,
  mulberry32,
} from '../src/game/seed.js';
import {
  canStep,
  cellKey,
  getNextExpectedCheckpoint,
  hasWallBetween,
  isAdjacent,
  resolveDragStep,
  validatePath,
  wallKey,
} from '../src/game/validator.js';

test('seed: getLocalDateString formats YYYY-MM-DD', () => {
  const d = new Date(2026, 10, 5, 14, 30, 0); // Nov 5, 2026
  assert.equal(getLocalDateString(d), '2026-11-05');
});

test('seed: getPuzzleNumber increments by 1 per day', () => {
  assert.equal(getPuzzleNumber('2026-11-27'), 1);
  assert.equal(getPuzzleNumber('2026-11-28'), 2);
  assert.equal(getPuzzleNumber('2026-12-06'), 10);
});

test('seed: hashString and mulberry32 are deterministic', () => {
  const s1 = hashString('2026-11-27');
  const s2 = hashString('2026-11-27');
  const s3 = hashString('2026-11-28');
  assert.equal(s1, s2);
  assert.notEqual(s1, s3);

  const r1 = mulberry32(s1);
  const r2 = mulberry32(s1);
  const seq1 = [r1(), r1(), r1(), r1(), r1()];
  const seq2 = [r2(), r2(), r2(), r2(), r2()];
  assert.deepEqual(seq1, seq2);
  for (const v of seq1) {
    assert.ok(v >= 0 && v < 1);
  }

  const dRng1 = createDateRng('2026-11-27', 'daily');
  const dRng2 = createDateRng('2026-11-27', 'daily');
  assert.equal(dRng1(), dRng2());
});

test('validator: cellKey, wallKey, isAdjacent, hasWallBetween', () => {
  assert.equal(cellKey(2, 3), '2,3');
  assert.equal(wallKey({ row: 1, col: 2 }, { row: 1, col: 3 }), '1,2|1,3');
  assert.equal(
    wallKey({ row: 1, col: 3 }, { row: 1, col: 2 }),
    wallKey({ row: 1, col: 2 }, { row: 1, col: 3 })
  );

  assert.equal(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 }), true);
  assert.equal(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 0 }), true);
  assert.equal(isAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 }), false);
  assert.equal(isAdjacent({ row: 0, col: 0 }, { row: 0, col: 0 }), false);

  const mockPuzzle = {
    size: 2,
    wallKeys: ['0,0|0,1'],
  };
  assert.equal(hasWallBetween(mockPuzzle, { row: 0, col: 0 }, { row: 0, col: 1 }), true);
  assert.equal(hasWallBetween(mockPuzzle, { row: 0, col: 1 }, { row: 0, col: 0 }), true);
  assert.equal(hasWallBetween(mockPuzzle, { row: 0, col: 0 }, { row: 1, col: 0 }), false);
});

test('validator: canStep and validatePath enforce all game rules', () => {
  const puzzle = {
    size: 2,
    checkpoints: [
      { num: 1, row: 0, col: 0 },
      { num: 2, row: 1, col: 1 },
      { num: 3, row: 0, col: 1 },
    ],
    checkpointMap: {
      '0,0': 1,
      '1,1': 2,
      '0,1': 3,
    },
    wallKeys: ['0,0|0,1'],
  };

  // Must start at checkpoint 1
  assert.equal(canStep(puzzle, [], { row: 1, col: 0 }), false);
  assert.equal(canStep(puzzle, [], { row: 0, col: 0 }), true);

  let path = [{ row: 0, col: 0 }];
  assert.equal(getNextExpectedCheckpoint(puzzle, path), 2);

  // Blocked by wall to (0, 1) and out-of-order checkpoint 3
  assert.equal(canStep(puzzle, path, { row: 0, col: 1 }), false);
  // Diagonal blocked
  assert.equal(canStep(puzzle, path, { row: 1, col: 1 }), false);
  // Valid move to (1, 0)
  assert.equal(canStep(puzzle, path, { row: 1, col: 0 }), true);

  path = [...path, { row: 1, col: 0 }];
  // Cannot revisit
  assert.equal(canStep(puzzle, path, { row: 0, col: 0 }), false);
  // Step onto checkpoint 2
  assert.equal(canStep(puzzle, path, { row: 1, col: 1 }), true);
  path = [...path, { row: 1, col: 1 }];
  assert.equal(getNextExpectedCheckpoint(puzzle, path), 3);

  // Incomplete path does not win
  assert.equal(validatePath(puzzle, path).valid, false);

  // Final step onto checkpoint 3 completes puzzle
  assert.equal(canStep(puzzle, path, { row: 0, col: 1 }), true);
  path = [...path, { row: 0, col: 1 }];
  assert.equal(validatePath(puzzle, path).valid, true);
});

test('validator: cannot extend path past final checkpoint', () => {
  const puzzle = {
    size: 2,
    checkpoints: [
      { num: 1, row: 0, col: 0 },
      { num: 2, row: 1, col: 0 },
    ],
    checkpointMap: {
      '0,0': 1,
      '1,0': 2,
    },
    wallKeys: [],
  };
  const path = [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ];
  assert.equal(canStep(puzzle, path, { row: 1, col: 1 }), false);
  assert.equal(validatePath(puzzle, path).valid, false);
});

test('generator: daily puzzle is deterministic and solution always validates', () => {
  const p1 = generateDailyPuzzle('2026-11-27');
  const p2 = generateDailyPuzzle('2026-11-27');
  const pOther = generateDailyPuzzle('2026-11-28');

  assert.deepEqual(p1, p2);
  assert.notDeepEqual(p1.solution, pOther.solution);
  assert.equal(p1.size, 7); // 2026-11-27 is Friday (Hard)
  assert.equal(p1.solution.length, 49);
  assert.equal(p1.checkpoints[0].num, 1);
  assert.equal(p1.checkpoints[0].row, p1.solution[0].row);
  assert.equal(p1.checkpoints[0].col, p1.solution[0].col);

  const lastCp = p1.checkpoints[p1.checkpoints.length - 1];
  const lastCell = p1.solution[p1.solution.length - 1];
  assert.equal(lastCp.row, lastCell.row);
  assert.equal(lastCp.col, lastCell.col);

  assert.equal(validatePath(p1, p1.solution).valid, true);
});

test('generator: succeeds across 30 consecutive dates and sizes 5..8', () => {
  for (let day = 1; day <= 30; day += 1) {
    const dateStr = `2026-11-${String(day).padStart(2, '0')}`;
    const puzzle = generateDailyPuzzle(dateStr);
    const result = validatePath(puzzle, puzzle.solution);
    assert.equal(result.valid, true, `Failed for ${dateStr}: ${result.reason}`);
  }

  for (const size of [5, 6, 7, 8]) {
    const rng = createDateRng(`2026-11-27-${size}`);
    const path = generateHamiltonianPath(size, rng);
    assert.equal(path.length, size * size);
    const seen = new Set(path.map((c) => cellKey(c.row, c.col)));
    assert.equal(seen.size, size * size);
  }
});

test('validator: resolveDragStep handles backtracking, corner bridging, and wall blocks', () => {
  const puzzle = {
    size: 3,
    checkpoints: [
      { num: 1, row: 0, col: 0 },
      { num: 2, row: 2, col: 2 },
    ],
    checkpointMap: {
      '0,0': 1,
      '2,2': 2,
    },
    wallKeys: ['0,0|0,1'],
  };

  // Start on checkpoint 1
  const s0 = resolveDragStep(puzzle, [], { row: 0, col: 0 }, true);
  assert.deepEqual(s0.path, [{ row: 0, col: 0 }]);
  assert.equal(s0.action, 'advance');

  // Corner swipe from (0,0) -> (1,1): wall blocks (0,1), so it must bridge via (1,0)
  const s1 = resolveDragStep(puzzle, s0.path, { row: 1, col: 1 }, false);
  assert.deepEqual(s1.path, [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ]);
  assert.equal(s1.action, 'advance');

  // Dragging backward onto (1,0) erases (1,1)
  const s2 = resolveDragStep(puzzle, s1.path, { row: 1, col: 0 }, false);
  assert.deepEqual(s2.path, [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ]);
  assert.equal(s2.action, 'backtrack');

  // Touching checkpoint 1 on new gesture truncates back to checkpoint 1
  const s3 = resolveDragStep(puzzle, s1.path, { row: 0, col: 0 }, true);
  assert.deepEqual(s3.path, [{ row: 0, col: 0 }]);
  assert.equal(s3.action, 'backtrack');
});
