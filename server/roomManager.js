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
