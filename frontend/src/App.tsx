import "./App.css";
import { GameCanvas } from "./components/GameCanvas";
import { GameControls } from "./components/GameControls";
import { useGameStore, type GameStore } from "./store/gameStore";

function App() {
  const isPlaying = useGameStore((state: GameStore) => state.isPlaying);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Capymorph</h1>
      </header>

      <main className="game-container">
        <GameControls />
        <GameCanvas isPlaying={isPlaying} />
      </main>

      <footer className="app-footer">
        <p>Use arrow keys to adventure through the maze to rescue Morphy's kid!</p>
      </footer>
    </div>
  );
}

export default App;
