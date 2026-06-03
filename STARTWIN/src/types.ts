/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GridSize = 3 | 4 | 5;

export interface Position {
  r: number;
  c: number;
}

export type GameMode = 'practice' | 'challenge';

export interface GameCell {
  r: number;
  c: number;
  regionId: number; // 0 to n-1
  isCorrect: boolean; // User marked it as a star
  isWrong: boolean; // Briefly show error feedback
}

export interface Puzzle {
  id: string;
  size: GridSize;
  grid: GameCell[][];
  solutions: Position[];
}

export const MARKS = ['🌵', '🧡', '💛', '💚', '💙', '💜'];
export const FIELDS = ['🩷', '🟧', '🟨', '🟩', '🟦', '🟪'];
export const COLORS = [
  'bg-pink-500',
  'bg-orange-500',
  'bg-yellow-400',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
];

export const HOVER_COLORS = [
  'hover:bg-pink-600',
  'hover:bg-orange-600',
  'hover:bg-yellow-500',
  'hover:bg-emerald-600',
  'hover:bg-sky-600',
  'hover:bg-violet-600',
];
