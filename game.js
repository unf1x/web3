(function () {
  const SIZE = 4;
  const CELL_GAP = 10;

  let grid = [];
  let tiles = [];
  let nextTileId = 1;
  let tileSize = 0;

  const tilesLayer = document.getElementById("tiles-layer");
  const gridBackground = document.getElementById("grid-background");
  const scoreElement = document.getElementById("score");

  const tileElements = new Map();

  function createEmptyGrid() {
    const arr = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(null);
      }
      arr.push(row);
    }
    return arr;
  }

  function createGridBackground() {
    gridBackground.innerHTML = "";
    for (let i = 0; i < SIZE * SIZE; i++) {
      const cell = document.createElement("div");
      cell.classList.add("grid-cell");
      gridBackground.appendChild(cell);
    }
  }

  function recalcTileMetrics() {
    const width = tilesLayer.clientWidth;
    tileSize = (width - CELL_GAP * (SIZE + 1)) / SIZE;
  }

  function tilePosition(row, col) {
    if (!tileSize) {
      recalcTileMetrics();
    }
    const x = CELL_GAP + col * (tileSize + CELL_GAP);
    const y = CELL_GAP + row * (tileSize + CELL_GAP);
    return { x, y, size: tileSize };
  }
  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return;

    const { r, c } = randomChoice(emptyCells);
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = {
      id: nextTileId++,
      row: r,
      col: c,
      value,
      isNew: true,
      justMerged: false,
    };
    grid[r][c] = tile;
    tiles.push(tile);
  }

  function renderTiles() {
    recalcTileMetrics();

    const aliveIds = new Set(tiles.map((t) => t.id));
    for (const [id, el] of tileElements.entries()) {
      if (!aliveIds.has(id)) {
        if (el.parentNode === tilesLayer) {
          tilesLayer.removeChild(el);
        }
        tileElements.delete(id);
      }
    }

    for (const tile of tiles) {
      let el = tileElements.get(tile.id);
      if (!el) {
        el = document.createElement("div");
        el.classList.add("tile");
        tileElements.set(tile.id, el);
        tilesLayer.appendChild(el);
      }

      el.textContent = tile.value;
      let cls = "tile";
      if (tile.value <= 2048) {
        cls += " tile-" + tile.value;
      } else {
        cls += " tile-big";
      }
      el.className = cls;

      const pos = tilePosition(tile.row, tile.col);
      el.style.width = pos.size + "px";
      el.style.height = pos.size + "px";
      el.style.setProperty("--x", pos.x + "px");
      el.style.setProperty("--y", pos.y + "px");
    }
  }

  function startNewGame() {
    grid = createEmptyGrid();
    tiles = [];
    tileElements.clear();
    tilesLayer.innerHTML = "";
    nextTileId = 1;
    scoreElement.textContent = "0";

    const startTilesCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < startTilesCount; i++) {
      addRandomTile();
    }

    renderTiles();
  }

  function setupEventListeners() {
    const newGameBtn = document.getElementById("new-game-btn");
    const restartBtn = document.getElementById("restart-btn");

    if (newGameBtn) newGameBtn.addEventListener("click", startNewGame);
    if (restartBtn) restartBtn.addEventListener("click", startNewGame);

    window.addEventListener("resize", renderTiles);
  }

  createGridBackground();
  setupEventListeners();
  startNewGame();
})();
