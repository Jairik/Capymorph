import { useEffect, useState } from "react";
import "../App.css";

interface LeaderboardEntry {
  name: string;
  score: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // TODO: Replace with actual endpoint fetch
      // fetch('/api/leaderboard')
      //   .then(res => res.json())
      //   .then(data => setLeaderboard(data))
      //   .finally(() => setLoading(false));
      
      // Mock data for now
      setTimeout(() => {
        setLeaderboard([
          { name: "Player 1", score: 1000 },
          { name: "Player 2", score: 800 },
          { name: "Player 3", score: 600 },
        ]);
        setLoading(false);
      }, 500);
    }
  }, [isOpen]);

  const handleSaveScore = () => {
    if (!playerName.trim()) return;
    
    // TODO: Replace with actual save endpoint (POST Request, return top 10 scores and current score's ranking)
    console.log("Saving score for:", playerName);
    
    // Mock adding to list
    setLeaderboard(prev => [
      { name: playerName, score: 0 }, // Score would come from game store ideally
      ...prev
    ].sort((a, b) => b.score - a.score));
    
    setPlayerName("");
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Leaderboard</h2>
          <button onClick={onClose} className="btn-close">
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="save-score-section">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="player-name-input"
            />
            <button onClick={handleSaveScore} className="btn btn-save-score">
              Save Score
            </button>
          </div>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{entry.name}</td>
                    <td>{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-modal-close">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
