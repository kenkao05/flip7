import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socket, playerToken } from '../socket';

export default function Lobby({ roomCode, playerId }) {
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('lobby_update', ({ players: p, hostId: h }) => {
      setPlayers(p);
      setHostId(h);
    });
    socket.on('room_error', ({ message }) => setError(message));

    return () => {
      socket.off('lobby_update');
      socket.off('room_error');
    };
  }, []);

  const isHost = playerId === hostId;

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExit = () => {
    // Wipe token so reconnect doesn't pull them back into this room
    localStorage.removeItem('flip7_token');
    socket.disconnect();
    window.location.reload();
  };

  const startGame = () => {
    socket.emit('start_game', { roomCode });
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
        <div className="text-white/50 text-xs mb-1 uppercase tracking-widest">Room Code</div>
        <div className="room-code text-4xl text-white font-display">{roomCode}</div>
        <button
          onClick={copyCode}
          className="mt-2 text-xs text-white/50 hover:text-white transition-colors"
        >
          {copied ? '✓ Copied!' : 'Tap to copy'}
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
                p.id === playerId ? 'bg-gold/20 border border-gold/30' : 'bg-white/5'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-display text-lg text-white">
                {p.name[0].toUpperCase()}
              </div>
              <span className="font-semibold text-white flex-1">{p.name}</span>
              {p.id === playerId && (
                <span style={{
                  background: '#f59e0b', color: '#0f2d1c',
                  fontSize: 9, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 4, fontFamily: 'Bebas Neue',
                }}>YOU</span>
              )}
              {p.isHost && <span className="text-yellow-400 text-sm">👑</span>}
              {p.connected === false && <span className="text-xs text-red-400">disconnected</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Status / start button */}
      {!isHost && (
        <p className="text-white/40 text-sm mb-4">Waiting for host to start...</p>
      )}

      {isHost && (
        <motion.div className="w-full max-w-sm mb-4">
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
                ? 'bg-gold text-feltDark'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            START GAME
          </motion.button>
        </motion.div>
      )}

      {/* Leave lobby — always visible */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleExit}
        className="w-full max-w-sm py-3 rounded-2xl font-display text-xl"
        style={{
          background: 'rgba(220,38,38,0.12)',
          border: '1px solid rgba(220,38,38,0.25)',
          color: '#f87171',
          cursor: 'pointer',
        }}
      >
        LEAVE LOBBY
      </motion.button>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </div>
  );
}