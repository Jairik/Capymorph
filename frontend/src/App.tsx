import "./App.css";
import { GameCanvas } from "./components/GameCanvas";
import { GameControls } from "./components/GameControls";
import { useGameStore } from "./store/gameStore";

function App() {
  const isPlaying = useGameStore((state) => state.isPlaying);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Capymorph</h1>
        <p>Educational game to teach language-learners about morphemes</p>
      </header>

      <main className="game-container">
        <GameControls />
        <GameCanvas isPlaying={isPlaying} />
      </main>

      <footer className="app-footer">
        <p>Use arrow keys to move the player and collect items!</p>
      </footer>
    </div>
  );
}

export default App;
