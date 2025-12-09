import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "../game/config";

interface GameCanvasProps {
  isPlaying: boolean;
}

export function GameCanvas({ isPlaying }: GameCanvasProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    // Create game instance only when playing
    if (isPlaying) {
      const config = createGameConfig(containerRef.current);
      gameRef.current = new Phaser.Game(config);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        width: "calc(100% - 40px)",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        borderRadius: "12px",
        border: "2px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
        pointerEvents: "auto",
      }}
    />
  );
}
