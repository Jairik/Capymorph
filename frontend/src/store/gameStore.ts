import { create } from "zustand";

export interface GameState {
  score: number;
  level: number;
  isPlaying: boolean;
  isPaused: boolean;
  isLevelComplete: boolean;
}

interface GameActions {
  setScore: (score: number) => void;
  incrementScore: (points: number) => void;
  setLevel: (level: number) => void;
  incrementLevel: () => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  completeLevel: () => void;
  nextLevel: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  score: 0,
  level: 1,
  isPlaying: false,
  isPaused: false,
  isLevelComplete: false,

  // Actions
  setScore: (score) => set({ score }),
  incrementScore: (points) => set((state) => ({ score: state.score + points })),
  setLevel: (level) => set({ level }),
  incrementLevel: () => set((state) => ({ level: state.level + 1 })),
  startGame: () => set({ isPlaying: true, isPaused: false, score: 0, level: 1, isLevelComplete: false }),
  pauseGame: () => set({ isPaused: true }),
  resumeGame: () => set({ isPaused: false }),
  resetGame: () => set({ score: 0, level: 1, isPlaying: false, isPaused: false, isLevelComplete: false }),
  completeLevel: () => set({ isLevelComplete: true, isPaused: true }),
  nextLevel: () => set((state) => ({ level: state.level + 1, isLevelComplete: false, isPaused: false })),
}));
