/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GridSize, Position, GameCell, Puzzle } from './types';

/**
 * 檢查在給定棋盤佈局（regionGrid）下，是否只有唯一的一組解。
 * 規則：每行 2 顆、每列 2 顆、每色 2 顆。
 */
function countSolutions(
  regionGrid: number[][],
  size: number,
  row: number = 0,
  col: number = 0,
  rowCounts: number[],
  colCounts: number[],
  regionCounts: number[],
  totalStars: number
): number {
  if (totalStars === size * 2) {
    return 1;
  }
  if (row === size) return 0;

  // 下一個座標
  let nextR = row;
  let nextC = col + 1;
  if (nextC === size) {
    nextR = row + 1;
    nextC = 0;
  }

  let count = 0;

  // 嘗試在 (row, col) 放置星星
  const regId = regionGrid[row][col];
  if (rowCounts[row] < 2 && colCounts[col] < 2 && regionCounts[regId] < 2) {
    rowCounts[row]++;
    colCounts[col]++;
    regionCounts[regId]++;
    count += countSolutions(regionGrid, size, nextR, nextC, rowCounts, colCounts, regionCounts, totalStars + 1);
    rowCounts[row]--;
    colCounts[col]--;
    regionCounts[regId]--;
    if (count > 1) return count; // 優化：超過 1 即可停止
  }

  // 嘗試不放置星星
  // 剩餘格子是否足夠填滿需要的星星數？ (總數 - 已過格子數 >= 剩下來需要的星星)
  const remainingCells = (size * size) - (row * size + col) - 1;
  const neededStars = (size * 2) - totalStars;
  if (remainingCells >= neededStars) {
    count += countSolutions(regionGrid, size, nextR, nextC, rowCounts, colCounts, regionCounts, totalStars);
  }

  return count;
}

/**
 * 生成符合「每行 2 每列 2」的點集
 */
function generateSkeleton(size: number): Position[] | null {
  const grid = Array.from({ length: size }, () => Array(size).fill(0));
  const stars: Position[] = [];
  const rowCounts = Array(size).fill(0);
  const colCounts = Array(size).fill(0);

  function backtrack(r: number, c: number): boolean {
    if (stars.length === size * 2) return true;
    if (r === size) return false;

    let nextR = r;
    let nextC = c + 1;
    if (nextC === size) {
      nextR = r + 1;
      nextC = 0;
    }

    // 嘗試放
    if (rowCounts[r] < 2 && colCounts[c] < 2) {
      rowCounts[r]++;
      colCounts[c]++;
      stars.push({ r, c });
      if (backtrack(nextR, nextC)) return true;
      stars.pop();
      rowCounts[r]--;
      colCounts[c]--;
    }

    // 嘗試不放
    const remaining = (size * size) - (r * size + c) - 1;
    if (remaining >= (size * 2) - stars.length) {
      if (backtrack(nextR, nextC)) return true;
    }

    return false;
  }

  // 為了隨機性，我們可以攪亂列的順序，或者在回溯時加入隨機
  // 這裡採用簡單的 DFS + 隨機起始點
  const cells: Position[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      cells.push({ r: i, c: j });
    }
  }
  
  // 隨機打亂格子順序來增加多樣性
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }

  function backtrackRandom(idx: number): boolean {
    if (stars.length === size * 2) {
      // 額外檢查：每行列是否剛好都是 2
      return rowCounts.every(v => v === 2) && colCounts.every(v => v === 2);
    }
    if (idx === cells.length) return false;

    const { r, c } = cells[idx];
    
    // 放
    if (rowCounts[r] < 2 && colCounts[c] < 2) {
      rowCounts[r]++;
      colCounts[c]++;
      stars.push({ r, c });
      if (backtrackRandom(idx + 1)) return true;
      stars.pop();
      rowCounts[r]--;
      colCounts[c]--;
    }

    // 不放
    if ((cells.length - idx - 1) >= (size * 2 - stars.length)) {
      if (backtrackRandom(idx + 1)) return true;
    }

    return false;
  }

  if (backtrackRandom(0)) return stars;
  return null;
}

export function generatePuzzle(size: GridSize): Puzzle {
  let attempts = 0;
  while (attempts < 500) {
    attempts++;
    const skeleton = generateSkeleton(size);
    if (!skeleton) continue;

    // 將 2N 個點分配給 N 個顏色模塊
    const shuffledSkeleton = [...skeleton].sort(() => Math.random() - 0.5);
    const regionGrid: number[][] = Array.from({ length: size }, () => Array(size).fill(-1));
    
    for (let i = 0; i < size; i++) {
      const p1 = shuffledSkeleton[i * 2];
      const p2 = shuffledSkeleton[i * 2 + 1];
      regionGrid[p1.r][p1.c] = i;
      regionGrid[p2.r][p2.c] = i;
    }

    // 擴張色塊
    const frontier: { r: number; c: number; regionId: number }[] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regionGrid[r][c] !== -1) {
          const neighbors = getNeighbors(r, c, size);
          for (const n of neighbors) {
            if (regionGrid[n.r][n.c] === -1) {
              frontier.push({ ...n, regionId: regionGrid[r][c] });
            }
          }
        }
      }
    }

    while (frontier.length > 0) {
      const idx = Math.floor(Math.random() * frontier.length);
      const { r, c, regionId } = frontier[idx];
      frontier.splice(idx, 1);

      if (regionGrid[r][c] !== -1) continue;
      regionGrid[r][c] = regionId;

      const neighbors = getNeighbors(r, c, size);
      for (const n of neighbors) {
        if (regionGrid[n.r][n.c] === -1) {
          frontier.push({ ...n, regionId });
        }
      }
    }

    // 檢查唯一解
    const solCount = countSolutions(
      regionGrid,
      size,
      0, 0,
      Array(size).fill(0),
      Array(size).fill(0),
      Array(size).fill(0),
      0
    );

    if (solCount === 1) {
      const grid: GameCell[][] = regionGrid.map((row, r) =>
        row.map((regionId, c) => ({
          r,
          c,
          regionId,
          isCorrect: false,
          isWrong: false,
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
