import "./App.css";
import { GameCanvas } from "./components/GameCanvas";
import { GameControls } from "./components/GameControls";
import { useGameStore, type GameStore } from "./store/gameStore";
import { LevelCompleteModal } from "./components/LevelCompleteModal";
import { QuestionModal } from "./components/QuestionModal";

function App() {
  const isPlaying = useGameStore((state: GameStore) => state.isPlaying);

  return (
    <div className="app">
      <header className="app-header">
        <h1>CapyMorph</h1>
      </header>

      <main className="game-container">
        <GameControls />
        <GameCanvas isPlaying={isPlaying} />
      </main>

      <LevelCompleteModal />
      <QuestionModal />

      <footer className="app-footer">
        <p>Use the arrow keys to help Morphy adventure through the maze, collecting food while rescuing baby Morphy!</p>
      </footer>
    </div>
  );
}

export default App;
