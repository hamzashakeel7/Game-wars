🕹️ Grid Wars: Real-Time Reflex Arena

React Faster. Win More. > A high-intensity, cyberpunk-themed multiplayer reflex game powered by Firebase Realtime Database.

📖 Introduction

Grid Wars is a 1v1 browser-based game where two players compete on a shared 3x3 grid. The game tests reaction speed rather than strategy. Players connect via a unique "Game Code" and compete to click the active RED cell first. The system handles race conditions in real-time to ensure fair play, syncing scores and states across devices instantly.

✨ Key Features

⚡ Real-Time Multiplayer: Instant synchronization between Host and Guest using Firebase.

🎨 Cyberpunk UI: Neon aesthetics, scanlines, and responsive glass-morphism design.

🔊 Immersive Audio: * Background arcade music loop.

Unique "Salam" welcome sound.

🏆 Victory Effects: Confetti blasts and dynamic "Game Over" modals.

📱 Fully Responsive: Optimized for both Desktop and Mobile touch interaction.

🤝 Tie Detection: Smart logic to handle draw games and instant rematches.

🛠️ Tech Stack

Frontend: HTML5, CSS3 (Custom Properties & Animations), JavaScript (ES6 Modules).

Backend / Database: Firebase Realtime Database.

Libraries: canvas-confetti (for victory effects).

Hosting: Vercel.

🚀 How to Play

Create: Player 1 enters their name and clicks "Create Game." A unique 5-digit code is generated.

Join: Player 2 enters their name and the 5-digit code on their device.

The Loop: A random box turns RED on both screens simultaneously.

The Clash: The first player to tap the box gets the point. The box resets instantly.

Win: First to 5 points wins the match!

📂 Project Structure

/grid-wars
│
├── index.html        # Main game UI and structure
├── style.css         # Cyberpunk styling and animations
├── app.js            # Core game logic and Firebase listeners
├── config.js         # Firebase configuration keys
├── music.mp3         # Background loop
├── salam.mp3         # Intro sound
└── README.md         # Documentation


🔧 Setup & Installation

To run this project locally:

Clone the repo:

git clone [https://github.com/your-username/grid-wars.git](https://github.com/your-username/grid-wars.git)


Configure Firebase:

Create a file named config.js in the root folder.

Add your Firebase keys (see app.js import structure).

Run:

Use VS Code "Live Server" or open index.html directly in a modern browser.

👥 Contributors

Hamza Shakeel Durrani 2580274 BSSE-1E - Lead Developer (Logic & Backend)

Ayaan Rehman 2580287 BSSE-1E - UI/UX Designer

Sufiyan Zakaria 2580299 BSSE-1E - Frontend Structure & Testing

Ali Mustafa 2580267 BSSE-1E - Frontend Structure & Testing


[Member 4 Name] - Documentation & Presentation

Built for ITC Semester Project | 2025

https://www.webwizdurrani.com/
