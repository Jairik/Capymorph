import "./App.css";
import { lazy, Suspense } from "react";
import { useGameStore, type GameStore } from "./store/gameStore";
import { LevelCompleteModal } from "./components/LevelCompleteModal";
import { QuestionModal } from "./components/QuestionModal";

// Lazy-loaded components (module scope)
const LazyGameControls = lazy(() => import("./components/GameControls"));
const LazyGameCanvas = lazy(() => import("./components/GameCanvas"));

function App() {
  const isPlaying = useGameStore((state: GameStore) => state.isPlaying);

  return (
    <div className="app">
      <header className="app-header">
        <h1>CapyMorph</h1>
      </header>

      <main className="game-container">
        <Suspense fallback={<div>Loading Controls...</div>}>
          <LazyGameControls />
        </Suspense>
        {/* Conditionally render GameCanvas only when playing */}
        {isPlaying && (
          <Suspense fallback={<div>Loading Game...</div>}>
            <LazyGameCanvas isPlaying={isPlaying} />
          </Suspense>
        )}
        
      </main>

      <LevelCompleteModal />
      <QuestionModal />

      <footer className="app-footer">
        <p>
          Use the arrow keys to help Morphy adventure through the maze,
          collecting food while rescuing baby Morphy!
        </p>
      </footer>
    </div>
  );
}

export default App;
