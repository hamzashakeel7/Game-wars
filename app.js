// Grid Wars - Pure JavaScript Game

// State
var gameState = "dashboard"; // 'dashboard' | 'game'
var mode = "select"; // 'select' | 'create' | 'join'
var playerName = "";
var gameCode = "";
var player1Name = "";
var player2Name = "";
var isHost = false;
var player1Score = 0;
var player2Score = 0;
var activeCell = null;
var gameStarted = false;
var lastWinner = null;
var countdown = null;
var roundActive = false;
var countdownTimer = null;

var WINNING_SCORE = 5;

// DOM Elements
var dashboard = document.getElementById("dashboard");
var gameScreen = document.getElementById("game-screen");
var modeSelect = document.getElementById("mode-select");
var modeCreate = document.getElementById("mode-create");
var modeJoin = document.getElementById("mode-join");
var playerNameInput = document.getElementById("player-name");
var btnCreate = document.getElementById("btn-create");
var btnJoin = document.getElementById("btn-join");
var btnCreateBack = document.getElementById("btn-create-back");
var btnStartGame = document.getElementById("btn-start-game");
var btnJoinBack = document.getElementById("btn-join-back");
var btnJoinGame = document.getElementById("btn-join-game");
var gameCodeInput = document.getElementById("game-code-input");
var createPlayerNameSpan = document.getElementById("create-player-name");
var joinPlayerNameSpan = document.getElementById("join-player-name");
var displayGameCode = document.getElementById("display-game-code");
var btnCopy = document.getElementById("btn-copy");
var iconCopy = document.getElementById("icon-copy");
var iconCheck = document.getElementById("icon-check");
var btnLeave = document.getElementById("btn-leave");
var player1NameEl = document.getElementById("player1-name");
var player2NameEl = document.getElementById("player2-name");
var player1ScoreEl = document.getElementById("player1-score");
var player2ScoreEl = document.getElementById("player2-score");
var player1Card = document.getElementById("player1-score-card");
var player2Card = document.getElementById("player2-score-card");
var player2Dot = document.getElementById("player2-dot");
var waitingMessage = document.getElementById("waiting-message");
var countdownOverlay = document.getElementById("countdown-overlay");
var countdownNumber = document.getElementById("countdown-number");
var gameOver = document.getElementById("game-over");
var winnerName = document.getElementById("winner-name");
var finalScore = document.getElementById("final-score");
var btnPlayAgain = document.getElementById("btn-play-again");
var gameGrid = document.getElementById("game-grid");
var btnStart = document.getElementById("btn-start");
var roundIndicator = document.getElementById("round-indicator");
var roundText = document.getElementById("round-text");
var toastContainer = document.getElementById("toast-container");

// Helper Functions
function generateGameCode() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var code = "";
  for (var i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function showToast(title, description) {
  var toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML =
    '<div class="toast-title">' +
    title +
    '</div><div class="toast-description">' +
    description +
    "</div>";
  toastContainer.appendChild(toast);

  setTimeout(function () {
    toast.style.opacity = "0";
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

function showScreen(screen) {
  dashboard.classList.add("hidden");
  gameScreen.classList.add("hidden");

  if (screen === "dashboard") {
    dashboard.classList.remove("hidden");
  } else if (screen === "game") {
    gameScreen.classList.remove("hidden");
  }
}

function showMode(newMode) {
  mode = newMode;
  modeSelect.classList.add("hidden");
  modeCreate.classList.add("hidden");
  modeJoin.classList.add("hidden");

  if (newMode === "select") {
    modeSelect.classList.remove("hidden");
  } else if (newMode === "create") {
    modeCreate.classList.remove("hidden");
    createPlayerNameSpan.textContent = playerName;
  } else if (newMode === "join") {
    modeJoin.classList.remove("hidden");
    joinPlayerNameSpan.textContent = playerName;
  }
}

function updatePlayerButtons() {
  var hasName = playerNameInput.value.trim().length > 0;
  btnCreate.disabled = !hasName;
  btnJoin.disabled = !hasName;
}

function updateJoinButton() {
  var codeLength = gameCodeInput.value.trim().length;
  btnJoinGame.disabled = codeLength < 4;
}

function createGrid() {
  gameGrid.innerHTML = "";
  for (var i = 0; i < 9; i++) {
    var cell = document.createElement("button");
    cell.className = "grid-cell";
    cell.dataset.index = i;
    cell.innerHTML = '<span class="cell-number">' + (i + 1) + "</span>";
    cell.addEventListener("click", function () {
      handleCellClick(parseInt(this.dataset.index));
    });
    gameGrid.appendChild(cell);
  }
}

function updateGrid() {
  var cells = gameGrid.querySelectorAll(".grid-cell");
  var isDisabled = !gameStarted || !roundActive || isGameOver();

  cells.forEach(function (cell, index) {
    cell.disabled = isDisabled;
    cell.classList.remove("active");

    // Remove ping element if exists
    var ping = cell.querySelector(".ping");
    if (ping) {
      ping.parentNode.removeChild(ping);
    }

    if (activeCell === index) {
      cell.classList.add("active");
      var pingEl = document.createElement("div");
      pingEl.className = "ping";
      cell.appendChild(pingEl);
    }
  });
}

function updateScores() {
  player1NameEl.textContent = player1Name || "Player 1";
  player2NameEl.textContent = player2Name || "Waiting...";
  player1ScoreEl.textContent = player1Score;
  player2ScoreEl.textContent = player2Score;

  // Connection status
  player2Dot.classList.toggle("connected", !!player2Name);
  player2Card.classList.toggle("disconnected", !player2Name);

  // Highlight last winner
  player1Card.classList.remove("highlight-cyan");
  player2Card.classList.remove("highlight-magenta");

  if (lastWinner === 1) {
    player1Card.classList.add("highlight-cyan");
  } else if (lastWinner === 2) {
    player2Card.classList.add("highlight-magenta");
  }
}

function isGameOver() {
  return player1Score >= WINNING_SCORE || player2Score >= WINNING_SCORE;
}

function getWinner() {
  if (player1Score >= WINNING_SCORE) return 1;
  if (player2Score >= WINNING_SCORE) return 2;
  return null;
}

function showGameOver() {
  var winner = getWinner();
  var winnerPlayer = winner === 1 ? player1Name : player2Name;

  gameOver.classList.remove("hidden");
  gameOver.classList.remove("neon-card-cyan", "neon-card-magenta");
  gameOver.classList.add(winner === 1 ? "neon-card-cyan" : "neon-card-magenta");

  winnerName.textContent = winnerPlayer + " Wins!";
  winnerName.classList.remove("neon-text-cyan", "neon-text-magenta");
  winnerName.classList.add(
    winner === 1 ? "neon-text-cyan" : "neon-text-magenta"
  );

  var trophyIcon = gameOver.querySelector(".trophy-icon");
  trophyIcon.style.color =
    winner === 1 ? "hsl(180, 100%, 50%)" : "hsl(320, 100%, 50%)";

  finalScore.textContent =
    "Final Score: " + player1Score + " - " + player2Score;
}

function hideGameOver() {
  gameOver.classList.add("hidden");
}

function showWaitingMessage(show) {
  waitingMessage.classList.toggle("hidden", !show);
}

function showStartButton(show) {
  btnStart.classList.toggle("hidden", !show);
}

function showRoundIndicator(show) {
  roundIndicator.classList.toggle("hidden", !show);
}

function updateRoundIndicator() {
  if (roundActive) {
    roundText.textContent = "TAP THE RED CELL!";
    roundText.classList.add("active");
  } else {
    roundText.textContent = "Get Ready...";
    roundText.classList.remove("active");
  }
}

function startNewRound() {
  if (!player1Name || !player2Name || isGameOver()) return;

  activeCell = null;
  lastWinner = null;
  updateGrid();
  updateScores();

  // Random delay before showing target (1-3 seconds)
  var delay = Math.random() * 2000 + 1000;

  setTimeout(function () {
    if (!isGameOver()) {
      activeCell = Math.floor(Math.random() * 9);
      roundActive = true;
      updateGrid();
      updateRoundIndicator();
    }
  }, delay);
}

function handleCellClick(index) {
  if (!roundActive || activeCell !== index) return;

  // Simulate random winner for demo (in real app, this would be server-side)
  var clickedBy = Math.random() > 0.5 ? 1 : 2;

  if (clickedBy === 1) {
    player1Score++;
    lastWinner = 1;
  } else {
    player2Score++;
    lastWinner = 2;
  }

  activeCell = null;
  roundActive = false;

  updateGrid();
  updateScores();
  updateRoundIndicator();

  if (isGameOver()) {
    showGameOver();
    showRoundIndicator(false);
  } else {
    // Start next round after delay
    setTimeout(startNewRound, 1500);
  }
}

function startCountdown() {
  countdown = 3;
  countdownOverlay.classList.remove("hidden");
  countdownNumber.textContent = countdown;
  countdownNumber.classList.remove("neon-text-magenta");
  countdownNumber.classList.add("neon-text-cyan");

  countdownTimer = setInterval(function () {
    countdown--;

    if (countdown > 0) {
      countdownNumber.textContent = countdown;
    } else if (countdown === 0) {
      countdownNumber.textContent = "GO!";
      countdownNumber.classList.remove("neon-text-cyan");
      countdownNumber.classList.add("neon-text-magenta");
    } else {
      clearInterval(countdownTimer);
      countdownOverlay.classList.add("hidden");
      gameStarted = true;
      countdown = null;
      showRoundIndicator(true);
      updateRoundIndicator();
      startNewRound();
    }
  }, 1000);
}

function resetGame() {
  player1Score = 0;
  player2Score = 0;
  activeCell = null;
  lastWinner = null;
  gameStarted = false;
  countdown = null;
  roundActive = false;

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  hideGameOver();
  updateGrid();
  updateScores();
  showRoundIndicator(false);

  var bothConnected = player1Name && player2Name;
  showWaitingMessage(!bothConnected);
  showStartButton(bothConnected);
}

function enterGame(isCreating) {
  gameState = "game";
  showScreen("game");
  displayGameCode.textContent = gameCode;

  createGrid();
  updateGrid();
  updateScores();

  var bothConnected = player1Name && player2Name;
  showWaitingMessage(!bothConnected);
  showStartButton(
    bothConnected && !gameStarted && !isGameOver() && countdown === null
  );
  showRoundIndicator(false);
  hideGameOver();
}

function leaveGame() {
  gameState = "dashboard";
  gameCode = "";
  player1Name = "";
  player2Name = "";
  isHost = false;
  player1Score = 0;
  player2Score = 0;
  activeCell = null;
  gameStarted = false;
  lastWinner = null;
  countdown = null;
  roundActive = false;

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  showScreen("dashboard");
  showMode("select");
}

// Event Listeners
playerNameInput.addEventListener("input", function () {
  playerName = this.value.trim();
  updatePlayerButtons();
});

btnCreate.addEventListener("click", function () {
  showMode("create");
});

btnJoin.addEventListener("click", function () {
  showMode("join");
});

btnCreateBack.addEventListener("click", function () {
  showMode("select");
});

btnJoinBack.addEventListener("click", function () {
  showMode("select");
});

btnStartGame.addEventListener("click", function () {
  gameCode = generateGameCode();
  player1Name = playerName;
  player2Name = ""; // Will be filled when opponent joins
  isHost = true;

  enterGame(true);

  // Simulate opponent joining after 2 seconds (for demo)
  setTimeout(function () {
    player2Name = "Challenger";
    updateScores();
    showWaitingMessage(false);
    showStartButton(true);
    showToast("Opponent Joined!", "Challenger has entered the arena!");
  }, 2000);
});

gameCodeInput.addEventListener("input", function () {
  this.value = this.value.toUpperCase();
  updateJoinButton();
});

btnJoinGame.addEventListener("click", function () {
  gameCode = gameCodeInput.value.trim().toUpperCase();
  player1Name = "Host Player"; // In real app, this comes from server
  player2Name = playerName;
  isHost = false;

  enterGame(false);
  showToast("Joined Game!", "Connected to game " + gameCode);
});

btnCopy.addEventListener("click", function () {
  navigator.clipboard.writeText(gameCode);
  iconCopy.classList.add("hidden");
  iconCheck.classList.remove("hidden");

  setTimeout(function () {
    iconCopy.classList.remove("hidden");
    iconCheck.classList.add("hidden");
  }, 2000);
});

btnLeave.addEventListener("click", leaveGame);

btnStart.addEventListener("click", function () {
  if (!player1Name || !player2Name) return;
  showStartButton(false);
  startCountdown();
});

btnPlayAgain.addEventListener("click", resetGame);

// Initialize
createGrid();
