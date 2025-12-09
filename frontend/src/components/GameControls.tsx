import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { LeaderboardModal } from "./LeaderboardModal";

export function GameControls() {
  const { isPlaying, isPaused, score, startGame, pauseGame, resumeGame, resetGame } =
    useGameStore();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
    <>
      <div className="game-controls">
        <div className="game-stats">
          <span>Score: {score}</span>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="btn btn-leaderboard-trigger"
          >
            View Leaderboard
          </button>
        </div>

        <div className="game-buttons">
          {!isPlaying ? (
            <button onClick={startGame} className="btn btn-start">
              Start Game
            </button>
          ) : (
            <>
              {isPaused ? (
                <button onClick={resumeGame} className="btn btn-resume">
                  Resume
                </button>
              ) : (
                <button onClick={pauseGame} className="btn btn-pause">
                  Pause
                </button>
              )}
              <button onClick={resetGame} className="btn btn-reset">
                Reset
              </button>
            </>
          )}
        </div>
      </div>
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </>
  );
}

