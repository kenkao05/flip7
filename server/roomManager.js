const { createGameState, createPlayer } = require('./gameManager');

const rooms = new Map(); // roomCode → gameState

// Token → { roomCode, playerId(current socket id) }
// Used to re-identify returning players
const tokenMap = new Map();

const DISCONNECT_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoom(hostId, hostName, hostToken) {
  let code;
  do { code = generateRoomCode(); } while (rooms.has(code));

  const state = createGameState(code, hostId, hostName);

  // Store token mapping
  state.players[0].token = hostToken;
  state.players[0].connected = true;
  state.players[0].disconnectTimer = null;

  tokenMap.set(hostToken, { roomCode: code, playerName: hostName });
  rooms.set(code, state);
  return state;
}

function getRoom(roomCode) {
  return rooms.get(roomCode?.toUpperCase()) || null;
}

function joinRoom(roomCode, playerId, playerName, playerToken) {
  const state = getRoom(roomCode);
  if (!state) return { error: 'Room not found. Check your code and try again.' };
  if (state.phase !== 'lobby') return { error: 'Game already in progress.' };
  if (state.players.length >= 8) return { error: 'Room is full (max 8 players).' };

  const nameTaken = state.players.find(
    p => p.name.toLowerCase() === playerName.toLowerCase() && p.connected
  );
  if (nameTaken) return { error: 'That name is already taken in this room.' };

  const player = createPlayer(playerId, playerName, false);
  player.token = playerToken;
  player.connected = true;
  player.disconnectTimer = null;

  state.players.push(player);
  tokenMap.set(playerToken, { roomCode: state.roomCode, playerName });
  return { state };
}

// Called when a socket disconnects
// Marks player as disconnected, starts 20 min removal timer
// Returns { state, player } or null if room not found
function markDisconnected(socketId, onRemove) {
  // Find which room this socket is in
  let foundRoom = null;
  let foundPlayer = null;

  for (const [, state] of rooms) {
    const p = state.players.find(p => p.id === socketId);
    if (p) { foundRoom = state; foundPlayer = p; break; }
  }

  if (!foundRoom || !foundPlayer) return null;

  foundPlayer.connected = false;

  // Clear any existing timer
  if (foundPlayer.disconnectTimer) {
    clearTimeout(foundPlayer.disconnectTimer);
  }

  // Start removal timer
  foundPlayer.disconnectTimer = setTimeout(() => {
    removePlayer(foundRoom.roomCode, foundPlayer.token);
    onRemove(foundRoom.roomCode, foundPlayer, foundRoom);
  }, DISCONNECT_TIMEOUT_MS);

  return { state: foundRoom, player: foundPlayer };
}

// Attempt to reconnect a player by token
// Returns { state, player, isNewSocket } or { error }
function reconnectPlayer(token, newSocketId) {
  const mapping = tokenMap.get(token);
  if (!mapping) return { error: 'Session not found. Please rejoin.' };

  const state = getRoom(mapping.roomCode);
  if (!state) return { error: 'Room no longer exists.' };

  const player = state.players.find(p => p.token === token);
  if (!player) return { error: 'Player slot no longer exists.' };

  // Cancel disconnect timer
  if (player.disconnectTimer) {
    clearTimeout(player.disconnectTimer);
    player.disconnectTimer = null;
  }

  const oldSocketId = player.id;
  player.id = newSocketId;
  player.connected = true;

  // Update host if needed
  if (state.hostId === oldSocketId) {
    state.hostId = newSocketId;
  }

  // Update tokenMap
  tokenMap.set(token, { roomCode: state.roomCode, playerName: player.name });

  return { state, player, oldSocketId };
}

function removePlayer(roomCode, token) {
  const state = getRoom(roomCode);
  if (!state) return null;

  const index = state.players.findIndex(p => p.token === token);
  if (index === -1) return null;

  const player = state.players[index];
  if (player.disconnectTimer) clearTimeout(player.disconnectTimer);

  tokenMap.delete(token);
  state.players.splice(index, 1);

  if (state.players.length === 0) {
    rooms.delete(roomCode);
    return null;
  }

  // Transfer host if needed
  if (state.hostId === player.id) {
    const nextConnected = state.players.find(p => p.connected) || state.players[0];
    nextConnected.isHost = true;
    state.hostId = nextConnected.id;
  }

  // Fix turn index if out of bounds
  if (state.turnIndex >= state.players.length) {
    state.turnIndex = 0;
  }

  return { state, removedPlayer: player };
}

function getRoomByToken(token) {
  const mapping = tokenMap.get(token);
  if (!mapping) return null;
  return getRoom(mapping.roomCode);
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  markDisconnected,
  reconnectPlayer,
  removePlayer,
  getRoomByToken,
};