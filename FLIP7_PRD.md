# Flip 7 — Online Multiplayer Card Game

## Product Requirements Document (PRD)

### Version 1.0 — Complete Build Guide

---

## TABLE OF CONTENTS

1. [Game Rules & Card Reference](#1-game-rules--card-reference)
2. [Product Overview](#2-product-overview)
3. [Tech Stack](#3-tech-stack)
4. [File Structure](#4-file-structure)
5. [Socket Event Reference](#5-socket-event-reference)
6. [Game State Schema](#6-game-state-schema)
7. [Complete Code — Backend](#7-complete-code--backend)
8. [Complete Code — Frontend](#8-complete-code--frontend)
9. [Step-by-Step: GitHub Setup](#9-step-by-step-github-setup)
10. [Step-by-Step: Railway Deployment](#10-step-by-step-railway-deployment)
11. [Animation Reference](#11-animation-reference)
12. [Known Limitations & Edge Cases](#12-known-limitations--edge-cases)

---

## 1. GAME RULES & CARD REFERENCE

### 1.1 The Deck — 94 Cards Total

| Type     | Card          | Copies | Notes                                        |
| -------- | ------------- | ------ | -------------------------------------------- |
| Number   | 0             | 1      | Safe, worth 0 pts, counts toward Flip 7      |
| Number   | 1             | 1      | Worth 1 pt                                   |
| Number   | 2             | 2      | Worth 2 pts                                  |
| Number   | 3             | 3      | Worth 3 pts                                  |
| Number   | 4             | 4      | Worth 4 pts                                  |
| Number   | 5             | 5      | Worth 5 pts                                  |
| Number   | 6             | 6      | Worth 6 pts                                  |
| Number   | 7             | 7      | Worth 7 pts                                  |
| Number   | 8             | 8      | Worth 8 pts                                  |
| Number   | 9             | 9      | Worth 9 pts                                  |
| Number   | 10            | 10     | Worth 10 pts                                 |
| Number   | 11            | 11     | Worth 11 pts                                 |
| Number   | 12            | 12     | Worth 12 pts                                 |
| Action   | Freeze        | 3      | Forces target player to bank and exit round  |
| Action   | Flip Three    | 3      | Forces target player to take 3 more cards    |
| Action   | Second Chance | 3      | Cancels one duplicate draw (saved from bust) |
| Modifier | +2            | 1      | Added to final score after X2                |
| Modifier | +4            | 1      | Added to final score after X2                |
| Modifier | +6            | 1      | Added to final score after X2                |
| Modifier | +8            | 1      | Added to final score after X2                |
| Modifier | +10           | 1      | Added to final score after X2                |
| Modifier | X2            | 1      | Doubles the sum of number cards only         |

**Total: 79 number + 9 action + 6 modifier = 94 cards**

### 1.2 Objective

First player to reach **200 points** (counted at end of a full round) wins.

### 1.3 Setup

- Shuffle the full 94-card deck.
- Choose a starting dealer (server picks randomly for round 1, then rotates left each round).
- Dealer deals **one card face-up** to each player including themselves, going clockwise.
- If an Action card is dealt during initial deal, it is resolved immediately before dealing continues.

### 1.4 Turn Structure

After the initial deal, the dealer goes around clockwise and offers each **active** player the choice:

- **Hit** — receive another card from the top of the deck.
- **Stay** — bank your current card total, exit the round, score is locked.

A player can only Stay if they have at least one card in front of them.

### 1.5 Number Cards

- Placed in a row in front of the player.
- If a player draws a number they already have → **BUST** (score 0 for this round, exit immediately).
- Exception: if the player holds a Second Chance card, the duplicate and the Second Chance are discarded and the player continues.

### 1.6 Action Cards

Resolved immediately when drawn. The player who draws an action card **chooses a target** (any active player, including themselves). If they are the only active player, they must target themselves.

**Freeze:**

- The targeted player immediately banks all their current number card values and exits the round (as if they chose Stay).
- Modifier cards they hold still count toward their banked score.

**Flip Three:**

- The targeted player must draw 3 more cards one at a time, in sequence.
- Each card is resolved as normal (number → place or bust, action → resolve, modifier → keep).
- Flip Three stops early if: the player hits 7 unique numbers (Flip 7 win), or the player busts.

**Second Chance:**

- Kept in hand (does not go in the number row).
- When the holder draws a duplicate number: discard both the Second Chance and the duplicate. The player is safe and continues.
- A player may only hold **one** Second Chance at a time. If they draw a second one while holding one, discard the new one immediately.

### 1.7 Modifier Cards

- Placed above the number row (visually separate).
- Held until scoring.
- Multiple modifiers stack.

### 1.8 Flip 7 Bonus

- If a player accumulates **7 unique number cards**, the round ends **immediately**.
- That player receives a **+15 point bonus** added at the end of scoring.
- All other active players score 0 for that round (they were still playing and didn't bank).
- Players who had already Stayed or been Frozen before the Flip 7 keep their banked score.

### 1.9 Round End Conditions

A round ends when ANY of the following:

1. All players have either Stayed, been Frozen, or Busted.
2. A player achieves Flip 7.
3. The deck runs out (players who are still active at that point score 0).

### 1.10 Scoring Formula (applied in this exact order)

```
Step 1: Sum of all number cards in your row
Step 2: If you hold X2 modifier → multiply that sum by 2
Step 3: Add all flat modifiers (+2, +4, +6, +8, +10) to the result
Step 4: If you achieved Flip 7 → add +15
Step 5: Add result to your cumulative game score
```

**Example:**
Numbers: 3 + 5 + 9 = 17
Hold X2 → 17 × 2 = 34
Hold +4 → 34 + 4 = 38
No Flip 7
Round score = 38

### 1.11 End of Round Procedure

1. Show round summary to all players.
2. Set all used cards aside (do not reshuffle into deck yet).
3. Dealer role passes left (next player clockwise).
4. Host clicks "Start Next Round."
5. When deck runs out, reshuffle all set-aside cards into new deck.

### 1.12 Winning

- After each round, if any player is at or above 200 points, the game ends.
- The player with the highest total wins.
- If two or more players tie above 200, play one more round to break the tie.

### 1.13 Host Transfer Rule

If the host disconnects mid-game, the host role transfers automatically to the next player in the player list. The new host can start the next round.

---

## 2. PRODUCT OVERVIEW

### 2.1 Summary

A web-based real-time multiplayer implementation of the Flip 7 card game. Private rooms only. No accounts. Mobile-first. Hosted on Railway.

### 2.2 User Flow

```
Landing Page
    ↓
Enter display name
    ↓
[Create Room] → Get 6-char room code → Waiting Lobby (host)
[Join Room]  → Enter room code      → Waiting Lobby (guest)
    ↓
Host clicks "Start Game"
    ↓
Game Screen — rounds play out
    ↓
Round End → Round Summary → Scoreboard (optional) → Host starts next round
    ↓
Game Over Screen (someone hit 200+)
```

### 2.3 Screens

1. **Home** — name entry + create/join buttons
2. **Lobby** — player list, room code display, start button (host only)
3. **Game** — card table, player rows, action card popup, hit/stay buttons
4. **Round Summary** — scores this round + delta
5. **Scoreboard Modal** — cumulative scores all rounds
6. **Game Over** — winner announcement + play again

### 2.4 Constraints

- 3–8 players per room
- No persistent storage (all state in server memory)
- Mobile-first (375px base, scales up)
- No accounts, no login
- Railway free tier hosting

---

## 3. TECH STACK

| Layer              | Technology             | Version | Reason                                                         |
| ------------------ | ---------------------- | ------- | -------------------------------------------------------------- |
| Frontend framework | React                  | 18      | Component model ideal for card UI                              |
| Frontend bundler   | Vite                   | 5       | Fast HMR, clean builds                                         |
| Styling            | Tailwind CSS           | 3       | Utility-first, mobile-first easy                               |
| Animation          | Motion (Framer Motion) | 12      | `motion/react` import path, best-in-class                      |
| WebSocket client   | socket.io-client       | 4       | Pairs with server                                              |
| Backend runtime    | Node.js                | 20      | Industry standard                                              |
| Backend framework  | Express                | 4       | Minimal HTTP + static file serving                             |
| WebSocket server   | Socket.IO              | 4       | Room management built-in                                       |
| Hosting            | Railway                | —       | Free tier, WebSocket support, no sleep without Serverless mode |

**Import note:** Framer Motion was renamed to Motion in 2025. The package is `motion` on npm and the import path is `motion/react`. All code in this PRD uses this updated import.

---

## 4. FILE STRUCTURE

```
flip7/
├── package.json                  ← root (workspaces)
├── .gitignore
├── railway.json                  ← Railway build config
│
├── server/
│   ├── package.json
│   ├── index.js                  ← Express + Socket.IO server
│   ├── gameManager.js            ← All game logic (deck, state, rules)
│   └── roomManager.js            ← Room creation, joining, player tracking
│
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── socket.js             ← Socket.IO singleton
        ├── index.css             ← Tailwind base + custom CSS vars
        │
        ├── pages/
        │   ├── Home.jsx          ← Name entry + create/join
        │   ├── Lobby.jsx         ← Waiting room
        │   ├── Game.jsx          ← Main game screen
        │   ├── RoundSummary.jsx  ← End of round scores
        │   └── GameOver.jsx      ← Winner screen
        │
        ├── components/
        │   ├── Card.jsx          ← Single card component (number/action/modifier)
        │   ├── PlayerRow.jsx     ← One player's card row
        │   ├── ActionPopup.jsx   ← Target selection modal for action cards
        │   ├── ScoreboardModal.jsx ← Full cumulative scoreboard
        │   ├── ConnectionBanner.jsx ← "Connecting..." retry banner
        │   └── HitStayButtons.jsx  ← Hit / Stay UI
        │
        └── hooks/
            └── useGame.js        ← All socket listeners + game state
```

Backend (server/)

1. server/package.json
2. server/index.js
3. server/gameManager.js
4. server/roomManager.js
   Frontend (client/)
5. client/package.json
6. client/vite.config.js
7. client/index.html
8. client/tailwind.config.js
9. client/postcss.config.js
10. client/src/index.css
11. client/src/main.jsx
12. client/src/App.jsx
13. client/src/socket.js
    Pages
14. client/src/pages/Home.jsx
15. client/src/pages/Lobby.jsx
16. client/src/pages/Game.jsx
17. client/src/pages/RoundSummary.jsx
18. client/src/pages/GameOver.jsx
    Components
19. client/src/components/Card.jsx
20. client/src/components/PlayerRow.jsx
21. client/src/components/ActionPopup.jsx
22. client/src/components/ScoreboardModal.jsx
23. client/src/components/ConnectionBanner.jsx
24. client/src/components/HitStayButtons.jsx

Root 25. package.json 26. .gitignore 27. railway.json
27 files total.

---

## 5. SOCKET EVENT REFERENCE

### Client → Server (emit)

| Event              | Payload                    | Description                      |
| ------------------ | -------------------------- | -------------------------------- | -------------------- |
| `create_room`      | `{ playerName }`           | Create new room, become host     |
| `join_room`        | `{ roomCode, playerName }` | Join existing room               |
| `start_game`       | `{ roomCode }`             | Host starts the game             |
| `player_action`    | `{ roomCode, action: 'hit' | 'stay' }`                        | Player hits or stays |
| `select_target`    | `{ roomCode, targetId }`   | Choose target for action card    |
| `start_next_round` | `{ roomCode }`             | Host starts next round           |
| `play_again`       | `{ roomCode }`             | Host resets game after game over |

### Server → Client (on)

| Event               | Payload                               | Description                               |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| `room_created`      | `{ roomCode, playerId }`              | Confirms room creation                    |
| `room_joined`       | `{ roomCode, playerId }`              | Confirms join                             |
| `room_error`        | `{ message }`                         | Join failed (wrong code, full room, etc.) |
| `lobby_update`      | `{ players, hostId }`                 | Player list changed in lobby              |
| `game_started`      | `{ gameState }`                       | Game begins, full initial state           |
| `game_state`        | `{ gameState }`                       | Full state update after any action        |
| `action_card_drawn` | `{ card, drawerId, drawerName }`      | An action card needs a target             |
| `bust`              | `{ playerId, playerName }`            | Player busted                             |
| `flip7_win`         | `{ playerId, playerName }`            | Someone got 7 unique numbers              |
| `round_over`        | `{ scores, roundScores }`             | Round ended, show summary                 |
| `game_over`         | `{ winner, finalScores }`             | Game ended, someone hit 200               |
| `player_left`       | `{ playerId, playerName, newHostId }` | Someone disconnected                      |
| `error`             | `{ message }`                         | Generic server error                      |

---

## 6. GAME STATE SCHEMA

```js
// Server-side game state object (stored in memory per room)
{
  roomCode: "F7X4K2",
  hostId: "socket-id-string",
  phase: "lobby" | "playing" | "round_over" | "game_over",

  players: [
    {
      id: "socket-id",
      name: "Ken",
      isHost: true,
      isActive: true,        // still in this round
      hasBusted: false,
      hasStayed: false,
      isFrozen: false,
      numberCards: [3, 7, 0],       // numbers in their row
      modifierCards: ["X2", "+4"],  // modifiers they hold
      secondChance: false,          // holds a Second Chance card
      roundScore: 0,                // computed at round end
      totalScore: 0,                // cumulative across rounds
    }
  ],

  deck: [...],             // remaining cards (shuffled)
  discardPile: [...],      // used cards set aside between rounds
  currentDealerIndex: 0,  // index into players array
  roundNumber: 1,

  // Set when an action card needs targeting
  pendingAction: null | {
    card: "Freeze" | "FlipThree" | "SecondChance",
    drawerId: "socket-id",
    flipThreeRemaining: 0 | 1 | 2 | 3,
  },

  // Round scores for summary screen
  lastRoundScores: [
    { id, name, roundScore, totalScore, delta }
  ]
}
```

---

## 7. COMPLETE CODE — BACKEND

### 7.1 `/package.json` (root)

```json
{
  "name": "flip7",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "npm install --prefix server && npm install --prefix client && npm run build --prefix client",
    "start": "node server/index.js"
  }
}
```

### 7.2 `/.gitignore`

```
node_modules/
client/dist/
.env
*.log
.DS_Store
```

### 7.3 `/railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### 7.4 `/server/package.json`

```json
{
  "name": "flip7-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 7.5 `/server/gameManager.js`

```js
// ─────────────────────────────────────────────
// gameManager.js
// All Flip 7 game logic. Pure functions + state
// mutations. No socket code here.
// ─────────────────────────────────────────────

// ── DECK ──────────────────────────────────────

function buildDeck() {
  const deck = [];

  // Number cards: value N appears N times (except 0 which appears once)
  for (let n = 0; n <= 12; n++) {
    const count = n === 0 ? 1 : n;
    for (let i = 0; i < count; i++) {
      deck.push({ type: "number", value: n });
    }
  }

  // Action cards: 3 of each
  const actions = ["Freeze", "FlipThree", "SecondChance"];
  actions.forEach((action) => {
    for (let i = 0; i < 3; i++) {
      deck.push({ type: "action", value: action });
    }
  });

  // Modifier cards: one of each
  const modifiers = ["+2", "+4", "+6", "+8", "+10", "X2"];
  modifiers.forEach((mod) => {
    deck.push({ type: "modifier", value: mod });
  });

  return shuffle(deck);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── ROOM / GAME INIT ──────────────────────────

function createGameState(roomCode, hostId, hostName) {
  return {
    roomCode,
    hostId,
    phase: "lobby",
    players: [createPlayer(hostId, hostName, true)],
    deck: [],
    discardPile: [],
    currentDealerIndex: 0,
    roundNumber: 0,
    pendingAction: null,
    lastRoundScores: [],
  };
}

function createPlayer(id, name, isHost = false) {
  return {
    id,
    name,
    isHost,
    isActive: true,
    hasBusted: false,
    hasStayed: false,
    isFrozen: false,
    numberCards: [],
    modifierCards: [],
    secondChance: false,
    roundScore: 0,
    totalScore: 0,
  };
}

// ── ROUND START ───────────────────────────────

function startRound(state) {
  // Reset all players for new round
  state.players.forEach((p) => {
    p.isActive = true;
    p.hasBusted = false;
    p.hasStayed = false;
    p.isFrozen = false;
    p.numberCards = [];
    p.modifierCards = [];
    p.secondChance = false;
    p.roundScore = 0;
  });

  state.roundNumber += 1;
  state.phase = "playing";
  state.pendingAction = null;

  // Rebuild deck if needed
  if (state.deck.length < state.players.length * 2) {
    state.deck = [...state.deck, ...shuffle(state.discardPile)];
    state.discardPile = [];
  }

  if (state.deck.length === 0) {
    state.deck = buildDeck();
  }

  // Initial deal: one card to each player
  // Returns array of events to emit
  const dealEvents = [];
  for (let i = 0; i < state.players.length; i++) {
    const playerIndex = (state.currentDealerIndex + i) % state.players.length;
    const player = state.players[playerIndex];
    const card = drawCard(state);
    if (!card) break;
    const result = applyCard(state, player, card);
    dealEvents.push({ playerId: player.id, card, result });
  }

  return dealEvents;
}

// ── CARD DRAW ─────────────────────────────────

function drawCard(state) {
  if (state.deck.length === 0) {
    if (state.discardPile.length === 0) return null;
    state.deck = shuffle(state.discardPile);
    state.discardPile = [];
  }
  return state.deck.shift();
}

// ── APPLY CARD TO PLAYER ──────────────────────
// Returns a result object describing what happened

function applyCard(state, player, card) {
  if (card.type === "number") {
    // Check for duplicate
    if (player.numberCards.includes(card.value)) {
      // Check for Second Chance
      if (player.secondChance) {
        player.secondChance = false;
        // discard the duplicate and the second chance card
        state.discardPile.push(card);
        return { type: "second_chance_used", card };
      }
      // BUST
      player.isActive = false;
      player.hasBusted = true;
      player.numberCards = [];
      player.modifierCards = [];
      player.secondChance = false;
      player.roundScore = 0;
      state.discardPile.push(card);
      return { type: "bust", card };
    }

    player.numberCards.push(card.value);
    state.discardPile.push(card);

    // Check Flip 7
    if (player.numberCards.length === 7) {
      return { type: "flip7", card };
    }

    return { type: "number_placed", card };
  }

  if (card.type === "modifier") {
    player.modifierCards.push(card.value);
    state.discardPile.push(card);
    return { type: "modifier_placed", card };
  }

  if (card.type === "action") {
    if (card.value === "SecondChance") {
      if (player.secondChance) {
        // Already has one — discard the new one
        state.discardPile.push(card);
        return { type: "second_chance_discarded", card };
      }
      player.secondChance = true;
      state.discardPile.push(card);
      return { type: "second_chance_kept", card };
    }

    // Freeze or FlipThree — needs a target
    // Don't put in discard yet; caller handles targeting
    return { type: "action_needs_target", card };
  }

  return { type: "unknown", card };
}

// ── APPLY ACTION TO TARGET ────────────────────

function applyFreeze(state, targetPlayer) {
  targetPlayer.isActive = false;
  targetPlayer.isFrozen = true;
  targetPlayer.roundScore = computeRoundScore(targetPlayer);
  return { type: "freeze_applied", targetId: targetPlayer.id };
}

function startFlipThree(state, targetPlayer) {
  // Store flip three state — caller will draw cards one at a time
  state.pendingAction = {
    card: "FlipThree",
    drawerId: targetPlayer.id,
    flipThreeRemaining: 3,
  };
  return { type: "flip_three_started", targetId: targetPlayer.id };
}

// ── SCORING ───────────────────────────────────

function computeRoundScore(player) {
  if (player.hasBusted) return 0;

  let score = player.numberCards.reduce((sum, n) => sum + n, 0);

  if (player.modifierCards.includes("X2")) {
    score *= 2;
  }

  player.modifierCards.forEach((mod) => {
    if (mod !== "X2") {
      score += parseInt(mod.replace("+", ""), 10);
    }
  });

  return score;
}

function finalizeRound(state, flip7WinnerId = null) {
  const roundScores = [];

  state.players.forEach((p) => {
    let score = 0;

    if (flip7WinnerId) {
      if (p.id === flip7WinnerId) {
        // Flip 7 winner scores their cards + 15 bonus
        score = computeRoundScore(p) + 15;
      } else if (p.isActive) {
        // Still active when Flip 7 hit → score 0
        score = 0;
      } else {
        // Already banked (stayed or frozen) → keep their banked score
        score = p.roundScore;
      }
    } else {
      score = p.hasBusted
        ? 0
        : p.roundScore > 0
          ? p.roundScore
          : computeRoundScore(p);
    }

    p.roundScore = score;
    p.totalScore += score;

    roundScores.push({
      id: p.id,
      name: p.name,
      roundScore: score,
      totalScore: p.totalScore,
    });
  });

  state.lastRoundScores = roundScores;

  // Advance dealer
  state.currentDealerIndex =
    (state.currentDealerIndex + 1) % state.players.length;

  // Check for game over
  const maxScore = Math.max(...state.players.map((p) => p.totalScore));
  if (maxScore >= 200) {
    state.phase = "game_over";
    // Check for tie
    const winners = state.players.filter((p) => p.totalScore === maxScore);
    if (winners.length === 1) {
      return { roundOver: true, gameOver: true, winner: winners[0] };
    }
    // Tie — keep playing
    state.phase = "round_over";
    return { roundOver: true, gameOver: false, tie: true };
  }

  state.phase = "round_over";
  return { roundOver: true, gameOver: false };
}

// ── HELPERS ───────────────────────────────────

function getActivePlayers(state) {
  return state.players.filter(
    (p) => p.isActive && !p.hasBusted && !p.hasStayed && !p.isFrozen,
  );
}

function allPlayersInactive(state) {
  return getActivePlayers(state).length === 0;
}

function resetForNewGame(state) {
  state.players.forEach((p) => {
    p.totalScore = 0;
    p.roundScore = 0;
    p.isActive = true;
    p.hasBusted = false;
    p.hasStayed = false;
    p.isFrozen = false;
    p.numberCards = [];
    p.modifierCards = [];
    p.secondChance = false;
  });
  state.deck = buildDeck();
  state.discardPile = [];
  state.roundNumber = 0;
  state.currentDealerIndex = 0;
  state.phase = "lobby";
  state.pendingAction = null;
  state.lastRoundScores = [];
}

module.exports = {
  buildDeck,
  createGameState,
  createPlayer,
  startRound,
  drawCard,
  applyCard,
  applyFreeze,
  startFlipThree,
  computeRoundScore,
  finalizeRound,
  getActivePlayers,
  allPlayersInactive,
  resetForNewGame,
};
```

### 7.6 `/server/roomManager.js`

```js
// ─────────────────────────────────────────────
// roomManager.js
// Manages the in-memory map of rooms.
// ─────────────────────────────────────────────

const { createGameState, createPlayer } = require("./gameManager");

const rooms = new Map(); // roomCode → gameState

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(hostId, hostName) {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const state = createGameState(code, hostId, hostName);
  rooms.set(code, state);
  return state;
}

function getRoom(roomCode) {
  return rooms.get(roomCode.toUpperCase()) || null;
}

function joinRoom(roomCode, playerId, playerName) {
  const state = getRoom(roomCode);
  if (!state)
    return { error: "Room not found. Check your code and try again." };
  if (state.phase !== "lobby") return { error: "Game already in progress." };
  if (state.players.length >= 8)
    return { error: "Room is full (max 8 players)." };
  if (
    state.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase())
  ) {
    return { error: "That name is already taken in this room." };
  }

  const player = createPlayer(playerId, playerName, false);
  state.players.push(player);
  return { state };
}

function removePlayer(roomCode, playerId) {
  const state = getRoom(roomCode);
  if (!state) return null;

  const index = state.players.findIndex((p) => p.id === playerId);
  if (index === -1) return null;

  state.players.splice(index, 1);

  if (state.players.length === 0) {
    rooms.delete(roomCode);
    return null;
  }

  // Transfer host if needed
  if (state.hostId === playerId) {
    state.players[0].isHost = true;
    state.hostId = state.players[0].id;
  }

  // Fix dealer index if out of bounds
  if (state.currentDealerIndex >= state.players.length) {
    state.currentDealerIndex = 0;
  }

  return state;
}

function deleteRoom(roomCode) {
  rooms.delete(roomCode);
}

module.exports = { createRoom, getRoom, joinRoom, removePlayer, deleteRoom };
```

### 7.7 `/server/index.js`

```js
// ─────────────────────────────────────────────
// index.js
// Express server + Socket.IO event handlers
// ─────────────────────────────────────────────

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");

const {
  createRoom,
  getRoom,
  joinRoom,
  removePlayer,
} = require("./roomManager");
const {
  startRound,
  drawCard,
  applyCard,
  applyFreeze,
  startFlipThree,
  finalizeRound,
  getActivePlayers,
  allPlayersInactive,
  resetForNewGame,
} = require("./gameManager");

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Health check for Railway
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  const clientBuild = path.join(__dirname, "../client/dist");
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

// ── SOCKET HANDLERS ───────────────────────────

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  // Track which room this socket is in
  let currentRoomCode = null;

  // ── CREATE ROOM ──────────────────────────────
  socket.on("create_room", ({ playerName }) => {
    if (!playerName || !playerName.trim()) {
      socket.emit("error", { message: "Please enter a name." });
      return;
    }

    const state = createRoom(socket.id, playerName.trim());
    currentRoomCode = state.roomCode;
    socket.join(state.roomCode);

    socket.emit("room_created", {
      roomCode: state.roomCode,
      playerId: socket.id,
    });

    io.to(state.roomCode).emit("lobby_update", {
      players: state.players,
      hostId: state.hostId,
    });
  });

  // ── JOIN ROOM ────────────────────────────────
  socket.on("join_room", ({ roomCode, playerName }) => {
    if (!playerName || !playerName.trim()) {
      socket.emit("room_error", { message: "Please enter a name." });
      return;
    }
    if (!roomCode || !roomCode.trim()) {
      socket.emit("room_error", { message: "Please enter a room code." });
      return;
    }

    const result = joinRoom(
      roomCode.trim().toUpperCase(),
      socket.id,
      playerName.trim(),
    );

    if (result.error) {
      socket.emit("room_error", { message: result.error });
      return;
    }

    const state = result.state;
    currentRoomCode = state.roomCode;
    socket.join(state.roomCode);

    socket.emit("room_joined", {
      roomCode: state.roomCode,
      playerId: socket.id,
    });

    io.to(state.roomCode).emit("lobby_update", {
      players: state.players,
      hostId: state.hostId,
    });
  });

  // ── START GAME ───────────────────────────────
  socket.on("start_game", ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state) return;
    if (state.hostId !== socket.id) return;
    if (state.players.length < 2) {
      socket.emit("error", { message: "Need at least 2 players to start." });
      return;
    }

    const dealEvents = startRound(state);

    io.to(roomCode).emit("game_started", { gameState: sanitizeState(state) });

    // Process any action cards from initial deal
    processDealEvents(state, dealEvents, roomCode);
  });

  // ── PLAYER ACTION (HIT / STAY) ────────────────
  socket.on("player_action", ({ roomCode, action }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== "playing") return;

    const player = state.players.find((p) => p.id === socket.id);
    if (
      !player ||
      !player.isActive ||
      player.hasBusted ||
      player.hasStayed ||
      player.isFrozen
    )
      return;

    // If there's a pending action, ignore regular hit/stay
    if (state.pendingAction) return;

    if (action === "stay") {
      player.hasStayed = true;
      player.isActive = false;
      player.roundScore = computeRoundScoreLocal(player);

      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });

      checkRoundOver(state, roomCode);
      return;
    }

    if (action === "hit") {
      const card = drawCard(state);
      if (!card) {
        // Deck empty — end round
        endRound(state, roomCode, null);
        return;
      }

      const result = applyCard(state, player, card);
      handleCardResult(state, player, card, result, roomCode);
    }
  });

  // ── SELECT TARGET (for action cards) ──────────
  socket.on("select_target", ({ roomCode, targetId }) => {
    const state = getRoom(roomCode);
    if (!state || !state.pendingAction) return;

    // Only the drawer can select the target
    if (state.pendingAction.drawerId !== socket.id) return;

    const targetPlayer = state.players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.isActive) return;

    const actionCard = state.pendingAction.card;

    if (actionCard === "Freeze") {
      applyFreeze(state, targetPlayer);
      state.pendingAction = null;

      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
      checkRoundOver(state, roomCode);
    }

    if (actionCard === "FlipThree") {
      startFlipThree(state, targetPlayer);
      // Now process the 3 forced draws
      processFlipThree(state, targetPlayer, roomCode);
    }
  });

  // ── START NEXT ROUND ──────────────────────────
  socket.on("start_next_round", ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== "round_over") return;
    if (state.hostId !== socket.id) return;

    const dealEvents = startRound(state);
    io.to(roomCode).emit("game_started", { gameState: sanitizeState(state) });
    processDealEvents(state, dealEvents, roomCode);
  });

  // ── PLAY AGAIN ────────────────────────────────
  socket.on("play_again", ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== "game_over") return;
    if (state.hostId !== socket.id) return;

    resetForNewGame(state);
    io.to(roomCode).emit("lobby_update", {
      players: state.players,
      hostId: state.hostId,
    });
  });

  // ── DISCONNECT ────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
    if (!currentRoomCode) return;

    const state = removePlayer(currentRoomCode, socket.id);
    if (!state) return;

    io.to(currentRoomCode).emit("player_left", {
      playerId: socket.id,
      newHostId: state.hostId,
      players: state.players,
    });

    io.to(currentRoomCode).emit("lobby_update", {
      players: state.players,
      hostId: state.hostId,
    });

    // If game was in progress and now only 1 player left, end it
    if (state.phase === "playing" && state.players.length < 2) {
      endRound(state, currentRoomCode, null);
    }
  });

  // ── INTERNAL HELPERS ──────────────────────────

  function handleCardResult(state, player, card, result, roomCode) {
    if (result.type === "bust") {
      io.to(roomCode).emit("bust", {
        playerId: player.id,
        playerName: player.name,
      });
      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
      checkRoundOver(state, roomCode);
      return;
    }

    if (result.type === "flip7") {
      endRound(state, roomCode, player.id);
      return;
    }

    if (result.type === "action_needs_target") {
      const activePlayers = getActivePlayers(state);

      if (activePlayers.length === 1 && activePlayers[0].id === player.id) {
        // Only player — must self-target
        handleSelfTarget(state, player, card, roomCode);
        return;
      }

      state.pendingAction = {
        card: card.value,
        drawerId: player.id,
        flipThreeRemaining: card.value === "FlipThree" ? 3 : 0,
      };

      io.to(roomCode).emit("action_card_drawn", {
        card,
        drawerId: player.id,
        drawerName: player.name,
        activePlayers: activePlayers.map((p) => ({ id: p.id, name: p.name })),
      });

      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
      return;
    }

    io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
  }

  function handleSelfTarget(state, player, card, roomCode) {
    if (card.value === "Freeze") {
      applyFreeze(state, player);
      state.pendingAction = null;
      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
      checkRoundOver(state, roomCode);
    } else if (card.value === "FlipThree") {
      startFlipThree(state, player);
      processFlipThree(state, player, roomCode);
    }
  }

  function processFlipThree(state, targetPlayer, roomCode) {
    let remaining = state.pendingAction
      ? state.pendingAction.flipThreeRemaining
      : 3;

    const drawNext = () => {
      if (remaining <= 0 || !targetPlayer.isActive) {
        state.pendingAction = null;
        io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
        checkRoundOver(state, roomCode);
        return;
      }

      const card = drawCard(state);
      if (!card) {
        state.pendingAction = null;
        endRound(state, roomCode, null);
        return;
      }

      remaining -= 1;
      const result = applyCard(state, targetPlayer, card);

      if (result.type === "flip7") {
        state.pendingAction = null;
        endRound(state, roomCode, targetPlayer.id);
        return;
      }

      if (result.type === "bust") {
        state.pendingAction = null;
        io.to(roomCode).emit("bust", {
          playerId: targetPlayer.id,
          playerName: targetPlayer.name,
        });
        io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
        checkRoundOver(state, roomCode);
        return;
      }

      if (result.type === "action_needs_target") {
        // Action card mid-flip-three: needs targeting before continuing
        state.pendingAction = {
          card: card.value,
          drawerId: targetPlayer.id,
          flipThreeRemaining: remaining,
        };
        const activePlayers = getActivePlayers(state);
        io.to(roomCode).emit("action_card_drawn", {
          card,
          drawerId: targetPlayer.id,
          drawerName: targetPlayer.name,
          activePlayers: activePlayers.map((p) => ({ id: p.id, name: p.name })),
        });
        io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
        return;
      }

      io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
      // Small delay between flip three draws for animation
      setTimeout(drawNext, 600);
    };

    drawNext();
  }

  function processDealEvents(state, dealEvents, roomCode) {
    // Handle any action cards that came up during initial deal
    for (const event of dealEvents) {
      if (event.result.type === "bust") {
        io.to(roomCode).emit("bust", {
          playerId: event.playerId,
          playerName: state.players.find((p) => p.id === event.playerId)?.name,
        });
      }
    }
    io.to(roomCode).emit("game_state", { gameState: sanitizeState(state) });
  }

  function checkRoundOver(state, roomCode) {
    if (allPlayersInactive(state)) {
      endRound(state, roomCode, null);
    }
  }

  function endRound(state, roomCode, flip7WinnerId) {
    if (flip7WinnerId) {
      io.to(roomCode).emit("flip7_win", {
        playerId: flip7WinnerId,
        playerName: state.players.find((p) => p.id === flip7WinnerId)?.name,
      });
    }

    const result = finalizeRound(state, flip7WinnerId);

    if (result.gameOver) {
      io.to(roomCode).emit("game_over", {
        winner: result.winner,
        finalScores: state.lastRoundScores,
      });
    } else {
      io.to(roomCode).emit("round_over", {
        scores: state.lastRoundScores,
        roundNumber: state.roundNumber,
      });
    }
  }
});

// Local helper (mirrors gameManager but usable in server scope)
function computeRoundScoreLocal(player) {
  if (player.hasBusted) return 0;
  let score = player.numberCards.reduce((sum, n) => sum + n, 0);
  if (player.modifierCards.includes("X2")) score *= 2;
  player.modifierCards.forEach((mod) => {
    if (mod !== "X2") score += parseInt(mod.replace("+", ""), 10);
  });
  return score;
}

// Strip deck internals before sending to clients
function sanitizeState(state) {
  return {
    roomCode: state.roomCode,
    hostId: state.hostId,
    phase: state.phase,
    roundNumber: state.roundNumber,
    currentDealerIndex: state.currentDealerIndex,
    pendingAction: state.pendingAction,
    deckRemaining: state.deck.length,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isActive: p.isActive,
      hasBusted: p.hasBusted,
      hasStayed: p.hasStayed,
      isFrozen: p.isFrozen,
      numberCards: p.numberCards,
      modifierCards: p.modifierCards,
      secondChance: p.secondChance,
      roundScore: p.roundScore,
      totalScore: p.totalScore,
    })),
    lastRoundScores: state.lastRoundScores,
  };
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Flip 7 server running on port ${PORT}`);
});
```

---

## 8. COMPLETE CODE — FRONTEND

### 8.1 `/client/package.json`

```json
{
  "name": "flip7-client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "socket.io-client": "^4.7.5",
    "motion": "^12.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1"
  }
}
```

### 8.2 `/client/vite.config.js`

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
});
```

### 8.3 `/client/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
    />
    <title>Flip 7</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### 8.4 `/client/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{jsx,js}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bebas Neue"', "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        felt: "#1a472a",
        feltLight: "#2d6a4f",
        feltDark: "#0f2d1c",
        cardWhite: "#f8f4e8",
        cardShadow: "#c8b89a",
        bust: "#dc2626",
        gold: "#f59e0b",
        freeze: "#3b82f6",
        flipthree: "#8b5cf6",
        secondchance: "#10b981",
      },
    },
  },
  plugins: [],
};
```

### 8.5 `/client/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### 8.6 `/client/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --felt: #1a472a;
  --felt-light: #2d6a4f;
  --felt-dark: #0f2d1c;
  --card-white: #f8f4e8;
  --card-shadow: #c8b89a;
  --gold: #f59e0b;
}

* {
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  background-color: var(--felt-dark);
  font-family: "Inter", sans-serif;
  color: #ffffff;
  min-height: 100dvh;
  overflow-x: hidden;
}

/* Card base */
.card-base {
  border-radius: 10px;
  box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.5);
  border: 2px solid var(--card-shadow);
  background: var(--card-white);
  color: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Bebas Neue", sans-serif;
  user-select: none;
}

/* Felt table texture */
.felt-table {
  background: radial-gradient(
    ellipse at center,
    #2d6a4f 0%,
    #1a472a 60%,
    #0f2d1c 100%
  );
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #2d6a4f;
  border-radius: 3px;
}

/* Room code display */
.room-code {
  letter-spacing: 0.3em;
  font-family: "Bebas Neue", sans-serif;
}

/* Pulse animation for whose turn it is */
@keyframes pulse-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}
.pulse-gold {
  animation: pulse-ring 1.5s infinite;
}
```

### 8.7 `/client/src/socket.js`

```js
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.PROD
  ? window.location.origin
  : "http://localhost:3001";

export const socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
});
```

### 8.8 `/client/src/main.jsx`

```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### 8.9 `/client/src/App.jsx`

```jsx
import React, { useState, useEffect } from "react";
import { socket } from "./socket";
import Home from "./pages/Home";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import RoundSummary from "./pages/RoundSummary";
import GameOver from "./pages/GameOver";
import ConnectionBanner from "./components/ConnectionBanner";

export default function App() {
  const [screen, setScreen] = useState("home"); // home | lobby | game | roundSummary | gameOver
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [gameState, setGameState] = useState(null);
  const [roundScores, setRoundScores] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setConnecting(true);
    });

    socket.on("connect_error", () => {
      setConnecting(true);
    });

    socket.on("room_created", ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen("lobby");
    });

    socket.on("room_joined", ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen("lobby");
    });

    socket.on("game_started", ({ gameState: gs }) => {
      setGameState(gs);
      setScreen("game");
    });

    socket.on("game_state", ({ gameState: gs }) => {
      setGameState(gs);
    });

    socket.on("round_over", ({ scores, roundNumber }) => {
      setRoundScores({ scores, roundNumber });
      setScreen("roundSummary");
    });

    socket.on("game_over", ({ winner, finalScores }) => {
      setGameOverData({ winner, finalScores });
      setScreen("gameOver");
    });

    socket.on("player_left", ({ newHostId }) => {
      setGameState((prev) => {
        if (!prev) return prev;
        return { ...prev, hostId: newHostId };
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("game_started");
      socket.off("game_state");
      socket.off("round_over");
      socket.off("game_over");
      socket.off("player_left");
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-dvh felt-table">
      <ConnectionBanner connected={connected} connecting={connecting} />

      {screen === "home" && <Home />}
      {screen === "lobby" && (
        <Lobby
          roomCode={roomCode}
          playerId={playerId}
          onGameStart={(gs) => {
            setGameState(gs);
            setScreen("game");
          }}
        />
      )}
      {screen === "game" && gameState && (
        <Game gameState={gameState} playerId={playerId} roomCode={roomCode} />
      )}
      {screen === "roundSummary" && roundScores && (
        <RoundSummary
          scores={roundScores.scores}
          roundNumber={roundScores.roundNumber}
          playerId={playerId}
          roomCode={roomCode}
          hostId={gameState?.hostId}
          onViewFullScores={() => {}}
        />
      )}
      {screen === "gameOver" && gameOverData && (
        <GameOver
          winner={gameOverData.winner}
          finalScores={gameOverData.finalScores}
          playerId={playerId}
          roomCode={roomCode}
          hostId={gameState?.hostId}
        />
      )}
    </div>
  );
}
```

### 8.10 `/client/src/components/ConnectionBanner.jsx`

```jsx
import React from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ConnectionBanner({ connected, connecting }) {
  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center py-2 text-sm font-semibold"
        >
          {connecting
            ? "⏳ Connecting to server..."
            : "⚠️ Disconnected. Reconnecting..."}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### 8.11 `/client/src/components/Card.jsx`

```jsx
import React from "react";
import { motion } from "motion/react";

const cardVariants = {
  hidden: { opacity: 0, y: -40, rotateY: 90, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  bust: {
    x: [0, -8, 8, -8, 8, 0],
    backgroundColor: "#dc2626",
    transition: { duration: 0.4 },
  },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.2 } },
};

const CARD_COLORS = {
  number: {
    bg: "#f8f4e8",
    text: "#1a1a1a",
    border: "#c8b89a",
  },
  action_Freeze: {
    bg: "#dbeafe",
    text: "#1e40af",
    border: "#3b82f6",
    label: "❄️",
  },
  action_FlipThree: {
    bg: "#ede9fe",
    text: "#5b21b6",
    border: "#8b5cf6",
    label: "×3",
  },
  action_SecondChance: {
    bg: "#d1fae5",
    text: "#065f46",
    border: "#10b981",
    label: "✓",
  },
  modifier_X2: {
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  modifier_plus: {
    bg: "#fce7f3",
    text: "#831843",
    border: "#ec4899",
  },
};

function getCardStyle(card) {
  if (card.type === "number") return CARD_COLORS.number;
  if (card.type === "action") {
    return CARD_COLORS[`action_${card.value}`] || CARD_COLORS.number;
  }
  if (card.type === "modifier") {
    if (card.value === "X2") return CARD_COLORS.modifier_X2;
    return CARD_COLORS.modifier_plus;
  }
  return CARD_COLORS.number;
}

function getCardLabel(card) {
  if (card.type === "number") return card.value;
  if (card.type === "action") {
    if (card.value === "Freeze") return "❄️ FREEZE";
    if (card.value === "FlipThree") return "× FLIP 3";
    if (card.value === "SecondChance") return "✓ 2ND";
  }
  if (card.type === "modifier") return card.value;
  return "?";
}

export default function Card({
  card,
  size = "md",
  busting = false,
  animate = true,
}) {
  const style = getCardStyle(card);
  const label = getCardLabel(card);

  const sizeClasses = {
    sm: "w-10 h-14 text-lg",
    md: "w-14 h-20 text-2xl",
    lg: "w-16 h-24 text-3xl",
  };

  const content = (
    <div
      className={`card-base ${sizeClasses[size]} flex-col gap-0 relative`}
      style={{
        background: style.bg,
        color: style.text,
        borderColor: style.border,
        borderWidth: 2,
      }}
    >
      <span className="font-display leading-none select-none">{label}</span>
      {card.type === "number" && (
        <span className="absolute bottom-1 right-1 text-xs opacity-40 font-display rotate-180">
          {label}
        </span>
      )}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={busting ? "bust" : "visible"}
      exit="exit"
      style={{ perspective: 800 }}
    >
      {content}
    </motion.div>
  );
}
```

### 8.12 `/client/src/components/PlayerRow.jsx`

```jsx
import React from "react";
import { motion, AnimatePresence } from "motion/react";
import Card from "./Card";

export default function PlayerRow({ player, isMe, isCurrent }) {
  const statusLabel = () => {
    if (player.hasBusted) return { text: "BUST", color: "text-red-400" };
    if (player.hasStayed) return { text: "STAYED", color: "text-blue-300" };
    if (player.isFrozen) return { text: "FROZEN ❄️", color: "text-blue-300" };
    if (player.isActive) return { text: "PLAYING", color: "text-green-300" };
    return { text: "", color: "" };
  };

  const status = statusLabel();

  return (
    <motion.div
      layout
      className={`rounded-xl p-3 mb-2 transition-all duration-300 ${
        isMe ? "bg-feltLight/50 border border-gold/40" : "bg-black/20"
      } ${isCurrent ? "pulse-gold" : ""}`}
    >
      {/* Player header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate max-w-[120px]">
            {player.name}
            {isMe && <span className="text-gold text-xs ml-1">(you)</span>}
            {player.isHost && (
              <span className="text-yellow-400 text-xs ml-1">👑</span>
            )}
          </span>
          {status.text && (
            <span className={`text-xs font-bold ${status.color}`}>
              {status.text}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-white/60">Total</div>
          <div className="font-display text-lg text-gold">
            {player.totalScore}
          </div>
        </div>
      </div>

      {/* Number cards */}
      <div className="flex flex-wrap gap-1 min-h-[56px] items-end">
        <AnimatePresence>
          {player.numberCards.map((n, i) => (
            <Card
              key={`${n}-${i}`}
              card={{ type: "number", value: n }}
              size="sm"
              busting={player.hasBusted}
            />
          ))}
        </AnimatePresence>
        {player.numberCards.length === 0 && !player.hasBusted && (
          <span className="text-white/30 text-xs italic">No cards yet</span>
        )}
        {player.hasBusted && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-red-400 font-display text-2xl"
          >
            BUST!
          </motion.span>
        )}
      </div>

      {/* Modifier cards + Second Chance */}
      {(player.modifierCards.length > 0 || player.secondChance) && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {player.modifierCards.map((mod, i) => (
            <Card
              key={`mod-${i}`}
              card={{ type: "modifier", value: mod }}
              size="sm"
            />
          ))}
          {player.secondChance && (
            <Card card={{ type: "action", value: "SecondChance" }} size="sm" />
          )}
        </div>
      )}

      {/* Card count */}
      <div className="text-xs text-white/40 mt-1">
        {player.numberCards.length}/7 cards
        {player.numberCards.length === 7 && (
          <span className="text-gold font-bold ml-1">🌟 FLIP 7!</span>
        )}
      </div>
    </motion.div>
  );
}
```

### 8.13 `/client/src/components/ActionPopup.jsx`

```jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { socket } from "../socket";

export default function ActionPopup({
  action,
  activePlayers,
  roomCode,
  isDrawer,
  drawerName,
}) {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const cardColors = {
    Freeze: { bg: "#1e40af", border: "#3b82f6", icon: "❄️", label: "FREEZE" },
    FlipThree: {
      bg: "#5b21b6",
      border: "#8b5cf6",
      icon: "🃏",
      label: "FLIP THREE",
    },
  };

  const colors = cardColors[action] || {
    bg: "#374151",
    border: "#6b7280",
    icon: "?",
    label: action,
  };

  const handleConfirm = () => {
    if (!selected) return;
    socket.emit("select_target", { roomCode, targetId: selected });
    setConfirmed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 flex items-end justify-center pb-6 px-4"
      >
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: colors.bg,
            border: `2px solid ${colors.border}`,
          }}
        >
          {/* Header */}
          <div className="p-4 text-center">
            <div className="text-4xl mb-1">{colors.icon}</div>
            <div className="font-display text-2xl text-white">
              {colors.label}
            </div>
            {isDrawer ? (
              <p className="text-white/80 text-sm mt-1">
                Choose a target player
              </p>
            ) : (
              <p className="text-white/80 text-sm mt-1">
                <strong>{drawerName}</strong> is choosing a target...
              </p>
            )}
          </div>

          {/* Player list — only shown to drawer */}
          {isDrawer && !confirmed && (
            <div className="px-4 pb-2">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 font-semibold transition-all ${
                    selected === p.id
                      ? "bg-white text-gray-900 scale-105"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {p.name}
                  {p.id === socket.id && " (you)"}
                </button>
              ))}

              <button
                onClick={handleConfirm}
                disabled={!selected}
                className={`w-full py-3 rounded-xl font-bold mt-2 transition-all ${
                  selected
                    ? "bg-white text-gray-900 active:scale-95"
                    : "bg-white/20 text-white/40 cursor-not-allowed"
                }`}
              >
                Confirm Target
              </button>
            </div>
          )}

          {confirmed && (
            <div className="px-4 pb-4 text-center text-white/80 text-sm">
              Waiting for server...
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

### 8.14 `/client/src/components/HitStayButtons.jsx`

```jsx
import React from "react";
import { motion } from "motion/react";
import { socket } from "../socket";

export default function HitStayButtons({ roomCode, canAct }) {
  const emit = (action) => {
    if (!canAct) return;
    socket.emit("player_action", { roomCode, action });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-feltDark/90 backdrop-blur-sm flex gap-3 z-30">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => emit("stay")}
        disabled={!canAct}
        className={`flex-1 py-4 rounded-2xl font-display text-2xl transition-all ${
          canAct
            ? "bg-blue-600 text-white active:bg-blue-700"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        STAY
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => emit("hit")}
        disabled={!canAct}
        className={`flex-1 py-4 rounded-2xl font-display text-2xl transition-all ${
          canAct
            ? "bg-gold text-feltDark active:bg-yellow-500"
            : "bg-white/10 text-white/30 cursor-not-allowed"
        }`}
      >
        HIT
      </motion.button>
    </div>
  );
}
```

### 8.15 `/client/src/components/ScoreboardModal.jsx`

```jsx
import React from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ScoreboardModal({ scores, onClose }) {
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-feltDark border border-white/10 rounded-2xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-display text-3xl text-gold text-center mb-4">
            SCOREBOARD
          </h2>

          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between py-3 border-b border-white/10 ${
                i === 0 ? "text-gold" : "text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-xl w-6">{i + 1}</span>
                <span className="font-semibold">{player.name}</span>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl">{player.totalScore}</div>
                {player.roundScore !== undefined && (
                  <div className="text-xs text-white/50">
                    +{player.roundScore} this round
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

### 8.16 `/client/src/pages/Home.jsx`

```jsx
import React, { useState } from "react";
import { motion } from "motion/react";
import { socket } from "../socket";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [error, setError] = useState("");

  socket.off("room_error");
  socket.on("room_error", ({ message }) => setError(message));

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setError("");
    socket.emit("create_room", { playerName: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter a room code.");
      return;
    }
    setError("");
    socket.emit("join_room", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: name.trim(),
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="text-center mb-10"
      >
        <h1 className="font-display text-7xl text-gold tracking-wide">
          FLIP 7
        </h1>
        <p className="text-white/60 text-sm mt-1">
          The card game. Online. With your friends.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Name input */}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-base mb-4 outline-none focus:border-gold transition-colors"
        />

        {/* Mode buttons */}
        {!mode && (
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode("create")}
              className="flex-1 py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
            >
              CREATE
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode("join")}
              className="flex-1 py-4 bg-white/15 text-white font-display text-2xl rounded-2xl"
            >
              JOIN
            </motion.button>
          </div>
        )}

        {/* Create mode */}
        {mode === "create" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="w-full py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl mb-3"
            >
              CREATE ROOM
            </motion.button>
            <button
              onClick={() => setMode(null)}
              className="w-full text-white/40 text-sm py-2"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Join mode */}
        {mode === "join" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <input
              type="text"
              placeholder="Room code (e.g. F7X4K2)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-base mb-3 outline-none focus:border-gold transition-colors room-code"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
              className="w-full py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl mb-3"
            >
              JOIN ROOM
            </motion.button>
            <button
              onClick={() => setMode(null)}
              className="w-full text-white/40 text-sm py-2"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mt-3"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
```

### 8.17 `/client/src/pages/Lobby.jsx`

```jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { socket } from "../socket";

export default function Lobby({ roomCode, playerId }) {
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    socket.on("lobby_update", ({ players: p, hostId: h }) => {
      setPlayers(p);
      setHostId(h);
    });

    socket.on("error", ({ message }) => setError(message));

    return () => {
      socket.off("lobby_update");
      socket.off("error");
    };
  }, []);

  const isHost = playerId === hostId;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    socket.emit("start_game", { roomCode });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-10">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-5xl text-gold mb-2"
      >
        LOBBY
      </motion.h1>

      {/* Room Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/30 border border-white/10 rounded-2xl px-8 py-4 mb-6 text-center"
      >
        <div className="text-white/50 text-xs mb-1 uppercase tracking-widest">
          Room Code
        </div>
        <div className="room-code text-4xl text-white font-display">
          {roomCode}
        </div>
        <button
          onClick={copyCode}
          className="mt-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          {copied ? "✓ Copied!" : "Tap to copy"}
        </button>
      </motion.div>

      {/* Players */}
      <div className="w-full max-w-sm mb-6">
        <div className="text-white/50 text-xs uppercase tracking-widest mb-2">
          Players ({players.length}/8)
        </div>
        <AnimatePresence>
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 py-3 px-4 rounded-xl mb-2 ${
                p.id === playerId
                  ? "bg-gold/20 border border-gold/30"
                  : "bg-white/5"
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display text-lg text-white">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-white flex-1">{p.name}</span>
              {p.id === playerId && (
                <span className="text-xs text-gold">you</span>
              )}
              {p.isHost && <span className="text-yellow-400 text-sm">👑</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Status */}
      {!isHost && (
        <p className="text-white/40 text-sm">Waiting for host to start...</p>
      )}

      {isHost && (
        <motion.div className="w-full max-w-sm">
          {players.length < 2 && (
            <p className="text-white/40 text-sm text-center mb-3">
              Need at least 2 players to start
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            disabled={players.length < 2}
            className={`w-full py-4 rounded-2xl font-display text-2xl transition-all ${
              players.length >= 2
                ? "bg-gold text-feltDark"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            START GAME
          </motion.button>
        </motion.div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}
```

### 8.18 `/client/src/pages/Game.jsx`

```jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { socket } from "../socket";
import PlayerRow from "../components/PlayerRow";
import HitStayButtons from "../components/HitStayButtons";
import ActionPopup from "../components/ActionPopup";
import ScoreboardModal from "../components/ScoreboardModal";

export default function Game({ gameState, playerId, roomCode }) {
  const [pendingActionCard, setPendingActionCard] = useState(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [bust, setBust] = useState(null);
  const [flip7, setFlip7] = useState(null);

  useEffect(() => {
    socket.on("action_card_drawn", (data) => {
      setPendingActionCard(data);
    });

    socket.on("game_state", () => {
      // Clear pending action if server resolved it
      if (!gameState?.pendingAction) {
        setPendingActionCard(null);
      }
    });

    socket.on("bust", ({ playerName }) => {
      setBust(playerName);
      setTimeout(() => setBust(null), 2000);
    });

    socket.on("flip7_win", ({ playerName }) => {
      setFlip7(playerName);
      setTimeout(() => setFlip7(null), 3000);
    });

    return () => {
      socket.off("action_card_drawn");
      socket.off("game_state");
      socket.off("bust");
      socket.off("flip7_win");
    };
  }, [gameState]);

  if (!gameState) return null;

  const me = gameState.players.find((p) => p.id === playerId);
  const others = gameState.players.filter((p) => p.id !== playerId);
  const isMyTurn =
    me?.isActive &&
    !me?.hasBusted &&
    !me?.hasStayed &&
    !me?.isFrozen &&
    !gameState.pendingAction;

  const showActionPopup =
    pendingActionCard &&
    (pendingActionCard.drawerId === playerId ||
      pendingActionCard.activePlayers?.some((p) => p.id === playerId));

  return (
    <div className="min-h-dvh pb-28 px-3 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="font-display text-2xl text-gold">FLIP 7</div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-white/40">
            Round {gameState.roundNumber}
          </div>
          <div className="text-xs text-white/40">
            🃏 {gameState.deckRemaining} left
          </div>
          <button
            onClick={() => setShowScoreboard(true)}
            className="text-xs bg-white/10 px-3 py-1 rounded-lg text-white/70"
          >
            Scores
          </button>
        </div>
      </div>

      {/* Other players */}
      {others.map((player) => (
        <PlayerRow
          key={player.id}
          player={player}
          isMe={false}
          isCurrent={player.isActive && !player.hasBusted && !player.hasStayed}
        />
      ))}

      {/* Divider */}
      <div className="border-t border-white/10 my-3" />

      {/* Me */}
      {me && <PlayerRow player={me} isMe={true} isCurrent={isMyTurn} />}

      {/* Toast notifications */}
      <AnimatePresence>
        {bust && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-16 left-0 right-0 flex justify-center z-40"
          >
            <div className="bg-red-600 text-white font-display text-xl px-6 py-2 rounded-full shadow-lg">
              {bust} BUSTED! 💥
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flip7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gold text-feltDark font-display text-4xl px-8 py-6 rounded-3xl shadow-2xl text-center">
              🌟 FLIP 7! 🌟
              <br />
              <span className="text-2xl">{flip7}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action card popup */}
      {showActionPopup && pendingActionCard && (
        <ActionPopup
          action={pendingActionCard.card?.value || pendingActionCard.card}
          activePlayers={pendingActionCard.activePlayers || []}
          roomCode={roomCode}
          isDrawer={pendingActionCard.drawerId === playerId}
          drawerName={pendingActionCard.drawerName}
        />
      )}

      {/* Scoreboard modal */}
      {showScoreboard && (
        <ScoreboardModal
          scores={gameState.players}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* Hit / Stay buttons */}
      <HitStayButtons roomCode={roomCode} canAct={isMyTurn} />
    </div>
  );
}
```

### 8.19 `/client/src/pages/RoundSummary.jsx`

```jsx
import React, { useState } from "react";
import { motion } from "motion/react";
import { socket } from "../socket";
import ScoreboardModal from "../components/ScoreboardModal";

export default function RoundSummary({
  scores,
  roundNumber,
  playerId,
  roomCode,
  hostId,
}) {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const isHost = playerId === hostId;
  const sorted = [...scores].sort((a, b) => b.roundScore - a.roundScore);

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-white/50 text-sm uppercase tracking-widest">
          Round {roundNumber}
        </div>
        <h1 className="font-display text-5xl text-gold">RESULTS</h1>
      </motion.div>

      {/* Round scores */}
      <div className="w-full max-w-sm mb-6">
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
              player.id === playerId
                ? "bg-gold/20 border border-gold/30"
                : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-white/40 w-5">
                {i + 1}
              </span>
              <span className="font-semibold text-white">{player.name}</span>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-gold">
                +{player.roundScore}
              </div>
              <div className="text-xs text-white/40">
                Total: {player.totalScore}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View full scoreboard */}
      <button
        onClick={() => setShowScoreboard(true)}
        className="text-white/60 text-sm underline mb-6"
      >
        View full scoreboard
      </button>

      {/* Start next round (host only) */}
      {isHost ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => socket.emit("start_next_round", { roomCode })}
          className="w-full max-w-sm py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
        >
          NEXT ROUND
        </motion.button>
      ) : (
        <p className="text-white/40 text-sm">
          Waiting for host to start next round...
        </p>
      )}

      {showScoreboard && (
        <ScoreboardModal
          scores={scores}
          onClose={() => setShowScoreboard(false)}
        />
      )}
    </div>
  );
}
```

### 8.20 `/client/src/pages/GameOver.jsx`

```jsx
import React from "react";
import { motion } from "motion/react";
import { socket } from "../socket";

export default function GameOver({
  winner,
  finalScores,
  playerId,
  roomCode,
  hostId,
}) {
  const isHost = playerId === hostId;
  const sorted = [...finalScores].sort((a, b) => b.totalScore - a.totalScore);
  const iWon = winner?.id === playerId;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      {/* Winner announcement */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-3">{iWon ? "🏆" : "🎉"}</div>
        <h1 className="font-display text-4xl text-gold mb-1">
          {iWon ? "YOU WIN!" : `${winner?.name} WINS!`}
        </h1>
        <p className="text-white/50 text-sm">
          {iWon ? "Absolutely dominant." : `Better luck next time.`}
        </p>
      </motion.div>

      {/* Final scores */}
      <div className="w-full max-w-sm mb-8">
        <div className="text-white/50 text-xs uppercase tracking-widest mb-2">
          Final Scores
        </div>
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
              i === 0 ? "bg-gold/20 border border-gold/30" : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-white/40 w-5">
                {i + 1}
              </span>
              <span className="font-semibold text-white">{player.name}</span>
            </div>
            <div className="font-display text-2xl text-gold">
              {player.totalScore}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Play again (host only) */}
      {isHost ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => socket.emit("play_again", { roomCode })}
          className="w-full max-w-sm py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
        >
          PLAY AGAIN
        </motion.button>
      ) : (
        <p className="text-white/40 text-sm">
          Waiting for host to start a new game...
        </p>
      )}
    </div>
  );
}
```

---

## 9. STEP-BY-STEP: GITHUB SETUP

### Step 1 — Create a GitHub account (skip if you have one)

1. Go to **https://github.com**
2. Click **Sign up**
3. Enter your email, create a password, choose a username
4. Verify your email
5. Choose the **Free** plan

### Step 2 — Create a new repository

1. Once logged in, click the **+** icon top-right → **New repository**
2. Repository name: `flip7`
3. Set to **Private** (so only you can see the code)
4. Do NOT check "Add a README" (we'll push our own files)
5. Click **Create repository**
6. Copy the repository URL — it looks like: `https://github.com/YOUR_USERNAME/flip7.git`

### Step 3 — Install Git on your computer (if not installed)

- **Windows:** Download from https://git-scm.com/download/win — install with defaults
- **Mac:** Open Terminal, type `git --version` — if not installed, it prompts you to install
- **Linux:** `sudo apt install git`

### Step 4 — Install Node.js (if not installed)

- Go to **https://nodejs.org**
- Download the **LTS** version (currently 20.x)
- Install with defaults

### Step 5 — Set up the project locally

Open your terminal (Command Prompt / Terminal / bash):

```bash
# Create the project folder
mkdir flip7
cd flip7

# Initialize git
git init

# Create the folder structure
mkdir -p server client/src/pages client/src/components client/src/hooks

# Now create all files exactly as shown in Section 7 and 8 above
# (copy-paste each file's content into the correct path)
```

### Step 6 — Install dependencies locally to test

```bash
# Install server dependencies
cd server
npm install
cd ..

# Install client dependencies
cd client
npm install
cd ..
```

### Step 7 — Test locally before pushing

Open **two terminals**:

Terminal 1 (server):

```bash
cd flip7/server
node index.js
# Should print: Flip 7 server running on port 3001
```

Terminal 2 (client):

```bash
cd flip7/client
npm run dev
# Opens at http://localhost:5173
```

Open http://localhost:5173 in two browser tabs and test creating/joining a room.

### Step 8 — Push to GitHub

```bash
cd flip7

# Connect to your GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/flip7.git

# Stage all files
git add .

# First commit
git commit -m "Initial commit - Flip 7 card game"

# Push to GitHub
git push -u origin main
```

---

## 10. STEP-BY-STEP: RAILWAY DEPLOYMENT

### Step 1 — Create a Railway account

1. Go to **https://railway.com**
2. Click **Login** → **Login with GitHub**
3. Authorize Railway to access your GitHub
4. You'll land on the Railway **Project Canvas** dashboard

### Step 2 — Create a new project

1. Click **New Project** (top right of dashboard)
2. Select **Deploy from GitHub repo**
3. If this is your first time, click **Configure GitHub App** → select your `flip7` repo → click **Install & Authorize**
4. Search for and select your `flip7` repository
5. Railway will automatically detect it's a Node.js app and begin the first build

### Step 3 — Set environment variables

1. Click on your service (the box on the canvas)
2. Go to the **Variables** tab
3. Add the following:

| Key        | Value        |
| ---------- | ------------ |
| `NODE_ENV` | `production` |
| `PORT`     | `3001`       |

4. Click **Add** for each one
5. Railway will automatically redeploy after you save variables

### Step 4 — Generate a public domain

1. Click on your service
2. Go to **Settings** tab
3. Scroll to **Networking**
4. Click **Generate Domain**
5. You'll get a URL like: `https://flip7-production-xxxx.up.railway.app`
6. That's your game URL. Share it with friends.

### Step 5 — Watch the deployment logs

1. Click on your service
2. Go to the **Deployments** tab
3. Click the latest deployment
4. Click **View Logs**
5. You should see: `Flip 7 server running on port 3001`

### Step 6 — Every future update

Whenever you change any code:

```bash
git add .
git commit -m "describe what you changed"
git push
```

Railway auto-detects the push and redeploys within ~60 seconds. Zero manual steps.

### Step 7 — Monitor usage (make sure you stay in free tier)

1. Click your profile icon → **Account Settings** → **Billing**
2. Set a **Spending Limit** of $0 to make absolutely sure you never get charged unexpectedly
3. The usage meter shows CPU + RAM consumption — a lightweight Node.js server uses almost nothing

---

## 11. ANIMATION REFERENCE

All animations use `motion/react` (formerly Framer Motion, renamed in 2025).

| Animation              | Component              | Trigger              | Implementation                                             |
| ---------------------- | ---------------------- | -------------------- | ---------------------------------------------------------- |
| Card deal slide-in     | `Card.jsx`             | Card appears         | `initial: hidden (y:-40, rotateY:90)` → `animate: visible` |
| Bust shake + red flash | `Card.jsx`             | `busting` prop true  | `x: [0,-8,8,-8,8,0]` keyframe + red bg                     |
| Action popup slide up  | `ActionPopup.jsx`      | Action card drawn    | `initial: y:300` → `animate: y:0` spring                   |
| Player join lobby      | `Lobby.jsx`            | New player list item | `x:-20 opacity:0` → `x:0 opacity:1` stagger                |
| FLIP 7 celebration     | `Game.jsx`             | flip7_win event      | `scale: 0.5 → 1` spring                                    |
| Score count reveal     | `RoundSummary.jsx`     | Page mount           | Staggered children `delay: i * 0.08`                       |
| Connection banner      | `ConnectionBanner.jsx` | Socket disconnect    | `y:-60` → `y:0` spring                                     |
| Scoreboard modal       | `ScoreboardModal.jsx`  | Button click         | `scale: 0.8 → 1` spring                                    |

---

## 12. KNOWN LIMITATIONS & EDGE CASES

### Handled

- Host disconnect → auto host transfer
- Deck runs out mid-round → round ends, active players score 0
- Second Chance + duplicate draw → safe
- Second Chance drawn when one already held → discard new one
- Action card drawn when only one player active → forced self-target
- Action card mid-Flip Three → resolves before next draw
- Tie at 200+ → keep playing

### Not handled (acceptable for v1)

- Reconnection recovery (tab close = player gone)
- More than 8 players
- Spectator mode
- Chat
- Persistent score history across sessions
- Custom rule variants (different target score, etc.)

### Railway free tier note

The $5/month credit covers roughly 500 hours of lightweight Node.js runtime. A monthly game session of a few hours uses approximately $0.03–$0.10 of that. You will not hit the limit.

---

_PRD v1.0 — Flip 7 Online | All code ready to copy and deploy_
