/* Helper function to generate a maze using Eller's algorithm */

/** Eller's Algorithm Maze Generator
 * width, height -> MUST be odd.
 * Output tiles:
 *   1 = wall
 *   0 = floor
 *   2 = food
 *   3 = babyMorphy
 */
export function generateMazeEller(
  width: number,  // Odd width of maze
  height: number,  // Odd height of maze
  foodProbability = 0.05  // Food on about 5% of floor tiles
): number[][] {
  if (width % 2 === 0 || height % 2 === 0) {
    throw new Error("Width and height must be odd numbers for proper maze structure.");
  }

  // --- Initialize all walls
  const maze = Array.from({ length: height }, () => Array(width).fill(1));

  let sets: number[] = [];
  let nextSetId = 1;

  function placeFoodIfEligible(y: number, x: number) {
    if (Math.random() < foodProbability) {
      maze[y][x] = 2;
    }
  }

  // --- Eller's Algorithm row-by-row ---
  for (let y = 1; y < height; y += 2) {
    // Assign sets
    sets = sets.map(v => (v === undefined ? 0 : v));
    for (let x = 1; x < width; x += 2) {
      if (!sets[x]) sets[x] = nextSetId++;

      maze[y][x] = 0;
      placeFoodIfEligible(y, x);
    }

    // Last row: only merge horizontally then stop
    if (y >= height - 2) {
      for (let x = 1; x < width - 2; x += 2) {
        if (sets[x] !== sets[x + 2]) {
          maze[y][x + 1] = 0;
          placeFoodIfEligible(y, x + 1);

          const oldSet = sets[x + 2];
          const newSet = sets[x];
          sets = sets.map(s => (s === oldSet ? newSet : s));
        }
      }
      break;
    }

    // Horizontal merges
    for (let x = 1; x < width - 2; x += 2) {
      if (Math.random() < 0.5) continue;

      if (sets[x] !== sets[x + 2]) {
        maze[y][x + 1] = 0;
        placeFoodIfEligible(y, x + 1);

        const oldSet = sets[x + 2];
        const newSet = sets[x];
        sets = sets.map(s => (s === oldSet ? newSet : s));
      }
    }

    // Vertical connections
    const verticalConnections: Record<number, number[]> = {};
    for (let x = 1; x < width; x += 2) {
      const s = sets[x];
      if (!verticalConnections[s]) verticalConnections[s] = [];
      verticalConnections[s].push(x);
    }

    const newSets = new Array(width).fill(0);

    for (const setId in verticalConnections) {
      const cells = verticalConnections[setId];

      const numDowns = Math.max(1, Math.floor(Math.random() * cells.length));
      const shuffled = [...cells].sort(() => Math.random() - 0.5);
      const downs = shuffled.slice(0, numDowns);

      for (const x of downs) {
        maze[y + 1][x] = 0;
        maze[y + 2][x] = 0;
        placeFoodIfEligible(y + 2, x);
        newSets[x] = Number(setId);
      }
    }

    sets = newSets;
  }

  // Choose one food tile (2) near the bottom → make it 3 (babyMorphy)
  const candidateFood: { y: number; x: number }[] = [];

  // Search from the bottom quarter of the maze upward
  const startRow = Math.floor(height * 0.65);

  for (let y = startRow; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x] === 2) {
        candidateFood.push({ y, x });
      }
    }
  }

  // If at least one food tile exists, upgrade one to 3
  if (candidateFood.length > 0) {
    const choice = candidateFood[Math.floor(Math.random() * candidateFood.length)];
    maze[choice.y][choice.x] = 3;
  }

  return maze;
}