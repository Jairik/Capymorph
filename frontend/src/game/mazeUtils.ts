export function generateMazeEller(width: number, height: number): number[][] {
  // Ensure dimensions are odd for the wall/path representation
  const rows = height % 2 === 0 ? height + 1 : height;
  const cols = width % 2 === 0 ? width + 1 : width;

  const maze: number[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(1)); // Initialize with walls (1)

  const logicalCols = Math.floor((cols - 1) / 2);
  const logicalRows = Math.floor((rows - 1) / 2);

  let currentRow = Array(logicalCols).fill(0).map((_, i) => i + 1);
  let nextSetId = logicalCols + 1;

  for (let r = 0; r < logicalRows; r++) {
    // 1. Initialize current row (already done for first row, handled in loop for others)
    
    // Map logical row to grid
    const gridRow = r * 2 + 1;

    // 2. Randomly join adjacent cells
    for (let c = 0; c < logicalCols - 1; c++) {
      const gridCol = c * 2 + 1;
      
      // Carve the cell itself
      maze[gridRow][gridCol] = 0;

      // Decide whether to join right
      const shouldJoin = Math.random() > 0.5;
      if (shouldJoin || currentRow[c] !== currentRow[c + 1]) {
        if (currentRow[c] !== currentRow[c + 1] && shouldJoin) {
            // Merge sets
            const setKeep = currentRow[c];
            const setReplace = currentRow[c + 1];
            for (let k = 0; k < logicalCols; k++) {
                if (currentRow[k] === setReplace) {
                    currentRow[k] = setKeep;
                }
            }
            // Carve wall to the right
            maze[gridRow][gridCol + 1] = 0;
        }
      }
    }
    // Carve the last cell in the row
    maze[gridRow][(logicalCols - 1) * 2 + 1] = 0;

    // 3. Vertical connections
    // For each set, at least one cell must go down
    const nextRow = Array(logicalCols).fill(0);
    const sets = new Set(currentRow);
    
    sets.forEach(setId => {
        const indices = currentRow
            .map((id, index) => id === setId ? index : -1)
            .filter(index => index !== -1);
        
        // Shuffle indices to pick random ones to go down
        // Ensure at least one goes down
        let hasGoneDown = false;
        indices.forEach(index => {
            const shouldGoDown = Math.random() > 0.5;
            // If it's the last one and none have gone down, force it
            if (shouldGoDown || (!hasGoneDown && index === indices[indices.length - 1])) {
                // Carve down
                const gridCol = index * 2 + 1;
                maze[gridRow + 1][gridCol] = 0;
                
                // Carry set ID to next row
                nextRow[index] = currentRow[index];
                hasGoneDown = true;
            }
        });
    });

    // 4. Prepare next row
    if (r < logicalRows - 1) {
        currentRow = nextRow.map((id) => {
            if (id === 0) {
                return nextSetId++;
            }
            return id;
        });
    } else {
        // Last row logic: join all disjoint sets
        for (let c = 0; c < logicalCols - 1; c++) {
            const gridCol = c * 2 + 1;
            if (currentRow[c] !== currentRow[c + 1]) {
                // Carve wall to the right
                maze[gridRow][gridCol + 1] = 0;
                
                // Merge sets (though not strictly needed for logic anymore)
                const setKeep = currentRow[c];
                const setReplace = currentRow[c + 1];
                for (let k = 0; k < logicalCols; k++) {
                    if (currentRow[k] === setReplace) {
                        currentRow[k] = setKeep;
                    }
                }
            }
        }
    }
  }

  // Enforce solid borders, leaving only start (bottom) and exit (top) openings
  for (let x = 0; x < cols; x++) {
    maze[0][x] = 1;
    maze[rows - 1][x] = 1;
  }
  for (let y = 0; y < rows; y++) {
    maze[y][0] = 1;
    maze[y][cols - 1] = 1;
  }

  const pickOddColumn = (col: number) => {
    const clamped = Math.max(1, Math.min(col, cols - 2));
    return clamped % 2 === 0 ? clamped - 1 : clamped;
  };

  const exitX = pickOddColumn(Math.floor(cols / 2));
  const startX = exitX; // align start with exit column for straighter path options

  // Carve openings and ensure they connect to the maze interior
  maze[0][exitX] = 0;
  maze[1][exitX] = 0;
  maze[rows - 1][startX] = 0;
  maze[rows - 2][startX] = 0;

  return maze;
}

export interface Point {
  x: number;
  y: number;
}

export function findPath(
  maze: number[][],
  start: Point,
  end: Point
): Point[] {
  const rows = maze.length;
  const cols = maze[0].length;

  // Priority queue for A*
  const openSet: { pos: Point; f: number }[] = [];
  openSet.push({ pos: start, f: 0 });

  const cameFrom = new Map<string, Point>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();

  const posKey = (p: Point) => `${p.x},${p.y}`;

  gScore.set(posKey(start), 0);
  fScore.set(posKey(start), Math.abs(start.x - end.x) + Math.abs(start.y - end.y));

  while (openSet.length > 0) {
    // Get node with lowest fScore
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!.pos;

    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(posKey(curr))) {
        curr = cameFrom.get(posKey(curr))!;
        path.unshift(curr);
      }
      return path;
    }

    const neighbors = [
      { x: current.x, y: current.y - 1 },
      { x: current.x, y: current.y + 1 },
      { x: current.x - 1, y: current.y },
      { x: current.x + 1, y: current.y },
    ];

    for (const neighbor of neighbors) {
      // Check bounds and walls (0 is path, 1 is wall)
      if (
        neighbor.x >= 0 &&
        neighbor.x < cols &&
        neighbor.y >= 0 &&
        neighbor.y < rows &&
        maze[neighbor.y][neighbor.x] === 0
      ) {
        const tentativeGScore = (gScore.get(posKey(current)) ?? Infinity) + 1;

        if (tentativeGScore < (gScore.get(posKey(neighbor)) ?? Infinity)) {
          cameFrom.set(posKey(neighbor), current);
          gScore.set(posKey(neighbor), tentativeGScore);
          const h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
          const f = tentativeGScore + h;
          fScore.set(posKey(neighbor), f);

          if (!openSet.some((item) => item.pos.x === neighbor.x && item.pos.y === neighbor.y)) {
            openSet.push({ pos: neighbor, f });
          }
        }
      }
    }
  }

  return []; // No path found
}
