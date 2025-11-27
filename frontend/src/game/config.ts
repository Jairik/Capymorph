import Phaser from "phaser";
import { MainScene } from "./MainScene";

export const createGameConfig = (
  parent: string | HTMLElement
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  parent,
  width: 1200,
  height: 900,
  backgroundColor: "#1a1a2e",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [MainScene],
});
