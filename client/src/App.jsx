import React, { useState, useEffect, useRef } from 'react';
import { socket } from './socket';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import RoundSummary from './pages/RoundSummary';
import GameOver from './pages/GameOver';
import ConnectionBanner from './components/ConnectionBanner';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gameState, setGameState] = useState(null);
  const [roundScores, setRoundScores] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  // Notification state — passed to Game so it can show toasts
  // Using refs so socket callbacks always have fresh values
  const [bustEvent, setBustEvent] = useState(null);
  const [flip7Event, setFlip7Event] = useState(null);
  const [actionCardEvent, setActionCardEvent] = useState(null);

  // Keep latest screen in a ref so socket listeners always see current value
  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Keep latest gameState in ref so listeners can clear pendingAction correctly
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    socket.connect();

    // ── CONNECTION ──────────────────────────────
    socket.on('connect', () => {
      setConnected(true);
      setConnecting(false);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setConnecting(true);
    });

    socket.on('connect_error', () => {
      setConnecting(true);
    });

    // ── ROOM EVENTS ──────────────────────────────
    socket.on('room_created', ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen('lobby');
    });

    socket.on('room_joined', ({ roomCode: rc, playerId: pid }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setScreen('lobby');
    });

    // ── GAME EVENTS ──────────────────────────────

    // game_started fires when a new round begins — switch to game screen
    socket.on('game_started', ({ gameState: gs }) => {
      setGameState(gs);
      setActionCardEvent(null);
      setBustEvent(null);
      setFlip7Event(null);
      setScreen('game');
    });

    // game_state is the authoritative state update — always apply it
    socket.on('game_state', ({ gameState: gs }) => {
      setGameState(gs);
      // If server has no pending action, clear any action popup
      if (!gs.pendingAction) {
        setActionCardEvent(null);
      }
    });

    // Action card drawn — show target picker popup
    socket.on('action_card_drawn', (data) => {
      setActionCardEvent(data);
    });

    // Bust notification — show toast
    socket.on('bust', ({ playerId: pid, playerName }) => {
      setBustEvent({ playerId: pid, playerName, ts: Date.now() });
    });

    // Flip 7 — show celebration
    socket.on('flip7_win', ({ playerId: pid, playerName }) => {
      setFlip7Event({ playerId: pid, playerName, ts: Date.now() });
    });

    // Round over — switch to summary screen
    socket.on('round_over', ({ scores, roundNumber }) => {
      setRoundScores({ scores, roundNumber });
      setActionCardEvent(null);
      setScreen('roundSummary');
    });

    // Game over
    socket.on('game_over', ({ winner, finalScores }) => {
      setGameOverData({ winner, finalScores });
      setActionCardEvent(null);
      setScreen('gameOver');
    });

    // Player left — update host if needed
    socket.on('player_left', ({ newHostId, players }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          hostId: newHostId,
          players: players || prev.players,
        };
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('game_started');
      socket.off('game_state');
      socket.off('action_card_drawn');
      socket.off('bust');
      socket.off('flip7_win');
      socket.off('round_over');
      socket.off('game_over');
      socket.off('player_left');
      socket.disconnect();
    };
  }, []); // ← empty deps is correct here — refs handle stale closure

  return (
    <div className="min-h-dvh felt-table">
      <ConnectionBanner connected={connected} connecting={connecting} />

      {screen === 'home' && <Home />}

      {screen === 'lobby' && (
        <Lobby
          roomCode={roomCode}
          playerId={playerId}
        />
      )}

      {screen === 'game' && gameState && (
        <Game
          gameState={gameState}
          playerId={playerId}
          roomCode={roomCode}
          bustEvent={bustEvent}
          flip7Event={flip7Event}
          actionCardEvent={actionCardEvent}
          onClearActionCard={() => setActionCardEvent(null)}
        />
      )}

      {screen === 'roundSummary' && roundScores && (
        <RoundSummary
          scores={roundScores.scores}
          roundNumber={roundScores.roundNumber}
          playerId={playerId}
          roomCode={roomCode}
          hostId={gameState?.hostId}
        />
      )}

      {screen === 'gameOver' && gameOverData && (
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