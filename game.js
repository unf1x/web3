(function () {
  const SIZE = 4;
  const CELL_GAP = 10;

  let grid = [];
  let tiles = [];
  let nextTileId = 1;
  let tileSize = 0;
  let score = 0;
  let gameOver = false;
  let lastState = null;
  let scoreSavedForThisGame = false;
  let isLeaderboardOpen = false;


  const tilesLayer = document.getElementById("tiles-layer");
  const gridBackground = document.getElementById("grid-background");
  const scoreElement = document.getElementById("score");
  const bestScoreElement = document.getElementById("best-score");
  const undoBtn = document.getElementById("undo-btn");
  const touchControls = document.getElementById("touch-controls");
  const gameOverOverlay = document.getElementById("game-over-overlay");
  const gameOverMessage = document.getElementById("game-over-message");
  const saveRecordBlock = document.getElementById("save-record-block");
  const saveResultMessage = document.getElementById("save-result-message");
  const playerNameInput = document.getElementById("player-name");
  const leaderboardModal = document.getElementById("leaderboard-modal");
  const leaderboardBody = document.getElementById("leaderboard-body");

  const tileElements = new Map();
  let leaderboard = [];

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


  function updateScoreDisplay() {
    scoreElement.textContent = score;
  }

  function enableUndoButton(enable) {
    undoBtn.disabled = !enable;
  }

  function enableTouchControls(active) {
    if (!touchControls) return;
    if (active && window.innerWidth <= 768 && !gameOver && !isLeaderboardOpen) {
      touchControls.classList.remove("hidden");
    } else {
      touchControls.classList.add("hidden");
    }
  }

  function isGameActive() {
    return !gameOver && !isLeaderboardOpen;
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

  function moveGrid(direction) {
    let moved = false;
    let gained = 0;

    for (const tile of tiles) {
      tile.justMerged = false;
      tile.isNew = false;
      tile.toBeRemoved = false;
    }

    function compressTilesLine(lineTiles) {
      let merged = false;
      let gainedLocal = 0;
      let working = lineTiles.slice();

      while (true) {
        const newLine = [];
        let mergedInThisPass = false;
        for (let i = 0; i < working.length; ) {
          const current = working[i];
          if (i + 1 < working.length && working[i + 1].value === current.value) {
            const next = working[i + 1];
            const newValue = current.value + next.value;
            current.value = newValue;
            current.justMerged = true;
            next.toBeRemoved = true;
            newLine.push(current);
            gainedLocal += newValue;
            mergedInThisPass = true;
            merged = true;
            i += 2;
          } else {
            newLine.push(current);
            i++;
          }
        }
        working = newLine;
        if (!mergedInThisPass) break;
      }
      return { line: working, merged, gained: gainedLocal };
    }

    if (direction === "left" || direction === "right") {
      for (let r = 0; r < SIZE; r++) {
        const line = [];
        if (direction === "left") {
          for (let c = 0; c < SIZE; c++) {
            if (grid[r][c]) line.push(grid[r][c]);
          }
        } else {
          for (let c = SIZE - 1; c >= 0; c--) {
            if (grid[r][c]) line.push(grid[r][c]);
          }
        }
        if (line.length === 0) continue;

        const { line: newLine, merged, gained: gainedLocal } =
          compressTilesLine(line);
        gained += gainedLocal;

        for (let c = 0; c < SIZE; c++) grid[r][c] = null;

        for (let i = 0; i < newLine.length; i++) {
          const targetCol = direction === "left" ? i : SIZE - 1 - i;
          const tile = newLine[i];
          if (tile.row !== r || tile.col !== targetCol) moved = true;
          tile.row = r;
          tile.col = targetCol;
          grid[r][targetCol] = tile;
        }

        if (merged) moved = true;
      }
    } else if (direction === "up" || direction === "down") {
      for (let c = 0; c < SIZE; c++) {
        const line = [];
        if (direction === "up") {
          for (let r = 0; r < SIZE; r++) {
            if (grid[r][c]) line.push(grid[r][c]);
          }
        } else {
          for (let r = SIZE - 1; r >= 0; r--) {
            if (grid[r][c]) line.push(grid[r][c]);
          }
        }
        if (line.length === 0) continue;

        const { line: newLine, merged, gained: gainedLocal } =
          compressTilesLine(line);
        gained += gainedLocal;

        for (let r = 0; r < SIZE; r++) grid[r][c] = null;

        for (let i = 0; i < newLine.length; i++) {
          const targetRow = direction === "up" ? i : SIZE - 1 - i;
          const tile = newLine[i];
          if (tile.row !== targetRow || tile.col !== c) moved = true;
          tile.row = targetRow;
          tile.col = c;
          grid[targetRow][c] = tile;
        }

        if (merged) moved = true;
      }
    }

    if (tiles.some((t) => t.toBeRemoved)) moved = true;
    tiles = tiles.filter((t) => !t.toBeRemoved);

    return { moved, gained };
  }

  function hasAvailableMoves() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const tile = grid[r][c];
        if (!tile) return true;
        if (r + 1 < SIZE && grid[r + 1][c] && grid[r + 1][c].value === tile.value)
          return true;
        if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c + 1].value === tile.value)
          return true;
      }
    }
    return false;
  }

  function showGameOverOverlay() {
    gameOverOverlay.classList.remove("hidden");
    gameOverMessage.textContent =
      "Игра окончена! Нет доступных ходов. Введите имя и сохраните результат.";
    saveRecordBlock.classList.remove("hidden");
    saveResultMessage.classList.add("hidden");
    playerNameInput.value = "";
  }

  function hideGameOverOverlay() {
    gameOverOverlay.classList.add("hidden");
  }

  function checkGameOver() {
    if (!hasAvailableMoves()) {
      gameOver = true;
      showGameOverOverlay();
      enableTouchControls(false);
      enableUndoButton(false);
      return true;
    }
    return false;
  }

  function handleMove(direction) {
    if (!isGameActive()) return;

    const prevGrid = serializeGridValues();
    const prevScore = score;

    const { moved, gained } = moveGrid(direction);
    if (!moved) return;

    lastState = { grid: prevGrid, score: prevScore };
    enableUndoButton(true);

    score += gained;
    updateScoreDisplay();

    const emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const tilesToAdd =
        emptyCells.length === 1 ? 1 : 1 + Math.floor(Math.random() * 2);
      const count = Math.min(tilesToAdd, emptyCells.length);
      for (let i = 0; i < count; i++) addRandomTile();
    }

    renderTiles();
    checkGameOver();
  }

  function serializeGridValues() {
    const values = [];
    for (let r = 0; r < SIZE; r++) {
      const row = [];
      for (let c = 0; c < SIZE; c++) {
        row.push(grid[r][c] ? grid[r][c].value : 0);
      }
      values.push(row);
    }
    return values;
  }

  function startNewGame() {
    grid = createEmptyGrid();
    tiles = [];
    tileElements.clear();
    tilesLayer.innerHTML = "";
    nextTileId = 1;
    score = 0;
    gameOver = false;
    lastState = null;
    scoreSavedForThisGame = false;
    updateScoreDisplay();
    enableUndoButton(false);
    hideGameOverOverlay();

    const startTilesCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < startTilesCount; i++) addRandomTile();

    renderTiles();
    enableTouchControls(true);
  }

  function setupEventListeners() {
    const newGameBtn = document.getElementById("new-game-btn");
    const restartBtn = document.getElementById("restart-btn");

    if (newGameBtn) newGameBtn.addEventListener("click", () => startNewGame(false));
    if (restartBtn) restartBtn.addEventListener("click", () => startNewGame(false));

    undoBtn.addEventListener("click", () => {
      //TODO
    });

    document.addEventListener("keydown", (e) => {
      if (!isGameActive()) return;
      let dir = null;
      switch (e.key) {
        case "ArrowUp":
          dir = "up";
          break;
        case "ArrowDown":
          dir = "down";
          break;
        case "ArrowLeft":
          dir = "left";
          break;
        case "ArrowRight":
          dir = "right";
          break;
        default:
          return;
      }
      e.preventDefault();
      handleMove(dir);
    });

    window.addEventListener("resize", () => {
      renderTiles();
      enableTouchControls(!gameOver && !isLeaderboardOpen);
    });

    document
      .querySelectorAll("#touch-controls button")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          const dir = btn.getAttribute("data-dir");
          handleMove(dir);
        });
      });
  }

  createGridBackground();
  setupEventListeners();
  startNewGame();
})();
