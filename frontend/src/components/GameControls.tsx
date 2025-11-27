import { useGameStore } from "../store/gameStore";

export function GameControls() {
  const { isPlaying, isPaused, score, level, startGame, pauseGame, resumeGame, resetGame } =
    useGameStore();

  return (
    <div className="game-controls">
      <div className="game-stats">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
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
  );
}
