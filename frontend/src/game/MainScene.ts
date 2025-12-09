import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import { generateMazeEller } from "../utils/generateMaze";

export class MainScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Rectangle | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private collectibles: Phaser.GameObjects.Group | null = null;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private currentLevel: number = 1;

  constructor() {
    super({ key: "MainScene" });
  }

  create(): void {
    // Create tileset texture programmatically
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // Tile 0: Grass (Green) - actually we'll use index 1 for wall, 0 for floor in logic, 
    // but in Phaser Tilemap, 0 is usually empty/index.
    // Let's map: 0 -> Floor (Green), 1 -> Wall (Gray)
    
    // Draw Floor (Index 0)
    graphics.fillStyle(0x2e8b57); // SeaGreen
    graphics.fillRect(0, 0, 40, 40);
    
    // Draw Wall (Index 1)
    graphics.fillStyle(0x808080); // Gray
    graphics.fillRect(40, 0, 40, 40);

    graphics.generateTexture("tiles", 80, 40);

    // Set up keyboard input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    // Create score text (fixed to camera)
    this.scoreText = this.add.text(16, 16, "Score: 0", {
      fontSize: "24px",
      color: "#ffffff",
    }).setScrollFactor(0).setDepth(100);

    // Listen to game state changes
    this.updateGameState();

    // Start the first level
    this.startLevel();
  }

  private startLevel(): void {
    const { level } = useGameStore.getState();
    this.currentLevel = level;

    // Clean up previous level
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    if (this.collectibles) {
      this.collectibles.clear(true, true);
      this.collectibles.destroy();
      this.collectibles = null;
    }

    // Calculate dimensions
    const TILE_SIZE = 40;
    const width = 20; // Constant width
    const height = Math.floor(20 * Math.pow(1.25, level - 1));

    // Generate Maze
    const mazeData = generateMazeEller(width, height);

    // Create Tilemap
    this.map = this.make.tilemap({
      data: mazeData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = this.map.addTilesetImage("tiles", undefined, TILE_SIZE, TILE_SIZE);
    if (tileset) {
        this.layer = this.map.createLayer(0, tileset, 0, 0);
        if (this.layer) {
            this.layer.setCollision(1); // Collide with walls (index 1)
        }
    }

    // Set world bounds
    this.physics.world.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);
    this.cameras.main.setBounds(0, 0, width * TILE_SIZE, height * TILE_SIZE);

    // Find empty spots for player and items
    const emptySpots: { x: number; y: number }[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mazeData[y][x] === 0) {
          emptySpots.push({ x, y });
        }
      }
    }

    // Shuffle empty spots
    Phaser.Utils.Array.Shuffle(emptySpots);

    // Place Player
    const startPos = emptySpots.pop();
    if (startPos) {
      this.player = this.add.rectangle(
        startPos.x * TILE_SIZE + TILE_SIZE / 2,
        startPos.y * TILE_SIZE + TILE_SIZE / 2,
        30,
        30,
        0x00ff00
      );
      this.physics.add.existing(this.player);
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setCollideWorldBounds(true);
      
      // Camera follow
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

      // Add collision with walls
      if (this.layer) {
        this.physics.add.collider(this.player, this.layer);
      }
    }

    // Place Collectibles
    this.collectibles = this.add.group();
    
    // Place some Lettuce (2) and Rectangles (3)
    // Let's say 5 items per level for now
    const itemCount = 5 + Math.floor(level * 1.5);
    
    for (let i = 0; i < itemCount; i++) {
      if (emptySpots.length === 0) break;
      const spot = emptySpots.pop();
      if (spot) {
        const type = Math.random() > 0.5 ? 2 : 3; // 2: Lettuce, 3: Rectangle
        
        let item: Phaser.GameObjects.Shape;
        if (type === 2) {
            // Lettuce (Green Circle for now, maybe lighter green)
            item = this.add.circle(
                spot.x * TILE_SIZE + TILE_SIZE / 2,
                spot.y * TILE_SIZE + TILE_SIZE / 2,
                10,
                0x90ee90 // LightGreen
            );
            item.setData('type', 'lettuce');
        } else {
            // Rectangle (Blue for now)
            item = this.add.rectangle(
                spot.x * TILE_SIZE + TILE_SIZE / 2,
                spot.y * TILE_SIZE + TILE_SIZE / 2,
                20,
                20,
                0x0000ff // Blue
            );
            item.setData('type', 'rectangle');
        }
        
        this.physics.add.existing(item);
        this.collectibles.add(item);
      }
    }

    // Add overlap for collectibles
    if (this.player && this.collectibles) {
      this.physics.add.overlap(
        this.player,
        this.collectibles,
        this.collectItem as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
        undefined,
        this
      );
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

    // Check if level complete
    if (this.collectibles && this.collectibles.countActive() === 0) {
      const { incrementLevel } = useGameStore.getState();
      incrementLevel();
      // Level change will trigger updateGameState, but we need to detect it to restart level
      // Actually, updateGameState listens to store. 
      // But we can just call startLevel() here directly or let the subscription handle it?
      // The subscription handles pause/resume and score. It doesn't watch level changes explicitly in the current code.
      // Let's call startLevel() directly.
      this.startLevel();
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
      
      // Check for level reset (e.g. if user clicked Reset)
      if (state.level === 1 && state.score === 0 && this.currentLevel !== 1) {
          this.startLevel();
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

