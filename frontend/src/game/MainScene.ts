import Phaser from "phaser";
import { useGameStore, type QuestionType } from "../store/gameStore";
import { generateMazeEller, findPath } from "./mazeUtils";

// Import assets
import wallImg from "../assets/brick-wall-texture.jpg";
import floorImg from "../assets/pixel-grass-texture.jpg";
import cheetosImg from "../assets/cheetos-pixel-art-bad-lol.png";
import mountainDewImg from "../assets/mountaindew-pixel-art.png";
import morphyImg from "../assets/Capybara-Spritesheet.png";
import babyMorphyImg from "../assets/Baby-Capybara-Spritesheet.png";

export class MainScene extends Phaser.Scene {
  private player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private collectibles: Phaser.GameObjects.Group | null = null;
  private map: Phaser.Tilemaps.Tilemap | null = null;
  private layer: Phaser.Tilemaps.TilemapLayer | null = null;
  private door: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody | null = null;
  private currentLevel: number = 1;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private readonly TILE_SIZE = 40;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    this.load.image("wall", wallImg);
    this.load.image("floor", floorImg);
    this.load.image("cheetos", cheetosImg);
    this.load.image("mountainDew", mountainDewImg);
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

    this.createAnimations();

    this.createPauseOverlay();

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

    // Clear previous physics colliders/overlaps to avoid dangling refs to destroyed objects
    this.physics.world.colliders.destroy();

    // Re-enable and reset keyboard input so arrows work after modal interactions/scene pauses
    if (this.input.keyboard) {
      this.input.keyboard.enabled = true;
      this.input.keyboard.resetKeys();
      this.input.keyboard.clearCaptures();
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
      ]);
      this.cursors = this.input.keyboard.createCursorKeys();

      // Ensure canvas regains focus (retry a few times in case modal just unmounted)
      this.focusCanvasWithRetry();
    }

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
    let mazeWidth = Math.max(23, Math.floor(canvasWidth / this.TILE_SIZE));
    // Ensure width is odd for maze generation
    if (mazeWidth % 2 === 0) mazeWidth += 1;
    
    const height = Math.floor(20 * Math.pow(1.25, level - 1));

    // Calculate zoom to fit width, then nudge slightly larger for a closer view
    const totalMazeWidthPixels = mazeWidth * this.TILE_SIZE;
    const zoom = (canvasWidth / totalMazeWidthPixels) * 1.05;
    
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
    
    this.door = this.physics.add.sprite(
      doorPos.x * this.TILE_SIZE + this.TILE_SIZE / 2,
      doorPos.y * this.TILE_SIZE + this.TILE_SIZE / 2,
      "babyMorphy"
    );
    this.door.setDisplaySize(this.TILE_SIZE * 1.5, this.TILE_SIZE * 1.5);
    this.door.setFrame(this.getFrameIndex("babyMorphy", 0, 0));
    this.door.setImmovable(true);
    
    // Place Player at the bottom (last available spot)
    const playerPos = emptySpots[emptySpots.length - 1]; // Bottom-most spot
    
    this.player = this.physics.add.sprite(
      playerPos.x * this.TILE_SIZE + this.TILE_SIZE / 2,
      playerPos.y * this.TILE_SIZE + this.TILE_SIZE / 2,
      "morphy"
    );
    this.player.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
    this.player.setFrame(this.getFrameIndex("morphy", 4, 0));
    this.player.setCollideWorldBounds(true);
    
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

    // Place Collectibles (on the path to solution)
    this.collectibles = this.add.group();
    
    // Find path from player to door
    const path = findPath(rawMazeData, playerPos, doorPos);
    
    // Filter out start and end positions from potential collectible spots
    // Also remove some spots near start/end to avoid clutter
    const minDoorBuffer = 3;
    const farFromDoor = (p: { x: number; y: number }) => Math.abs(p.x - doorPos.x) + Math.abs(p.y - doorPos.y) > minDoorBuffer;

    const pathSpots = path.filter(p => 
      (p.x !== playerPos.x || p.y !== playerPos.y) && 
      (p.x !== doorPos.x || p.y !== doorPos.y) &&
      farFromDoor(p)
    );

    // If path is too short, fallback to random empty spots (unlikely)
    let availableSpots = pathSpots;
    if (availableSpots.length < 5) {
        availableSpots = emptySpots.filter(p => 
            (p.x !== playerPos.x || p.y !== playerPos.y) && 
        (p.x !== doorPos.x || p.y !== doorPos.y) &&
        farFromDoor(p)
        );
    }

    Phaser.Utils.Array.Shuffle(availableSpots);

    const itemCount = 1 + level;  // Set the total number of items based on level
    
    // Limit items to available spots
    const actualItemCount = Math.min(itemCount, availableSpots.length);
    const cheetoTargetCount = Math.ceil(actualItemCount * 0.6); // bias toward cheetos
    const minCheetoDistance = 12; // Manhattan distance to keep cheetos spread out

    const cheetoSpots: { x: number; y: number }[] = [];
    const remainingSpots: { x: number; y: number }[] = [];

    const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

    for (const spot of availableSpots) {
      if (
        cheetoSpots.length < cheetoTargetCount &&
        cheetoSpots.every((s) => manhattan(s, spot) >= minCheetoDistance)
      ) {
        cheetoSpots.push(spot);
      } else {
        remainingSpots.push(spot);
      }
    }

    // If we could not place enough spaced cheetos, backfill from remaining spots
    while (cheetoSpots.length < cheetoTargetCount && remainingSpots.length > 0) {
      cheetoSpots.push(remainingSpots.shift()!);
    }

    const allSpots = [...cheetoSpots, ...remainingSpots].slice(0, actualItemCount);

    for (let i = 0; i < allSpots.length; i++) {
      const spot = allSpots[i];
      if (!spot) continue;

      const useCheeto = i < cheetoSpots.length;
      let item: Phaser.GameObjects.GameObject;
      const collectibleSize = this.TILE_SIZE * 0.9;
      if (useCheeto) {
        const sprite = this.add.image(
          spot.x * this.TILE_SIZE + this.TILE_SIZE / 2,
          spot.y * this.TILE_SIZE + this.TILE_SIZE / 2,
          "cheetos"
        );
        sprite.setDisplaySize(this.TILE_SIZE * 0.9, this.TILE_SIZE * 0.9);
        sprite.setData("type", "cheetos");
        item = sprite;
      } else {
        const sprite = this.add.image(
          spot.x * this.TILE_SIZE + this.TILE_SIZE / 2,
          spot.y * this.TILE_SIZE + this.TILE_SIZE / 2,
          "mountainDew"
        );
        sprite.setDisplaySize(collectibleSize, collectibleSize);
        sprite.setData("type", "mountainDew");
        item = sprite;
      }

      this.physics.add.existing(item);
      this.collectibles.add(item);
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

  private focusCanvasWithRetry(): void {
    const canvas = this.game.canvas as HTMLCanvasElement | null;
    if (!canvas) return;

    if (!canvas.hasAttribute("tabindex")) {
      canvas.setAttribute("tabindex", "0");
    }

    const tryFocus = () => {
      canvas.focus();
    };

    // Try immediately and then a couple more times after short delays
    tryFocus();
    this.time.delayedCall(50, tryFocus);
    this.time.delayedCall(150, tryFocus);
  }

  private getFrameIndex(sheetKey: string, row: number, col: number): number {
    const texture = this.textures.get(sheetKey);
    const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const frameWidth = 32; // spritesheets are loaded with 32x32 frames
    const cols = Math.max(1, Math.floor(source.width / frameWidth));
    const frameTotal = texture.frameTotal;
    const idx = row * cols + col;
    return Math.min(Math.max(0, idx), frameTotal - 1);
  }

  private createAnimations(): void {
    const ensure = (
      key: string,
      sheetKey: string,
      row: number,
      frameRate: number = 8
    ) => {
      if (this.anims.exists(key)) return;
      const texture = this.textures.get(sheetKey);
      const source = texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const frameWidth = 32;
      const cols = Math.max(1, Math.floor(source.width / frameWidth));
      const start = row * cols;
      const frameTotal = texture.frameTotal;
      if (start >= frameTotal) return; // row outside sheet, skip
      const end = Math.min(start + cols - 1, frameTotal - 1);
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheetKey, { start, end }),
        frameRate,
        repeat: -1,
      });
    };

    ensure("morphy-forward", "morphy", 4, 10); // row 5 (1-based)
    ensure("morphy-backward", "morphy", 5, 10); // row 6 (1-based)
  }

  private reachDoor(
      _player: Phaser.GameObjects.GameObject,
      _door: Phaser.GameObjects.GameObject
  ): void {
      const { completeLevel } = useGameStore.getState();
      completeLevel();
  }

  private createPauseOverlay(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    const overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55);
    bg.setScrollFactor(0);

    const text = this.add.text(width / 2, height / 2, "Paused", {
      fontSize: "28px",
      color: "#ffb74d",
      fontStyle: "bold",
    }).setOrigin(0.5, 0.5);
    text.setScrollFactor(0);

    overlay.add([bg, text]);
    overlay.setDepth(2000);
    overlay.setVisible(false);

    this.pauseOverlay = overlay;
  }

  private setPauseOverlayVisible(show: boolean): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.setVisible(show);
    }
  }

  private collectItem(
    _player: Phaser.GameObjects.GameObject,
    collectible: Phaser.GameObjects.GameObject
  ): void {
    const questionType = collectible.getData("type") as QuestionType | undefined;
    collectible.destroy();

    // Update Zustand store
    const { incrementScore, openQuestionModal } = useGameStore.getState();
    incrementScore(10);
    if (questionType) {
      openQuestionModal(questionType);
    }

    // Update local score display
    const { score } = useGameStore.getState();
    this.scoreText?.setText(`Score: ${score}`);
  }

  private updateGameState(): void {
    // Subscribe to game state changes
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (!this.scene || !this.sys || !this.scene.manager) return;

      // Only toggle pause/resume if the state actually changed
      if (state.isPaused !== prevState.isPaused) {
        if (state.isPaused) {
          this.scene.pause();
          this.setPauseOverlayVisible(true);
        } else {
          this.scene.resume();
          this.focusCanvasWithRetry();
          this.setPauseOverlayVisible(false);
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

    // Freeze movement when the question modal is open
    const { isQuestionModalOpen } = useGameStore.getState();
    if (isQuestionModalOpen) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getFrameIndex("morphy", 4, 0));
      return;
    }

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const speed = 200;

    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx -= speed;
    if (this.cursors.right.isDown) vx += speed;
    if (this.cursors.up.isDown) vy -= speed;
    if (this.cursors.down.isDown) vy += speed;

    const moving = vx !== 0 || vy !== 0;

    playerBody.setVelocity(vx, vy);

    if (moving) {
      if (vx > 0) {
        this.player.setFlipX(false);
      } else if (vx < 0) {
        this.player.setFlipX(true);
      }
      this.player.anims.play("morphy-forward", true);
    } else {
      playerBody.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setFrame(this.getFrameIndex("morphy", 4, 0));
    }

    this.player.setRotation(0); // keep upright; rely on flipX for facing
  }
}
