// 1. Import Firebase & Confetti
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
// NEW: Import Confetti Library
import confetti from "https://cdn.skypack.dev/canvas-confetti";

// 2. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBgOFZLR2uuuAkvNC4oR0b0nLHvKr1sOe0",
  authDomain: "game-wars.firebaseapp.com",

  // ⚠️ IMPORTANT: REPLACE THIS URL WITH YOUR ACTUAL DATABASE URL ⚠️
  databaseURL: "https://game-wars-default-rtdb.firebaseio.com",

  projectId: "game-wars",
  storageBucket: "game-wars.firebasestorage.app",
  messagingSenderId: "783310585542",
  appId: "1:783310585542:web:a2fd19275569784d1f61c7",
  measurementId: "G-178CLNJ55W",
};

// 3. Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("🔥 Firebase Initialized");

// --- VARIABLES ---
let myRole = null; // 'host' or 'guest'
let currentGameRef = null;
let myPlayerName = "";
let currentGameCode = "";
let isRoundActive = false;
const WINNING_SCORE = 5;

// --- AUDIO SYSTEM (NEW) ---
// "Mission Impossible" Theme (Hosted on Archive.org)
const bgMusic = new Audio(
  "https://ia800403.us.archive.org/24/items/MissionImpossibleTheme/Mission_Impossible_Theme.mp3"
);
bgMusic.loop = true;
bgMusic.volume = 0.5; // 50% volume
let isMuted = false;

// --- DOM ELEMENTS ---
const dashboard = document.getElementById("dashboard");
const gameScreen = document.getElementById("game-screen");
const modeSelect = document.getElementById("mode-select");
const modeCreate = document.getElementById("mode-create");
const modeJoin = document.getElementById("mode-join");
const playerNameInput = document.getElementById("player-name");
const gameCodeInput = document.getElementById("game-code-input");

// Game Screen Elements
const player1NameEl = document.getElementById("player1-name");
const player2NameEl = document.getElementById("player2-name");
const player1ScoreEl = document.getElementById("player1-score");
const player2ScoreEl = document.getElementById("player2-score");
const waitingMessage = document.getElementById("waiting-message");
const btnStart = document.getElementById("btn-start"); // The Game Start Button
const gameGrid = document.getElementById("game-grid");
const gameOver = document.getElementById("game-over");
const roundIndicator = document.getElementById("round-indicator");
const roundText = document.getElementById("round-text");
const displayGameCode = document.getElementById("display-game-code");

// --- HELPER FUNCTIONS ---
function generateGameCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function showToast(title, msg) {
  const container = document.getElementById("toast-container");
  if (!container) return; // Guard clause

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-description">${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- NEW: MUSIC CONTROLS ---
function initAudioControls() {
  // Create Mute Button dynamically
  const muteBtn = document.createElement("button");
  muteBtn.id = "btn-mute";
  muteBtn.innerHTML = "🔊"; // Speaker Icon

  // Style it to float top-right
  Object.assign(muteBtn.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: "1000",
    background: "rgba(0, 0, 0, 0.7)",
    border: "2px solid #00f3ff",
    borderRadius: "50%",
    width: "50px",
    height: "50px",
    fontSize: "24px",
    cursor: "pointer",
    color: "#fff",
    boxShadow: "0 0 10px #00f3ff",
    transition: "all 0.3s ease",
  });

  // Toggle Mute Logic
  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent triggering other clicks
    isMuted = !isMuted;
    if (isMuted) {
      bgMusic.pause();
      muteBtn.innerHTML = "🔇";
      muteBtn.style.borderColor = "#ff0055"; // Red border when muted
      muteBtn.style.boxShadow = "0 0 10px #ff0055";
    } else {
      bgMusic.play().catch((e) => console.log("Audio play blocked:", e));
      muteBtn.innerHTML = "🔊";
      muteBtn.style.borderColor = "#00f3ff"; // Blue border when active
      muteBtn.style.boxShadow = "0 0 10px #00f3ff";
    }
  });

  document.body.appendChild(muteBtn);

  // Auto-play workaround: Browser won't let us play audio until user interacts.
  // We attach a one-time listener to the body.
  document.body.addEventListener(
    "click",
    () => {
      if (!isMuted && bgMusic.paused) {
        bgMusic.play().catch((e) => console.log("Waiting for interaction..."));
      }
    },
    { once: true }
  );
}

// --- UI BUTTON HANDLING ---

// Enable buttons when typing name
playerNameInput.addEventListener("input", () => {
  const hasName = playerNameInput.value.trim().length > 0;
  document.getElementById("btn-create").disabled = !hasName;
  document.getElementById("btn-join").disabled = !hasName;
});

// Enable Join button when typing code
gameCodeInput.addEventListener("input", () => {
  gameCodeInput.value = gameCodeInput.value.toUpperCase();
  document.getElementById("btn-join-game").disabled =
    gameCodeInput.value.trim().length < 4;
});

// Navigation
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

// Copy Code Button
document.getElementById("btn-copy").addEventListener("click", () => {
  navigator.clipboard.writeText(currentGameCode).then(() => {
    showToast("Copied!", "Code copied to clipboard.");
  });
});

// --- CORE LOGIC ---

// 1. HOST CREATES GAME
document.getElementById("btn-start-game").addEventListener("click", () => {
  myPlayerName = playerNameInput.value.trim();
  if (!myPlayerName) return alert("Enter name!");

  const code = generateGameCode();
  currentGameCode = code;
  myRole = "host";

  // Visual Feedback
  const btn = document.getElementById("btn-start-game");
  btn.innerText = "Creating...";
  btn.disabled = true;

  currentGameRef = ref(db, `games/${code}`);

  set(currentGameRef, {
    host: { name: myPlayerName, score: 0 },
    guest: { name: "", score: 0 },
    gameState: "waiting",
    activeCell: -1,
    round: 0,
  })
    .then(() => {
      onDisconnect(currentGameRef).remove();
      enterLobbyUI(code);
      listenToGame(code);
    })
    .catch((err) => {
      console.error(err);
      alert(
        "❌ DATABASE CONNECTION FAILED!\n\nPlease check your 'databaseURL' in app.js.\nIt must match the URL in your Firebase Console -> Realtime Database."
      );
      btn.innerText = "Start Game";
      btn.disabled = false;
    });
});

// 2. GUEST JOINS GAME
document.getElementById("btn-join-game").addEventListener("click", () => {
  myPlayerName = playerNameInput.value.trim();
  const code = gameCodeInput.value.trim().toUpperCase();

  if (!myPlayerName || code.length < 4) return alert("Check inputs!");

  currentGameCode = code;
  myRole = "guest";

  // Visual Feedback
  const btn = document.getElementById("btn-join-game");
  btn.innerText = "Joining...";
  btn.disabled = true;

  currentGameRef = ref(db, `games/${code}`);

  // Check if game exists
  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        alert("Game not found! Check the code.");
        btn.innerText = "Join Game";
        btn.disabled = false;
        return;
      }

      // Join Condition: Game is waiting AND Guest slot is empty
      if (
        data.gameState === "waiting" &&
        (!data.guest.name || data.guest.name === "")
      ) {
        // Update Firebase
        update(currentGameRef, {
          "guest/name": myPlayerName,
          "guest/score": 0,
          gameState: "ready", // This triggers the start button for Host
        });

        onDisconnect(ref(db, `games/${code}/guest`)).update({
          name: "",
          score: 0,
        });

        enterLobbyUI(code);
        listenToGame(code);
      } else {
        alert("Game is full or already started!");
        btn.innerText = "Join Game";
        btn.disabled = false;
      }
    },
    { onlyOnce: true }
  ); // Important: Run this check only once
});

// 3. REALTIME LISTENER (The Brain)
function listenToGame(code) {
  onValue(ref(db, `games/${code}`), (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      alert("Game ended by host.");
      location.reload();
      return;
    }

    // A. Update Names & Scores
    player1NameEl.innerText = data.host.name;
    player1ScoreEl.innerText = data.host.score;

    // Check if guest exists
    if (data.guest && data.guest.name) {
      player2NameEl.innerText = data.guest.name;
      player2ScoreEl.innerText = data.guest.score;
      document.getElementById("player2-dot").classList.add("connected");
      document
        .getElementById("player2-score-card")
        .classList.remove("disconnected");
    } else {
      player2NameEl.innerText = "Waiting...";
      document.getElementById("player2-dot").classList.remove("connected");
      document
        .getElementById("player2-score-card")
        .classList.add("disconnected");
    }

    // B. Handle Game States
    if (data.gameState === "waiting") {
      waitingMessage.classList.remove("hidden");
      btnStart.classList.add("hidden");
      roundIndicator.classList.add("hidden");
    } else if (data.gameState === "ready") {
      waitingMessage.classList.add("hidden");
      roundIndicator.classList.remove("hidden");
      roundText.innerText = "READY TO START";
      roundText.classList.remove("active");

      // LOGIC: If I am Host, SHOW Start Button
      if (myRole === "host") {
        btnStart.classList.remove("hidden");
        btnStart.disabled = false; // Ensure it's clickable
      } else {
        btnStart.classList.add("hidden");
        roundText.innerText = "Waiting for Host...";
      }
    } else if (data.gameState === "playing") {
      waitingMessage.classList.add("hidden");
      btnStart.classList.add("hidden"); // Hide button during game
      roundIndicator.classList.remove("hidden");

      if (data.activeCell === -1) {
        // --- ROUND ENDED / WAITING PHASE ---
        roundText.innerText = "Get Ready...";
        roundText.classList.remove("active");
        renderGrid(-1); // Force clear the grid immediately so the pulse stops

        // LOGIC FIX: If round was just active, and now it's -1, it means someone clicked.
        // The HOST triggers the next round.
        if (isRoundActive === true) {
          isRoundActive = false; // Reset local flag
          if (myRole === "host") {
            // Schedule next round
            runHostGameLoop();
          }
        }
      } else {
        // --- ROUND ACTIVE PHASE ---
        isRoundActive = true; // Mark round as active locally
        roundText.innerText = "TAP RED CELL!";
        roundText.classList.add("active");
        renderGrid(data.activeCell); // Light up box
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

// 4. GAME LOOP LOGIC

// Host clicks "Start Game"
btnStart.addEventListener("click", () => {
  if (myRole === "host") {
    // Hide button immediately to prevent double clicks
    btnStart.classList.add("hidden");

    // Update DB to playing
    update(currentGameRef, {
      gameState: "playing",
      activeCell: -1,
      round: 1,
    });

    // Start local countdown then game loop
    startCountdownAndRun();
  }
});

function startCountdownAndRun() {
  const overlay = document.getElementById("countdown-overlay");
  const num = document.getElementById("countdown-number");

  overlay.classList.remove("hidden");
  let count = 3;
  num.innerText = count;

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      num.innerText = count;
    } else {
      clearInterval(timer);
      overlay.classList.add("hidden");
      runHostGameLoop(); // Start the randomizer
    }
  }, 1000);
}

function runHostGameLoop() {
  if (myRole !== "host") return;

  // Random delay 1s - 3s
  const delay = Math.random() * 2000 + 1000;

  setTimeout(() => {
    // Check winner before starting new round
    onValue(
      currentGameRef,
      (snap) => {
        const data = snap.val();
        if (!data || data.gameState !== "playing") return;

        if (
          data.host.score >= WINNING_SCORE ||
          data.guest.score >= WINNING_SCORE
        ) {
          update(currentGameRef, { gameState: "finished" });
        } else {
          // Pick random cell
          const randomCell = Math.floor(Math.random() * 9);
          update(currentGameRef, { activeCell: randomCell });
        }
      },
      { onlyOnce: true }
    );
  }, delay);
}

// Handling Clicks
function handleCellClick(index) {
  if (!currentGameRef) return;

  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();
      // Validate Click
      if (data && data.gameState === "playing" && data.activeCell === index) {
        // 1. Reset Active Cell
        update(currentGameRef, { activeCell: -1 });

        // 2. Update Score
        const updates = {};
        if (myRole === "host") {
          updates["host/score"] = data.host.score + 1;
        } else {
          updates["guest/score"] = data.guest.score + 1;
        }
        update(currentGameRef, updates);

        showToast("Point!", "Fast reflexes!");

        // 3. REMOVED THE MANUAL HOST TRIGGER HERE
        // We now rely on 'listenToGame' to detect the reset to -1
      }
    },
    { onlyOnce: true }
  );
}

// --- VISUAL UI FUNCTIONS ---

function enterLobbyUI(code) {
  dashboard.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  displayGameCode.innerText = code;

  // Build Grid
  gameGrid.innerHTML = "";
  for (let i = 0; i < 9; i++) {
    let btn = document.createElement("button");
    btn.className = "grid-cell";
    btn.innerHTML = `<span class="cell-number">${i + 1}</span>`;
    btn.onclick = () => handleCellClick(i);
    gameGrid.appendChild(btn);
  }
}

function renderGrid(activeIdx) {
  const cells = document.querySelectorAll(".grid-cell");
  cells.forEach((cell, idx) => {
    cell.classList.remove("active");
    const oldPing = cell.querySelector(".ping");
    if (oldPing) oldPing.remove();

    if (idx === activeIdx && activeIdx !== -1) {
      cell.classList.add("active");
      let ping = document.createElement("div");
      ping.className = "ping";
      cell.appendChild(ping);
    }
  });
}

function showGameOverUI(hScore, gScore, hName, gName) {
  gameOver.classList.remove("hidden");
  const winner = hScore > gScore ? hName : gName;
  const isHostWin = hScore > gScore;

  document.getElementById("winner-name").innerText = `${winner} WINS!`;
  document.getElementById("final-score").innerText = `${hScore} - ${gScore}`;

  // NEW: TRIGGER CONFETTI BLAST!
  const colors = isHostWin ? ["#00f3ff", "#ffffff"] : ["#ff0055", "#ffffff"];
  const duration = 3000;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();

  if (isHostWin) {
    gameOver.className = "neon-card neon-card-cyan game-over-card";
    document.getElementById("winner-name").className =
      "winner-text neon-text-cyan";
  } else {
    gameOver.className = "neon-card neon-card-magenta game-over-card";
    document.getElementById("winner-name").className =
      "winner-text neon-text-magenta";
  }
}

// INITIALIZE AUDIO
initAudioControls();

document
  .getElementById("btn-play-again")
  .addEventListener("click", () => location.reload());
document
  .getElementById("btn-leave")
  .addEventListener("click", () => location.reload());
