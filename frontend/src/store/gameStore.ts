import { create } from "zustand";

export type QuestionType = "cheetos" | "mountainDew";

export interface GameState {
  score: number;
  level: number;
  isPlaying: boolean;
  isPaused: boolean;
  isLevelComplete: boolean;
  isQuestionModalOpen: boolean;
  currentQuestion: QuestionType | null;
  questionModalCount: number;
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
  openQuestionModal: (question: QuestionType) => void;
  closeQuestionModal: () => void;
}

export type GameStore = GameState & GameActions;

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  score: 0,
  level: 1,
  isPlaying: false,
  isPaused: false,
  isLevelComplete: false,
  isQuestionModalOpen: false,
  currentQuestion: null,
  questionModalCount: 0,

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
  openQuestionModal: (question) =>
    set((state) => ({
      isQuestionModalOpen: true,
      currentQuestion: question,
      questionModalCount: state.questionModalCount + 1,
    })),
  closeQuestionModal: () =>
    set({ isQuestionModalOpen: false, currentQuestion: null }),
}));
