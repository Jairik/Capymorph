import { useGameStore } from "../store/gameStore";
import "../App.css";

export function LevelCompleteModal() {
  const { isLevelComplete, level, score, nextLevel } = useGameStore();

  if (!isLevelComplete) return null;

  const handleNextLevel = () => {
    nextLevel();
    // Small timeout to ensure the modal is unmounted and focus can be returned to the game
    setTimeout(() => {
      const gameContainer = document.getElementById("game-container");
      if (gameContainer) {
        gameContainer.focus();
      } else {
        const canvas = document.querySelector("canvas");
        if (canvas) {
          canvas.focus();
        } else {
          window.focus();
        }
      }
    }, 100);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content level-complete-content">
        <div className="modal-header">
          <h2>Level Complete!</h2>
        </div>
        <div className="modal-body">
          <p className="level-complete-text">You finished Level {level}!</p>
          <p className="level-complete-score">Current Score: {score}</p>
        </div>
        <div className="modal-footer">
          <button onClick={handleNextLevel} className="btn btn-next-level">
            Next Level
          </button>
        </div>
      </div>
    </div>
  );
}
