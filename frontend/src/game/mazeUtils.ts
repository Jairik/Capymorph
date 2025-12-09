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

  return maze;
}
