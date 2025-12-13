import { useEffect, useState } from "react";
import "../App.css";
import { useGameStore } from "../store/gameStore";

interface LeaderboardEntry {
  username: string;
  score: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const currentScore = useGameStore((state) => state.score);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/leaderboards/10");
        if (!res.ok) throw new Error(`Failed to load leaderboards (${res.status})`);
        const data = (await res.json()) as LeaderboardEntry[];
        setLeaderboard(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboards");
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen]);

  const handleSaveScore = async () => {
    if (!playerName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/addScoreLeaderboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: playerName.trim(), score: currentScore }),
      });

      if (!res.ok) throw new Error(`Failed to save score (${res.status})`);

      // Refresh leaderboard after save
      const boardRes = await fetch("/api/leaderboards/10");
      if (!boardRes.ok) throw new Error(`Failed to reload leaderboards (${boardRes.status})`);
      const data = (await boardRes.json()) as LeaderboardEntry[];
      setLeaderboard(Array.isArray(data) ? data : []);

      setPlayerName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save score");
    } finally {
      setSaving(false);
    }
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
              {saving ? "Saving..." : "Save Score"}
            </button>
          </div>
          {error && <p className="modal-error">{error}</p>}
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
                    <td>{entry.username}</td>
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
