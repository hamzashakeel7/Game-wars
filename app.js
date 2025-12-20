// 1. Import the specific Firebase functions we need for the game
// We use version 10.14.1 to ensure stability
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  update,
  onDisconnect,
  remove,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// 2. YOUR SPECIFIC FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBgOFZLR2uuuAkvNC4oR0b0nLHvKr1sOe0",
  authDomain: "game-wars.firebaseapp.com",
  databaseURL: "https://game-wars-default-rtdb.firebaseio.com",
  projectId: "game-wars",
  storageBucket: "game-wars.firebasestorage.app",
  messagingSenderId: "783310585542",
  appId: "1:783310585542:web:a2fd19275569784d1f61c7",
  measurementId: "G-178CLNJ55W",
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- GAME VARIABLES ---
let myRole = null; // 'host' or 'guest'
let currentGameRef = null;
let myPlayerName = "";
let currentGameCode = "";
const WINNING_SCORE = 5;
let gameActive = false;

// --- DOM ELEMENTS ---
const dashboard = document.getElementById("dashboard");
const gameScreen = document.getElementById("game-screen");
const modeSelect = document.getElementById("mode-select");
const modeCreate = document.getElementById("mode-create");
const modeJoin = document.getElementById("mode-join");
const playerNameInput = document.getElementById("player-name");
const gameCodeInput = document.getElementById("game-code-input");
const player1NameEl = document.getElementById("player1-name");
const player2NameEl = document.getElementById("player2-name");
const player1ScoreEl = document.getElementById("player1-score");
const player2ScoreEl = document.getElementById("player2-score");
const waitingMessage = document.getElementById("waiting-message");
const btnStart = document.getElementById("btn-start");
const gameGrid = document.getElementById("game-grid");
const gameOver = document.getElementById("game-over");
const btnStartGame = document.getElementById("btn-start-game");
const roundIndicator = document.getElementById("round-indicator");
const roundText = document.getElementById("round-text");

// --- HELPER FUNCTIONS ---
function generateGameCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function showToast(title, msg) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <div class="toast-title">${title}</div>
    <div class="toast-description">${msg}</div>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
  console.log(`[${title}] ${msg}`);
}

// --- INPUT HANDLING ---

// 1. Enable Dashboard Buttons when Name is typed
playerNameInput.addEventListener("input", () => {
  const hasName = playerNameInput.value.trim().length > 0;
  document.getElementById("btn-create").disabled = !hasName;
  document.getElementById("btn-join").disabled = !hasName;
});

// 2. Enable "Join Game" button when Code is typed and Auto-Uppercase
gameCodeInput.addEventListener("input", () => {
  gameCodeInput.value = gameCodeInput.value.toUpperCase();
  const code = gameCodeInput.value.trim();
  document.getElementById("btn-join-game").disabled = code.length < 4;
});

// --- UI NAVIGATION ---
document.getElementById("btn-create").addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (name) {
    document.getElementById("create-player-name").innerText = name;
    modeSelect.classList.add("hidden");
    modeCreate.classList.remove("hidden");
  }
});

document.getElementById("btn-join").addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (name) {
    document.getElementById("join-player-name").innerText = name;
    modeSelect.classList.add("hidden");
    modeJoin.classList.remove("hidden");
  }
});

document.getElementById("btn-create-back").addEventListener("click", () => {
  modeCreate.classList.add("hidden");
  modeSelect.classList.remove("hidden");
});

document.getElementById("btn-join-back").addEventListener("click", () => {
  modeJoin.classList.add("hidden");
  modeSelect.classList.remove("hidden");
});

// --- CORE FIREBASE LOGIC ---

// A. HOST CREATES GAME - FIXED
btnStartGame.addEventListener("click", () => {
  myPlayerName = playerNameInput.value.trim();
  if (!myPlayerName) {
    alert("Please enter your name first!");
    return;
  }

  const code = generateGameCode();
  currentGameCode = code;
  myRole = "host";

  showToast("Game Created", `Code: ${code}`);

  // Create Reference to 'games/CODE'
  currentGameRef = ref(db, `games/${code}`);

  // Set Initial Data
  set(currentGameRef, {
    host: { name: myPlayerName, score: 0 },
    guest: { name: "", score: 0 },
    gameState: "waiting", // waiting -> ready -> playing -> finished
    activeCell: -1,
    round: 0,
    lastWinner: null,
  })
    .then(() => {
      // If Host disconnects, delete the game to keep DB clean
      onDisconnect(currentGameRef).remove();

      enterLobbyUI(code);
      listenToGame(code); // Start Watching for Changes
    })
    .catch((error) => {
      console.error("FIREBASE ERROR:", error);
      alert("Error creating game! Check console for details.");
    });
});

// B. GUEST JOINS GAME
document.getElementById("btn-join-game").addEventListener("click", () => {
  myPlayerName = playerNameInput.value.trim();
  const code = gameCodeInput.value.trim().toUpperCase();

  if (!myPlayerName) {
    alert("Enter Name!");
    return;
  }
  if (code.length < 4) {
    alert("Invalid Code!");
    return;
  }

  currentGameCode = code;
  myRole = "guest";
  currentGameRef = ref(db, `games/${code}`);

  // Check if game exists before joining
  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        alert("Game not found!");
        return;
      }

      // If game exists AND is waiting for player AND guest slot is empty
      if (
        data &&
        data.gameState === "waiting" &&
        (!data.guest.name || data.guest.name === "")
      ) {
        // Join the game
        update(currentGameRef, {
          "guest/name": myPlayerName,
          "guest/score": 0,
          gameState: "ready",
        });

        // If Guest disconnects, just clear their name
        onDisconnect(ref(db, `games/${code}/guest`)).update({
          name: "",
          score: 0,
        });

        enterLobbyUI(code);
        listenToGame(code); // Start Watching for Changes
        showToast("Joined Game", "Waiting for host to start...");
      } else {
        if (data.guest.name && data.guest.name !== "") {
          alert("Game is full!");
        } else if (data.gameState !== "waiting") {
          alert("Game already in progress!");
        }
      }
    },
    { onlyOnce: true }
  );
});

// C. THE REALTIME LISTENER (Runs whenever DB changes)
function listenToGame(code) {
  onValue(ref(db, `games/${code}`), (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      alert("Game ended.");
      location.reload();
      return;
    }

    // 1. Update UI Text
    player1NameEl.innerText = data.host.name;
    player1ScoreEl.innerText = data.host.score;
    player2NameEl.innerText = data.guest.name || "Waiting...";
    player2ScoreEl.innerText = data.guest.score || 0;

    const player2Dot = document.getElementById("player2-dot");
    if (player2Dot) {
      player2Dot.classList.toggle(
        "connected",
        !!(data.guest && data.guest.name)
      );
    }

    // 2. Handle Game States
    if (data.gameState === "waiting") {
      waitingMessage.classList.remove("hidden");
      btnStart.classList.add("hidden");
      roundIndicator.classList.add("hidden");
    } else if (data.gameState === "ready") {
      waitingMessage.classList.add("hidden");
      roundIndicator.classList.remove("hidden");
      roundText.textContent = "Ready to play!";
      roundText.classList.remove("active");

      // Only Host sees Start Button
      if (myRole === "host") {
        btnStart.classList.remove("hidden");
      } else {
        btnStart.classList.add("hidden");
      }
    } else if (data.gameState === "playing") {
      waitingMessage.classList.add("hidden");
      btnStart.classList.add("hidden");
      roundIndicator.classList.remove("hidden");

      if (data.activeCell === -1) {
        roundText.textContent = "Get ready...";
        roundText.classList.add("active");
      } else {
        roundText.textContent = "TAP THE RED CELL!";
        roundText.classList.add("active");
        renderGrid(data.activeCell); // Lights up the Red Box
      }
    } else if (data.gameState === "finished") {
      showGameOverUI(
        data.host.score,
        data.guest.score,
        data.host.name,
        data.guest.name
      );
    }
  });
}

// --- GAMEPLAY LOGIC ---

// Start Button (Host Only)
btnStart.addEventListener("click", () => {
  if (myRole === "host") {
    update(currentGameRef, {
      gameState: "playing",
      activeCell: -1,
      round: 1,
    });

    // Start countdown
    startCountdown(3);
  }
});

function startCountdown(seconds) {
  const countdownOverlay = document.getElementById("countdown-overlay");
  const countdownNumber = document.getElementById("countdown-number");

  countdownOverlay.classList.remove("hidden");
  countdownNumber.textContent = seconds;

  let count = seconds;
  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownNumber.textContent = count;
    } else {
      clearInterval(interval);
      countdownOverlay.classList.add("hidden");
      // Start the game loop
      runGameLoop();
    }
  }, 1000);
}

// The Timer Loop (Runs on Host machine only)
function runGameLoop() {
  if (myRole !== "host") return;

  // Random delay (1-3 seconds)
  const delay = Math.random() * 2000 + 1000;

  setTimeout(() => {
    // Read latest score to check for winner
    onValue(
      currentGameRef,
      (snap) => {
        const data = snap.val();
        if (!data) return;

        if (
          data.host.score >= WINNING_SCORE ||
          data.guest.score >= WINNING_SCORE
        ) {
          update(currentGameRef, {
            gameState: "finished",
            activeCell: -1,
          });
        } else {
          // Pick new random cell
          const randomCell = Math.floor(Math.random() * 9);
          update(currentGameRef, {
            activeCell: randomCell,
            round: (data.round || 0) + 1,
          });

          // Set timeout to automatically reset if no one clicks
          setTimeout(() => {
            if (myRole === "host") {
              update(currentGameRef, { activeCell: -1 });
              // Start next round
              runGameLoop();
            }
          }, 1500); // Give players 1.5 seconds to click
        }
      },
      { onlyOnce: true }
    );
  }, delay);
}

// Clicking a Box
function handleCellClick(index) {
  if (!currentGameRef) return;

  // Check with DB if this is the active cell
  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data || data.gameState !== "playing") return;

      if (data.activeCell === index) {
        // Valid Click!

        // 1. Reset cell active state immediately
        update(currentGameRef, { activeCell: -1 });

        // 2. Increment Score
        const updateData = {};
        if (myRole === "host") {
          updateData["host/score"] = data.host.score + 1;
          updateData["lastWinner"] = "host";
        } else {
          updateData["guest/score"] = data.guest.score + 1;
          updateData["lastWinner"] = "guest";
        }

        update(currentGameRef, updateData);

        // 3. Show who scored
        showToast("Score!", `${myPlayerName} scored!`);

        // 4. Trigger next round (Host only)
        if (myRole === "host") {
          setTimeout(() => {
            runGameLoop();
          }, 1000);
        }
      }
    },
    { onlyOnce: true }
  );
}

// --- VISUAL UI FUNCTIONS ---

function enterLobbyUI(code) {
  dashboard.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  document.getElementById("display-game-code").innerText = code;

  // Copy code button
  document.getElementById("btn-copy").addEventListener("click", () => {
    navigator.clipboard.writeText(code).then(() => {
      const iconCopy = document.getElementById("icon-copy");
      const iconCheck = document.getElementById("icon-check");
      iconCopy.classList.add("hidden");
      iconCheck.classList.remove("hidden");
      setTimeout(() => {
        iconCopy.classList.remove("hidden");
        iconCheck.classList.add("hidden");
      }, 2000);
      showToast("Copied!", "Game code copied to clipboard!");
    });
  });

  // Generate the Grid Buttons
  gameGrid.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    let cell = document.createElement("button");
    cell.className = "grid-cell";
    // Add number for style
    cell.innerHTML = `<span class="cell-number">${i + 1}</span>`;
    cell.onclick = () => handleCellClick(i);
    gameGrid.appendChild(cell);
  }
}

function renderGrid(activeCellIndex) {
  const cells = document.querySelectorAll(".grid-cell");
  cells.forEach((cell, index) => {
    cell.classList.remove("active");
    // Remove old 'ping' animations
    const oldPing = cell.querySelector(".ping");
    if (oldPing) oldPing.remove();

    if (index === activeCellIndex && activeCellIndex !== -1) {
      cell.classList.add("active");
      // Add visual ping effect
      let ping = document.createElement("div");
      ping.className = "ping";
      cell.appendChild(ping);
    }
  });
}

function showGameOverUI(hostScore, guestScore, hostName, guestName) {
  gameOver.classList.remove("hidden");
  const winnerName = hostScore > guestScore ? hostName : guestName;
  const isHostWinner = hostScore > guestScore;

  document.getElementById("winner-name").innerText = `${winnerName} Wins!`;
  document.getElementById(
    "final-score"
  ).innerText = `${hostScore} - ${guestScore}`;

  // Style update based on winner
  if (isHostWinner) {
    gameOver.className = "neon-card neon-card-cyan game-over-card";
    document.getElementById("winner-name").className =
      "winner-text neon-text-cyan";
  } else {
    gameOver.className = "neon-card neon-card-magenta game-over-card";
    document.getElementById("winner-name").className =
      "winner-text neon-text-magenta";
  }
}

// Navigation Buttons
document.getElementById("btn-play-again").addEventListener("click", () => {
  location.reload();
});

document.getElementById("btn-leave").addEventListener("click", () => {
  // If host, remove the game from Firebase
  if (myRole === "host" && currentGameRef) {
    remove(currentGameRef);
  }
  location.reload();
});

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Enable/disable buttons based on initial state
  const hasName = playerNameInput.value.trim().length > 0;
  document.getElementById("btn-create").disabled = !hasName;
  document.getElementById("btn-join").disabled = !hasName;
  document.getElementById("btn-join-game").disabled = true;
});
