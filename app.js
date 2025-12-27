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
import confetti from "https://cdn.skypack.dev/canvas-confetti";

import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

console.log("firebase working");

let myRole = null;
let currentGameRef = null;
let myPlayerName = "";
let currentGameCode = "";
let isRoundActive = false;
const WINNING_SCORE = 5;

const bgMusic = new Audio("music.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.3;
let isMusicPlaying = false;

const salamSound = new Audio("salam.mp3");
let hasSalamPlayed = false;

const clickSounds = [
  new Audio("click1.mp3"),
  new Audio("click2.mp3"),
  new Audio("click3.mp3"),
  new Audio("click4.mp3"),
  new Audio("click5.mp3"),
];

// Play Salam sound Once
function playSalam() {
  if (!hasSalamPlayed) {
    salamSound
      .play()
      .catch((e) => console.log("Salam blocked until interaction"));
    hasSalamPlayed = true;
  }
}

function playRandomClick() {
  const index = Math.floor(Math.random() * clickSounds.length);

  const sound = clickSounds[index].cloneNode();
  sound.volume = 1.0;
  sound.play().catch((e) => console.log("Click sound error:", e));
}

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
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<div class="toast-title">${title}</div><div class="toast-description">${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- MUSIC CONTROLS ---
function initAudioControls() {
  const muteBtn = document.createElement("button");
  muteBtn.id = "btn-mute";
  muteBtn.innerHTML = "🔊";
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

  const tryToPlay = () => {
    if (isMusicPlaying) return;
    bgMusic
      .play()
      .then(() => {
        isMusicPlaying = true;
        muteBtn.innerHTML = "🔊";
        muteBtn.style.borderColor = "#00f3ff";

        document.removeEventListener("click", tryToPlay);
        document.removeEventListener("touchstart", tryToPlay);
        document.removeEventListener("keydown", tryToPlay);
      })
      .catch((err) => {});
  };

  document.addEventListener("click", tryToPlay);
  document.addEventListener("touchstart", tryToPlay);
  document.addEventListener("keydown", tryToPlay);

  muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isMusicPlaying) {
      bgMusic.pause();
      isMusicPlaying = false;
      muteBtn.innerHTML = "🔇";
      muteBtn.style.borderColor = "#ff0055";
    } else {
      tryToPlay();
    }
  });

  document.body.appendChild(muteBtn);
}

// --- BUTTON HANDLING ---

playerNameInput.addEventListener("input", () => {
  const hasName = playerNameInput.value.trim().length > 0;
  document.getElementById("btn-create").disabled = !hasName;
  document.getElementById("btn-join").disabled = !hasName;
});

gameCodeInput.addEventListener("input", () => {
  gameCodeInput.value = gameCodeInput.value.toUpperCase();
  document.getElementById("btn-join-game").disabled =
    gameCodeInput.value.trim().length < 4;
});

document.getElementById("btn-create").addEventListener("click", () => {
  playSalam(); // salam sound
  const name = playerNameInput.value.trim();
  if (name) {
    document.getElementById("create-player-name").innerText = name;
    modeSelect.classList.add("hidden");
    modeCreate.classList.remove("hidden");
  }
});

document.getElementById("btn-join").addEventListener("click", () => {
  playSalam();
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

document.getElementById("btn-copy").addEventListener("click", () => {
  navigator.clipboard.writeText(currentGameCode).then(() => {
    showToast("Copied!", "Code copied to clipboard.");
  });
});

// -----Main logic----
document.getElementById("btn-start-game").addEventListener("click", () => {
  myPlayerName = playerNameInput.value.trim();
  if (!myPlayerName) return alert("Enter name!");

  const code = generateGameCode();
  currentGameCode = code;
  myRole = "host";

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
      alert("Database Connection Error!");
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

  const btn = document.getElementById("btn-join-game");
  btn.innerText = "Joining...";
  btn.disabled = true;

  currentGameRef = ref(db, `games/${code}`);

  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();

      if (!data) {
        alert("Game not found!");
        btn.innerText = "Join Game";
        btn.disabled = false;
        return;
      }

      if (
        data.gameState === "waiting" &&
        (!data.guest.name || data.guest.name === "")
      ) {
        update(currentGameRef, {
          "guest/name": myPlayerName,
          "guest/score": 0,
          gameState: "ready",
        });
        onDisconnect(ref(db, `games/${code}/guest`)).update({
          name: "",
          score: 0,
        });
        enterLobbyUI(code);
        listenToGame(code);
      } else {
        alert("Game full!");
        btn.innerText = "Join Game";
        btn.disabled = false;
      }
    },
    { onlyOnce: true }
  );
});

// 3. realtime firebase listener
function listenToGame(code) {
  onValue(ref(db, `games/${code}`), (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      alert("Game ended by host.");
      location.reload();
      return;
    }

    player1NameEl.innerText = data.host.name;
    player1ScoreEl.innerText = data.host.score;

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

    if (data.gameState === "waiting") {
      waitingMessage.classList.remove("hidden");
      btnStart.classList.add("hidden");
      roundIndicator.classList.add("hidden");
    } else if (data.gameState === "ready") {
      waitingMessage.classList.add("hidden");
      roundIndicator.classList.remove("hidden");
      roundText.innerText = "READY TO START";
      roundText.classList.remove("active");

      if (myRole === "host") {
        btnStart.classList.remove("hidden");
        btnStart.disabled = false;
      } else {
        btnStart.classList.add("hidden");
        roundText.innerText = "Waiting for Host...";
      }
    } else if (data.gameState === "playing") {
      waitingMessage.classList.add("hidden");
      btnStart.classList.add("hidden");
      roundIndicator.classList.remove("hidden");

      if (data.activeCell === -1) {
        roundText.innerText = "Get Ready...";
        roundText.classList.remove("active");
        renderGrid(-1);

        if (isRoundActive === true) {
          isRoundActive = false;
          if (myRole === "host") {
            runHostGameLoop();
          }
        }
      } else {
        isRoundActive = true;
        roundText.innerText = "TAP RED CELL!";
        roundText.classList.add("active");
        renderGrid(data.activeCell);
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

btnStart.addEventListener("click", () => {
  if (myRole === "host") {
    btnStart.classList.add("hidden");
    update(currentGameRef, {
      gameState: "playing",
      activeCell: -1,
      round: 1,
    });
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
      runHostGameLoop();
    }
  }, 1000);
}

function runHostGameLoop() {
  if (myRole !== "host") return;
  const delay = Math.random() * 2000 + 1000;

  setTimeout(() => {
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
          const randomCell = Math.floor(Math.random() * 9);
          update(currentGameRef, { activeCell: randomCell });
        }
      },
      { onlyOnce: true }
    );
  }, delay);
}

function handleCellClick(index) {
  if (!currentGameRef) return;

  onValue(
    currentGameRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data && data.gameState === "playing" && data.activeCell === index) {
        playRandomClick();

        update(currentGameRef, { activeCell: -1 });

        const updates = {};
        if (myRole === "host") {
          updates["host/score"] = data.host.score + 1;
        } else {
          updates["guest/score"] = data.guest.score + 1;
        }
        update(currentGameRef, updates);
        showToast("Point!", "Fast reflexes!");
      }
    },
    { onlyOnce: true }
  );
}

function enterLobbyUI(code) {
  dashboard.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  displayGameCode.innerText = code;

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

  // Confetti Blast
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

initAudioControls();

document
  .getElementById("btn-play-again")
  .addEventListener("click", () => location.reload());
document
  .getElementById("btn-leave")
  .addEventListener("click", () => location.reload());
