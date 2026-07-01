function buildDeck() {
  const deck = [];
  for (let n = 0; n <= 12; n++) {
    const count = n === 0 ? 1 : n;
    for (let i = 0; i < count; i++) {
      deck.push({ type: 'number', value: n });
    }
  }
  ['Freeze', 'FlipThree', 'SecondChance'].forEach(action => {
    for (let i = 0; i < 3; i++) {
      deck.push({ type: 'action', value: action });
    }
  });
  ['+2', '+4', '+6', '+8', '+10', 'X2'].forEach(mod => {
    deck.push({ type: 'modifier', value: mod });
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

function createGameState(roomCode, hostId, hostName) {
  return {
    roomCode,
    hostId,
    phase: 'lobby',
    players: [createPlayer(hostId, hostName, true)],
    deck: [],
    discardPile: [],
    dealerIndex: 0,
    turnIndex: 0,
    roundNumber: 0,
    pendingAction: null,
    lastRoundScores: [],
  };
}

// Reset all players and start a new round
// NO initial deal — everyone starts with 0 cards
function startRound(state) {
  state.players.forEach(p => {
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
  state.phase = 'playing';
  state.pendingAction = null;

  // Turn starts at the dealer
  state.turnIndex = state.dealerIndex % state.players.length;

  // Rebuild deck if needed
  if (state.deck.length < 10) {
    state.deck = [...buildDeck(), ...shuffle(state.discardPile)];
    state.discardPile = [];
  }
}

function drawCard(state) {
  if (state.deck.length === 0) {
    if (state.discardPile.length === 0) return null;
    state.deck = shuffle(state.discardPile);
    state.discardPile = [];
  }
  return state.deck.shift();
}

// Move turnIndex to the next active player
// Returns the new current player, or null if no active players left
function nextTurn(state) {
  const total = state.players.length;
  let next = (state.turnIndex + 1) % total;
  for (let i = 0; i < total; i++) {
    const p = state.players[next];
    if (p.isActive && !p.hasBusted && !p.hasStayed && !p.isFrozen) {
      state.turnIndex = next;
      return p;
    }
    next = (next + 1) % total;
  }
  return null; // no active players — round is over
}

// Who is currently up
function currentPlayer(state) {
  return state.players[state.turnIndex] || null;
}

// Apply a drawn card to a player, return what happened
function applyCard(state, player, card) {
  if (card.type === 'number') {
    if (player.numberCards.includes(card.value)) {
      if (player.secondChance) {
        player.secondChance = false;
        state.discardPile.push(card);
        return 'second_chance_used';
      }
      player.isActive = false;
      player.hasBusted = true;
      player.numberCards = [];
      player.modifierCards = [];
      player.roundScore = 0;
      state.discardPile.push(card);
      return 'bust';
    }
    player.numberCards.push(card.value);
    state.discardPile.push(card);
    if (player.numberCards.length === 7) return 'flip7';
    return 'ok';
  }

  if (card.type === 'modifier') {
    player.modifierCards.push(card.value);
    state.discardPile.push(card);
    return 'ok';
  }

  if (card.type === 'action') {
    if (card.value === 'SecondChance') {
      if (!player.secondChance) player.secondChance = true;
      state.discardPile.push(card);
      return 'ok';
    }
    // Freeze or FlipThree — caller handles targeting
    return 'needs_target';
  }

  return 'ok';
}

function computeScore(player) {
  if (player.hasBusted) return 0;
  let s = player.numberCards.reduce((a, n) => a + n, 0);
  if (player.modifierCards.includes('X2')) s *= 2;
  player.modifierCards.forEach(m => {
    if (m !== 'X2') s += parseInt(m.replace('+', ''), 10);
  });
  return s;
}

function endRound(state, flip7WinnerId) {
  state.players.forEach(p => {
    let score = 0;
    if (flip7WinnerId) {
      if (p.id === flip7WinnerId) score = computeScore(p) + 15;
      else if (!p.isActive && !p.hasBusted) score = p.roundScore || computeScore(p);
      else score = 0;
    } else {
      score = p.hasBusted ? 0 : (p.roundScore || computeScore(p));
    }
    p.roundScore = score;
    p.totalScore += score;
  });

  state.lastRoundScores = state.players.map(p => ({
    id: p.id,
    name: p.name,
    roundScore: p.roundScore,
    totalScore: p.totalScore,
  }));

  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;

  const max = Math.max(...state.players.map(p => p.totalScore));
  if (max >= 180) {
    const winners = state.players.filter(p => p.totalScore === max);
    if (winners.length === 1) {
      state.phase = 'game_over';
      return { gameOver: true, winner: winners[0] };
    }
  }
  state.phase = 'round_over';
  return { gameOver: false };
}

function noActivePlayers(state) {
  return !state.players.some(
    p => p.isActive && !p.hasBusted && !p.hasStayed && !p.isFrozen
  );
}

function resetGame(state) {
  state.players.forEach(p => {
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
  state.dealerIndex = 0;
  state.turnIndex = 0;
  state.phase = 'lobby';
  state.pendingAction = null;
  state.lastRoundScores = [];
}

module.exports = {
  createGameState,
  createPlayer,
  startRound,
  drawCard,
  nextTurn,
  currentPlayer,
  applyCard,
  computeScore,
  endRound,
  noActivePlayers,
  resetGame,
};