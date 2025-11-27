import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";

export class MainScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Rectangle | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private collectibles: Phaser.GameObjects.Group | null = null;

  constructor() {
    super({ key: "MainScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    // Create background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Create player
    this.player = this.add.rectangle(width / 2, height / 2, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setCollideWorldBounds(true);

    // Create collectibles group
    this.collectibles = this.add.group();
    this.spawnCollectibles();

    // Set up keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Create score text
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff",
    });

    // Set up collision detection
    if (this.player && this.collectibles) {
      this.physics.add.overlap(
        this.player,
        this.collectibles,
        this.collectItem as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
    }

    // Listen to game state changes
    this.updateGameState();
  }

  private spawnCollectibles(): void {
    const { width, height } = this.scale;

    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(50, height - 50);
      const collectible = this.add.circle(x, y, 15, 0xffff00);
      this.physics.add.existing(collectible);
      this.collectibles?.add(collectible);
    }
  }

  private collectItem(
    _player: Phaser.GameObjects.GameObject,
    collectible: Phaser.GameObjects.GameObject
  ): void {
    collectible.destroy();

    // Update Zustand store
    const { incrementScore } = useGameStore.getState();
    incrementScore(10);

    // Update local score display
    const { score } = useGameStore.getState();
    this.scoreText?.setText(`Score: ${score}`);

    // Spawn new collectible if all collected
    if (this.collectibles && this.collectibles.countActive() === 0) {
      const { incrementLevel } = useGameStore.getState();
      incrementLevel();
      this.spawnCollectibles();
    }
  }

  private updateGameState(): void {
    // Subscribe to game state changes
    const unsubscribe = useGameStore.subscribe((state) => {
      if (state.isPaused) {
        this.scene.pause();
      } else if (state.isPlaying) {
        this.scene.resume();
      }

      this.scoreText?.setText(`Score: ${state.score}`);
    });

    // Clean up on scene shutdown
    this.events.on("shutdown", () => {
      unsubscribe();
    });
  }

  update(): void {
    if (!this.player || !this.cursors) return;

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 200;

    // Handle movement
    if (this.cursors.left.isDown) {
      playerBody.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      playerBody.setVelocityX(speed);
    } else {
      playerBody.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
      playerBody.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      playerBody.setVelocityY(speed);
    } else {
      playerBody.setVelocityY(0);
    }
  }
}
