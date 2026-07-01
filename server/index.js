const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const { createRoom, getRoom, joinRoom, removePlayer } = require('./roomManager');
const {
  startRound,
  drawCard,
  nextTurn,
  currentPlayer,
  applyCard,
  computeScore,
  endRound,
  noActivePlayers,
  resetGame,
} = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// ─── BUILD STATE TO SEND TO CLIENTS ──────────────────────────────────────────
// This is the ONLY place we construct what clients see.
// currentTurnPlayerId and currentTurnPlayerName come directly from
// state.players[state.turnIndex] — no helper function, no indirection.

function clientState(state) {
  const turnPlayer = state.players[state.turnIndex] || state.players[0];

  return {
    roomCode:              state.roomCode,
    hostId:                state.hostId,
    phase:                 state.phase,
    roundNumber:           state.roundNumber,
    deckRemaining:         state.deck.length,
    turnIndex:             state.turnIndex,
    currentTurnPlayerId:   turnPlayer.id,
    currentTurnPlayerName: turnPlayer.name,
    pendingAction:         state.pendingAction,
    lastRoundScores:       state.lastRoundScores,
    players: state.players.map(p => ({
      id:            p.id,
      name:          p.name,
      isHost:        p.isHost,
      isActive:      p.isActive,
      hasBusted:     p.hasBusted,
      hasStayed:     p.hasStayed,
      isFrozen:      p.isFrozen,
      numberCards:   [...p.numberCards],
      modifierCards: [...p.modifierCards],
      secondChance:  p.secondChance,
      roundScore:    p.roundScore,
      totalScore:    p.totalScore,
    })),
  };
}

function broadcast(roomCode, state) {
  io.to(roomCode).emit('game_state', { gameState: clientState(state) });
}

function finishRound(state, roomCode, flip7WinnerId = null) {
  if (flip7WinnerId) {
    const w = state.players.find(p => p.id === flip7WinnerId);
    io.to(roomCode).emit('flip7_win', { playerId: flip7WinnerId, playerName: w?.name });
  }
  const result = endRound(state, flip7WinnerId);
  if (result.gameOver) {
    io.to(roomCode).emit('game_over', {
      winner: result.winner,
      finalScores: state.lastRoundScores,
    });
  } else {
    io.to(roomCode).emit('round_over', {
      scores: state.lastRoundScores,
      roundNumber: state.roundNumber,
    });
  }
}

function checkRoundOver(state, roomCode) {
  if (noActivePlayers(state)) {
    finishRound(state, roomCode, null);
    return true;
  }
  return false;
}

// After a player acts (hit/stay/bust), move to next turn and broadcast
function advanceAndBroadcast(state, roomCode) {
  if (checkRoundOver(state, roomCode)) return;
  nextTurn(state);
  broadcast(roomCode, state);
}

// Process flip three: draw `count` cards one at a time for target
function doFlipThree(state, target, count, roomCode) {
  if (count <= 0 || !target.isActive) {
    advanceAndBroadcast(state, roomCode);
    return;
  }

  const card = drawCard(state);
  if (!card) { finishRound(state, roomCode); return; }

  const outcome = applyCard(state, target, card);

  if (outcome === 'bust') {
    io.to(roomCode).emit('bust', { playerId: target.id, playerName: target.name });
    advanceAndBroadcast(state, roomCode);
    return;
  }
  if (outcome === 'flip7') {
    broadcast(roomCode, state);
    finishRound(state, roomCode, target.id);
    return;
  }
  if (outcome === 'needs_target') {
    // Action card mid-flip-three — ask for target, store remaining count
    const active = state.players.filter(
      p => p.isActive && !p.hasBusted && !p.hasStayed && !p.isFrozen
    );
    state.pendingAction = {
      type: card.value,
      drawerId: target.id,
      drawerName: target.name,
      flipThreeRemaining: count - 1,
      card,
    };
    broadcast(roomCode, state);
    io.to(roomCode).emit('action_card_drawn', {
      card,
      drawerId: target.id,
      drawerName: target.name,
      activePlayers: active.map(p => ({ id: p.id, name: p.name })),
    });
    return;
  }

  broadcast(roomCode, state);
  setTimeout(() => doFlipThree(state, target, count - 1, roomCode), 700);
}

// ─── SOCKET EVENTS ────────────────────────────────────────────────────────────

io.on('connection', socket => {
  console.log('[connect]', socket.id);
  let myRoom = null;

  // CREATE ROOM
  socket.on('create_room', ({ playerName }) => {
    if (!playerName?.trim()) { socket.emit('room_error', { message: 'Enter a name.' }); return; }
    const state = createRoom(socket.id, playerName.trim());
    myRoom = state.roomCode;
    socket.join(myRoom);
    socket.emit('room_created', { roomCode: myRoom, playerId: socket.id });
    io.to(myRoom).emit('lobby_update', { players: state.players, hostId: state.hostId });
  });

  // JOIN ROOM
  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!playerName?.trim()) { socket.emit('room_error', { message: 'Enter a name.' }); return; }
    if (!roomCode?.trim())   { socket.emit('room_error', { message: 'Enter a room code.' }); return; }
    const result = joinRoom(roomCode.trim().toUpperCase(), socket.id, playerName.trim());
    if (result.error) { socket.emit('room_error', { message: result.error }); return; }
    const state = result.state;
    myRoom = state.roomCode;
    socket.join(myRoom);
    socket.emit('room_joined', { roomCode: myRoom, playerId: socket.id });
    io.to(myRoom).emit('lobby_update', { players: state.players, hostId: state.hostId });
  });

  // START GAME
  socket.on('start_game', ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state || state.hostId !== socket.id) return;
    if (state.players.length < 2) {
      socket.emit('room_error', { message: 'Need at least 2 players.' });
      return;
    }
    startRound(state);
    // Send game_started first so clients switch screens
    io.to(roomCode).emit('game_started', { gameState: clientState(state) });
    // Then broadcast full state
    broadcast(roomCode, state);
  });

  // START NEXT ROUND
  socket.on('start_next_round', ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== 'round_over' || state.hostId !== socket.id) return;
    startRound(state);
    io.to(roomCode).emit('game_started', { gameState: clientState(state) });
    broadcast(roomCode, state);
  });

  // PLAY AGAIN
  socket.on('play_again', ({ roomCode }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== 'game_over' || state.hostId !== socket.id) return;
    resetGame(state);
    io.to(roomCode).emit('lobby_update', { players: state.players, hostId: state.hostId });
  });

  // HIT OR STAY
  socket.on('player_action', ({ roomCode, action }) => {
    const state = getRoom(roomCode);
    if (!state || state.phase !== 'playing') return;
    if (state.pendingAction) return;

    // Hard gate: only the current turn player can act
    const cp = currentPlayer(state);
    if (!cp || cp.id !== socket.id) return;
    if (!cp.isActive || cp.hasBusted || cp.hasStayed || cp.isFrozen) return;

    if (action === 'stay') {
      cp.hasStayed = true;
      cp.isActive = false;
      cp.roundScore = computeScore(cp);
      advanceAndBroadcast(state, roomCode);
      return;
    }

    if (action === 'hit') {
      const card = drawCard(state);
      if (!card) { finishRound(state, roomCode); return; }

      const outcome = applyCard(state, cp, card);
      const deckEmpty = state.deck.length === 0;

      if (outcome === 'bust') {
        io.to(roomCode).emit('bust', { playerId: cp.id, playerName: cp.name });
        if (deckEmpty) { broadcast(roomCode, state); finishRound(state, roomCode); return; }
        advanceAndBroadcast(state, roomCode);
        return;
      }
      if (outcome === 'flip7') {
        broadcast(roomCode, state);
        finishRound(state, roomCode, cp.id);
        return;
      }
      if (outcome === 'needs_target') {
        const active = state.players.filter(
          p => p.isActive && !p.hasBusted && !p.hasStayed && !p.isFrozen
        );
        if (active.length === 1 && active[0].id === socket.id) {
          state.discardPile.push(card);
          if (card.value === 'Freeze') {
            cp.isActive = false;
            cp.isFrozen = true;
            cp.roundScore = computeScore(cp);
            if (deckEmpty) { broadcast(roomCode, state); finishRound(state, roomCode); return; }
            advanceAndBroadcast(state, roomCode);
          } else {
            doFlipThree(state, cp, 3, roomCode);
          }
          return;
        }
        state.pendingAction = {
          type: card.value,
          drawerId: cp.id,
          drawerName: cp.name,
          flipThreeRemaining: 3,
          card,
        };
        broadcast(roomCode, state);
        io.to(roomCode).emit('action_card_drawn', {
          card,
          drawerId: cp.id,
          drawerName: cp.name,
          activePlayers: active.map(p => ({ id: p.id, name: p.name })),
        });
        return;
      }

      // Normal card placed — if deck is now empty, end the round
      if (deckEmpty) {
        broadcast(roomCode, state);
        finishRound(state, roomCode);
        return;
      }

      advanceAndBroadcast(state, roomCode);
    }
  });

  // SELECT TARGET FOR ACTION CARD
  socket.on('select_target', ({ roomCode, targetId }) => {
    const state = getRoom(roomCode);
    if (!state || !state.pendingAction) return;
    if (state.pendingAction.drawerId !== socket.id) return;

    const target = state.players.find(p => p.id === targetId);
    if (!target || !target.isActive || target.hasBusted || target.hasStayed || target.isFrozen) return;

    const { type, card, flipThreeRemaining } = state.pendingAction;
    state.discardPile.push(card);
    state.pendingAction = null;

    if (type === 'Freeze') {
      target.isActive = false;
      target.isFrozen = true;
      target.roundScore = computeScore(target);
      advanceAndBroadcast(state, roomCode);
      return;
    }

    if (type === 'FlipThree') {
      const count = flipThreeRemaining > 0 ? flipThreeRemaining : 3;
      doFlipThree(state, target, count, roomCode);
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    console.log('[disconnect]', socket.id);
    if (!myRoom) return;
    const state = removePlayer(myRoom, socket.id);
    if (!state) return;

    io.to(myRoom).emit('lobby_update', { players: state.players, hostId: state.hostId });

    if (state.phase === 'playing') {
      // Fix turnIndex if it's now out of bounds
      if (state.turnIndex >= state.players.length) {
        state.turnIndex = 0;
      }
      if (!checkRoundOver(state, myRoom)) {
        // Make sure turnIndex points to an active player
        const cp = currentPlayer(state);
        if (!cp || cp.hasBusted || cp.hasStayed || cp.isFrozen) {
          nextTurn(state);
        }
        broadcast(myRoom, state);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Flip 7 running on port ${PORT}`));