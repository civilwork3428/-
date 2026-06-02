/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GridSize, Position, GameCell, Puzzle } from './types';

// Check if a position (r, c) is valid given current marks
function isValid(r: number, c: number, marks: Position[], size: number): boolean {
  for (const m of marks) {
    if (m.r === r || m.c === c) return false;
    if (Math.abs(m.r - r) <= 1 && Math.abs(m.c - c) <= 1) return false;
  }
  return true;
}

// Find all valid skeletons of size n
function solveSkeletons(size: number, row: number = 0, currentMarks: Position[] = []): Position[][] {
  if (row === size) {
    return [([...currentMarks])];
  }

  const results: Position[][] = [];
  for (let c = 0; c < size; c++) {
    if (isValid(row, c, currentMarks, size)) {
      currentMarks.push({ r: row, c });
      results.push(...solveSkeletons(size, row + 1, currentMarks));
      currentMarks.pop();
    }
  }
  return results;
}

// Check if a candidate mark has exactly one in its region, row, col and none adjacent
function isFullSolutionValid(marks: Position[], grid: number[][], size: number): boolean {
  if (marks.length !== size) return false;
  
  const rows = new Set();
  const cols = new Set();
  const regions = new Set();
  
  for (let i = 0; i < marks.length; i++) {
    const { r, c } = marks[i];
    if (rows.has(r) || cols.has(c)) return false;
    rows.add(r);
    cols.add(c);
    
    const reg = grid[r][c];
    if (regions.has(reg)) return false;
    regions.add(reg);
    
    for (let j = i + 1; j < marks.length; j++) {
      if (Math.abs(marks[j].r - r) <= 1 && Math.abs(marks[j].c - c) <= 1) return false;
    }
  }
  
  return regions.size === size;
}

// Count solutions for uniqueness check
function countSolutions(grid: number[][], size: number, row: number = 0, currentMarks: Position[] = [], regionsUsed: Set<number> = new Set()): number {
  if (row === size) {
    return 1;
  }

  let count = 0;
  for (let c = 0; c < size; c++) {
    const regionId = grid[row][c];
    if (!regionsUsed.has(regionId) && isValid(row, c, currentMarks, size)) {
      currentMarks.push({ r: row, c });
      regionsUsed.add(regionId);
      count += countSolutions(grid, size, row + 1, currentMarks, regionsUsed);
      if (count > 1) return count; // Optimization: we only care if it's > 1
      regionsUsed.delete(regionId);
      currentMarks.pop();
    }
  }
  return count;
}

// Generate a valid puzzle
export function generatePuzzle(size: GridSize): Puzzle {
  const skeletons = solveSkeletons(size);
  let attempts = 0;
  
  while (attempts < 1000) {
    attempts++;
    const skeleton = skeletons[Math.floor(Math.random() * skeletons.length)];
    const regionGrid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
    
    // Assign each mark to its own region
    skeleton.forEach((p, i) => {
      regionGrid[p.r][p.c] = i;
    });

    // Expand regions randomly
    const frontier: { r: number; c: number; regionId: number }[] = [];
    skeleton.forEach((p, i) => {
      const neighbors = getNeighbors(p.r, p.c, size);
      neighbors.forEach(n => {
        if (regionGrid[n.r][n.c] === -1) {
          frontier.push({ ...n, regionId: i });
        }
      });
    });

    while (frontier.length > 0) {
      const idx = Math.floor(Math.random() * frontier.length);
      const { r, c, regionId } = frontier[idx];
      frontier.splice(idx, 1);

      if (regionGrid[r][c] !== -1) continue;

      regionGrid[r][c] = regionId;

      const neighbors = getNeighbors(r, c, size);
      neighbors.forEach(n => {
        if (regionGrid[n.r][n.c] === -1) {
          frontier.push({ ...n, regionId: regionId });
        }
      });
    }

    // Check uniqueness
    if (countSolutions(regionGrid, size) === 1) {
      const grid: GameCell[][] = regionGrid.map((row, r) =>
        row.map((regionId, c) => ({
          r,
          c,
          regionId,
          isCorrect: false,
          isCatching: false,
          isWrong: false,
          tried: false,
        }))
      );
      
      return {
        id: Math.random().toString(36).substring(2, 9),
        size,
        grid,
        solutions: skeleton,
      };
    }
  }

  // Fallback (should rarely happen with this algorithm)
  return generatePuzzle(size);
}

function getNeighbors(r: number, c: number, size: number): Position[] {
  const ds = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const res: Position[] = [];
  for (const [dr, dc] of ds) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
      res.push({ r: nr, c: nc });
    }
  }
  return res;
}
