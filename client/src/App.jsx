import React, { useState, useEffect, useRef } from 'react';
import { socket, playerToken } from './socket';
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
  const [bustEvent, setBustEvent] = useState(null);
  const [flip7Event, setFlip7Event] = useState(null);
  const [actionCardEvent, setActionCardEvent] = useState(null);

  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  useEffect(() => {
    socket.connect();

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

    // ── AUTO RECONNECT — server recognized our token ──
    socket.on('reconnected', ({ roomCode: rc, playerId: pid, phase, gameState: gs }) => {
      setRoomCode(rc);
      setPlayerId(pid);
      setGameState(gs);
      setConnected(true);
      setConnecting(false);

      // Go to the right screen based on where the game is
      if (phase === 'lobby') setScreen('lobby');
      else if (phase === 'playing') setScreen('game');
      else if (phase === 'round_over') {
        setRoundScores({ scores: gs.lastRoundScores, roundNumber: gs.roundNumber });
        setScreen('roundSummary');
      } else if (phase === 'game_over') {
        setScreen('gameOver');
      }
    });

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

    socket.on('game_started', ({ gameState: gs }) => {
      setGameState(gs);
      setActionCardEvent(null);
      setBustEvent(null);
      setFlip7Event(null);
      setScreen('game');
    });

    socket.on('game_state', ({ gameState: gs }) => {
      setGameState(gs);
      if (!gs.pendingAction) setActionCardEvent(null);
    });

    socket.on('action_card_drawn', (data) => {
      setActionCardEvent(data);
    });

    socket.on('bust', ({ playerId: pid, playerName }) => {
      setBustEvent({ playerId: pid, playerName, ts: Date.now() });
    });

    socket.on('flip7_win', ({ playerId: pid, playerName }) => {
      setFlip7Event({ playerId: pid, playerName, ts: Date.now() });
    });

    socket.on('round_over', ({ scores, roundNumber }) => {
      setRoundScores({ scores, roundNumber });
      setActionCardEvent(null);
      setScreen('roundSummary');
    });

    socket.on('game_over', ({ winner, finalScores }) => {
      setGameOverData({ winner, finalScores });
      setActionCardEvent(null);
      setScreen('gameOver');
    });

    socket.on('player_left', ({ newHostId, players }) => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, hostId: newHostId, players: players || prev.players };
      });
    });

    socket.on('player_disconnected', ({ playerName }) => {
      // Show a brief notice — player is gone but slot held for 20 min
      console.log(`${playerName} disconnected — slot held for 20 minutes`);
    });

    socket.on('player_reconnected', ({ playerName }) => {
      console.log(`${playerName} reconnected`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('reconnected');
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
      socket.off('player_disconnected');
      socket.off('player_reconnected');
      socket.disconnect();
    };
  }, []);

  return (
    <div className="min-h-dvh felt-table">
      <ConnectionBanner connected={connected} connecting={connecting} />

      {screen === 'home' && <Home />}
      {screen === 'lobby' && <Lobby roomCode={roomCode} playerId={playerId} />}
      {screen === 'game' && gameState && (
        <Game
          gameState={gameState}
          playerId={playerId}
          roomCode={roomCode}
          bustEvent={bustEvent}
          flip7Event={flip7Event}
          actionCardEvent={actionCardEvent}
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