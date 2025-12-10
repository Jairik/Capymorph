import Phaser from "phaser";
import { useGameStore } from "../store/gameStore";
import { generateMazeEller } from "./mazeUtils";

// Import assets
import wallImg from "../assets/brick-wall-texture.jpg";
import floorImg from "../assets/pixel-grass-texture.jpg";
import cheetosImg from "../assets/cheetos-pixel-art-bad-lol.png";
import morphyImg from "../assets/Capybara-Spritesheet.png";
import babyMorphyImg from "../assets/Baby-Capybara-Spritesheet.png";

export class MainScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Rectangle | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private collectibles: Phaser.GameObjects.Group | null = null;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private door: Phaser.GameObjects.Rectangle | null = null;
  private currentLevel: number = 1;
  private readonly TILE_SIZE = 40;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    this.load.image("wall", wallImg);
    this.load.image("floor", floorImg);
    this.load.image("cheetos", cheetosImg);
    this.load.spritesheet("morphy", morphyImg, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("babyMorphy", babyMorphyImg, {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create(): void {
    // Generate tileset once
    this.generateTileset();

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

  private generateTileset(): void {
    if (this.textures.exists("tiles")) {
        return;
    }

    // Create a render texture
    const rt = this.make.renderTexture({ width: this.TILE_SIZE * 3, height: this.TILE_SIZE }, false);
    
    // Tile 0: Empty/Placeholder (Transparent)
    // No need to draw anything for transparent
    
    // Tile 1: Floor
    const floor = this.make.image({ key: "floor", add: false });
    floor.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    floor.setOrigin(0, 0);
    rt.draw(floor, this.TILE_SIZE, 0);
    
    // Tile 2: Wall
    const wall = this.make.image({ key: "wall", add: false });
    wall.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    wall.setOrigin(0, 0);
    rt.draw(wall, this.TILE_SIZE * 2, 0);

    // Save as texture
    rt.saveTexture("tiles");
    
    // Destroy the render texture object
    rt.destroy();
  }

  private startLevel(): void {
    console.log("Starting Level...");
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
    if (this.door) {
      this.door.destroy();
      this.door = null;
    }
    if (this.collectibles) {
      this.collectibles.clear(true, true);
      this.collectibles.destroy();
      this.collectibles = null;
    }

    const canvasWidth = this.scale.width;
    if (canvasWidth === 0) {
        console.log("Canvas width is 0, retrying in 100ms...");
        this.time.delayedCall(100, () => this.startLevel());
        return;
    }

    // Calculate dimensions
    let mazeWidth = Math.floor(canvasWidth / this.TILE_SIZE);
    // Ensure width is odd for maze generation
    if (mazeWidth % 2 === 0) mazeWidth -= 1;
    // Minimum width
    if (mazeWidth < 5) mazeWidth = 5;
    
    const height = Math.floor(20 * Math.pow(1.25, level - 1));

    // Calculate zoom to fit width exactly
    const totalMazeWidthPixels = mazeWidth * this.TILE_SIZE;
    const zoom = canvasWidth / totalMazeWidthPixels;
    
    console.log(`Level ${level}: Canvas=${canvasWidth}, MazeWidth=${mazeWidth}, Zoom=${zoom}`);

    this.cameras.main.setZoom(zoom);
    
    // Adjust score text to counter zoom
    if (this.scoreText) {
        this.scoreText.setScale(1 / zoom);
        this.scoreText.setPosition(16 / zoom, 16 / zoom);
    }

    // Generate Maze
    // 0 = Path, 1 = Wall
    const rawMazeData = generateMazeEller(mazeWidth, height);
    
    // Map to tileset indices:
    // 0 (Path) -> 1 (Green Tile)
    // 1 (Wall) -> 2 (Gray Tile)
    const mazeData = rawMazeData.map(row => row.map(cell => cell === 0 ? 1 : 2));

    // Create Tilemap
    this.map = this.make.tilemap({
      data: mazeData,
      tileWidth: this.TILE_SIZE,
      tileHeight: this.TILE_SIZE,
    });

    const tileset = this.map.addTilesetImage("generated-tiles", "tiles", this.TILE_SIZE, this.TILE_SIZE);
    
    if (tileset) {
        this.layer = this.map.createLayer(0, tileset, 0, 0);
        if (this.layer) {
            this.layer.setCollision(2); // Collide with walls (index 2)
        } else {
            console.error("Could not create layer");
        }
    } else {
        console.error("Could not add tileset image");
    }

    // Set world bounds
    const actualHeight = mazeData.length;
    const actualWidth = mazeData[0].length;
    
    this.physics.world.setBounds(0, 0, actualWidth * this.TILE_SIZE, actualHeight * this.TILE_SIZE);
    this.cameras.main.setBounds(0, 0, actualWidth * this.TILE_SIZE, actualHeight * this.TILE_SIZE);

    // Find empty spots
    const emptySpots: { x: number; y: number }[] = [];
    for (let y = 0; y < actualHeight; y++) {
      for (let x = 0; x < actualWidth; x++) {
        if (mazeData[y][x] === 1) { // 1 is Path (Green)
          emptySpots.push({ x, y });
        }
      }
    }

    if (emptySpots.length === 0) {
        console.error("No empty spots found in maze!");
        return;
    }

    // Sort spots by Y coordinate
    // Top spots (low Y) for Door
    // Bottom spots (high Y) for Player
    emptySpots.sort((a, b) => a.y - b.y);

    // Place Door at the top (first available spot)
    const doorPos = emptySpots[0]; // Top-most spot
    
    const objectSize = this.TILE_SIZE * 0.75;

    this.door = this.add.rectangle(
        doorPos.x * this.TILE_SIZE + this.TILE_SIZE / 2,
        doorPos.y * this.TILE_SIZE + this.TILE_SIZE / 2,
        objectSize,
        objectSize,
        0xff0000 // Red
    );
    this.physics.add.existing(this.door);
    
    // Place Player at the bottom (last available spot)
    const playerPos = emptySpots[emptySpots.length - 1]; // Bottom-most spot
    
    this.player = this.add.rectangle(
        playerPos.x * this.TILE_SIZE + this.TILE_SIZE / 2,
        playerPos.y * this.TILE_SIZE + this.TILE_SIZE / 2,
        objectSize,
        objectSize,
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

    // Add overlap with Door
    if (this.player && this.door) {
        this.physics.add.overlap(
            this.player,
            this.door,
            this.reachDoor as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );
    }

    // Place Collectibles (randomly in remaining spots)
    this.collectibles = this.add.group();
    
    // Filter out used spots (roughly)
    const availableSpots = emptySpots.slice(5, emptySpots.length - 5); // Avoid very top and very bottom
    Phaser.Utils.Array.Shuffle(availableSpots);

    const itemCount = 5 + Math.floor(level * 1.5);
    
    for (let i = 0; i < itemCount; i++) {
      if (availableSpots.length === 0) break;
      const spot = availableSpots.pop();
      if (spot) {
        const type = Math.random() > 0.5 ? 2 : 3; // 2: Cheetos, 3: Rectangle
        
        let item: Phaser.GameObjects.GameObject;
        const collectibleSize = this.TILE_SIZE * 0.5;
        if (type === 2) {
            // Cheetos
            const sprite = this.add.image(
                spot.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                spot.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                "cheetos"
            );
            // Make cheetos significantly bigger
            sprite.setDisplaySize(this.TILE_SIZE * 0.9, this.TILE_SIZE * 0.9);
            sprite.setData("type", "cheetos");
            item = sprite;
        } else {
            // Rectangle
            item = this.add.rectangle(
                spot.x * this.TILE_SIZE + this.TILE_SIZE / 2,
                spot.y * this.TILE_SIZE + this.TILE_SIZE / 2,
                collectibleSize,
                collectibleSize,
                0x0000ff // Blue
            );
            item.setData("type", "rectangle");
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

  private reachDoor(
      _player: Phaser.GameObjects.GameObject,
      _door: Phaser.GameObjects.GameObject
  ): void {
      const { completeLevel } = useGameStore.getState();
      completeLevel();
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
  }

  private updateGameState(): void {
    // Subscribe to game state changes
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (!this.scene || !this.sys) return;

      // Only toggle pause/resume if the state actually changed
      if (state.isPaused !== prevState.isPaused) {
        if (state.isPaused) {
          this.scene.pause();
        } else {
          this.scene.resume();
        }
      }
      
      // Check for level reset (e.g. if user clicked Reset)
      if (state.level === 1 && state.score === 0 && this.currentLevel !== 1) {
          this.startLevel();
      }
      
      // Check for next level trigger (when level increments in store)
      if (state.level > this.currentLevel) {
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
