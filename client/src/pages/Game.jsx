import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socket } from '../socket';
import PlayerRow from '../components/PlayerRow';
import HitStayButtons from '../components/HitStayButtons';
import ActionPopup from '../components/ActionPopup';
import ScoreboardModal from '../components/ScoreboardModal';

function DeckStack({ count, canAct, onDraw }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div
        onClick={canAct ? onDraw : undefined}
        whileTap={canAct ? { scale: 0.88, rotate: -5 } : {}}
        whileHover={canAct ? { scale: 1.06, y: -6 } : {}}
        style={{ cursor: canAct ? 'pointer' : 'default', position: 'relative', width: 70, height: 100 }}
      >
        {count > 2 && (
          <div style={{
            position: 'absolute', top: -5, left: -5, width: 70, height: 100,
            borderRadius: 10, background: 'linear-gradient(135deg,#163060,#1e3a7a)',
            border: '2px solid #3a7ad4', transform: 'rotate(-4deg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }} />
        )}
        {count > 1 && (
          <div style={{
            position: 'absolute', top: -2, left: -2, width: 70, height: 100,
            borderRadius: 10, background: 'linear-gradient(135deg,#1a3870,#2347a0)',
            border: '2px solid #4a8ae4', transform: 'rotate(-2deg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }} />
        )}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 70, height: 100,
          borderRadius: 10,
          background: count > 0
            ? 'linear-gradient(135deg,#1e3a5f 0%,#2d5a9f 50%,#1e3a5f 100%)'
            : 'rgba(255,255,255,0.05)',
          border: `2px solid ${canAct ? '#f59e0b' : '#5a9ae4'}`,
          boxShadow: canAct
            ? '0 0 24px rgba(245,158,11,0.6),0 6px 20px rgba(0,0,0,0.5)'
            : '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'box-shadow 0.2s,border-color 0.2s',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
              {count}
            </span>
          </div>
        </div>
      </motion.div>

      <div style={{ marginTop: 14, textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{count} cards left</div>
        {canAct && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], y: [0, -3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginTop: 4 }}
          >
            TAP TO DRAW
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function Game({ gameState, playerId, roomCode, bustEvent, flip7Event, actionCardEvent }) {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [visibleBust, setVisibleBust] = useState(null);
  const [visibleFlip7, setVisibleFlip7] = useState(null);
  const bustTimer = useRef(null);
  const flip7Timer = useRef(null);

  useEffect(() => {
    if (!bustEvent) return;
    clearTimeout(bustTimer.current);
    setVisibleBust(bustEvent.playerName);
    bustTimer.current = setTimeout(() => setVisibleBust(null), 2500);
  }, [bustEvent]);

  useEffect(() => {
    if (!flip7Event) return;
    clearTimeout(flip7Timer.current);
    setVisibleFlip7(flip7Event.playerName);
    flip7Timer.current = setTimeout(() => setVisibleFlip7(null), 3000);
  }, [flip7Event]);

  if (!gameState) return null;

  const me = gameState.players.find(p => p.id === playerId);
  const others = gameState.players.filter(p => p.id !== playerId);

  // Single clean check — server explicitly tells us whose turn it is
  const isMyTurn =
    gameState.phase === 'playing' &&
    !gameState.pendingAction &&
    gameState.currentTurnPlayerId === playerId;

  // Turn banner
  let turnLabel = '';
  let turnIsMe = false;
  if (gameState.pendingAction) {
    if (gameState.pendingAction.drawerId === playerId) {
      turnLabel = '🃏 Choose who gets the card';
      turnIsMe = true;
    } else {
      turnLabel = `🃏 ${gameState.pendingAction.drawerName} is choosing...`;
    }
  } else if (isMyTurn) {
    turnLabel = '⭐ YOUR TURN';
    turnIsMe = true;
  } else {
    // currentTurnPlayerName comes straight from server — no lookup needed
    turnLabel = `🕐 ${gameState.currentTurnPlayerName}'s Turn`;
  }

  const handleDraw = () => {
    if (!isMyTurn) return;
    socket.emit('player_action', { roomCode, action: 'hit' });
  };

  const showActionPopup =
    !!actionCardEvent &&
    !!gameState.pendingAction &&
    (actionCardEvent.drawerId === playerId ||
      actionCardEvent.activePlayers?.some(p => p.id === playerId));

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingBottom: 140 }}>

      {/* TOP BAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 26, color: '#f59e0b' }}>FLIP 7</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Round {gameState.roundNumber}</span>
          <button
            onClick={() => setShowScoreboard(true)}
            style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }}
          >
            Scores
          </button>
        </div>
      </div>

      {/* TURN BANNER */}
      <AnimatePresence mode="wait">
        <motion.div
          key={turnLabel}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            textAlign: 'center', padding: '8px 16px',
            background: turnIsMe
              ? 'linear-gradient(90deg,transparent,rgba(245,158,11,0.15),transparent)'
              : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
            borderTop: turnIsMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
            borderBottom: turnIsMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{
            fontFamily: 'Bebas Neue', fontSize: 20,
            color: turnIsMe ? '#f59e0b' : 'rgba(255,255,255,0.55)',
            letterSpacing: '0.04em',
          }}>
            {turnLabel}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* OTHER PLAYERS */}
      <div style={{ padding: '12px 12px 0' }}>
        {others.map(player => (
          <PlayerRow
            key={player.id}
            player={player}
            isMe={false}
            isCurrent={gameState.currentTurnPlayerId === player.id}
          />
        ))}
      </div>

      {/* CENTER TABLE */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
        <div style={{
          width: 220, height: 130, borderRadius: '50%',
          background: 'radial-gradient(ellipse at center,#2d6a4f 0%,#1a472a 70%,#0f2d1c 100%)',
          border: '6px solid #8B6914',
          boxShadow: '0 0 0 3px #5a4209,inset 0 0 40px rgba(0,0,0,0.35),0 12px 40px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DeckStack count={gameState.deckRemaining} canAct={isMyTurn} onDraw={handleDraw} />
        </div>
      </div>

      {/* DIVIDER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 12px 12px' }} />

      {/* MY HAND */}
      <div style={{ padding: '0 12px' }}>
        {me && <PlayerRow player={me} isMe={true} isCurrent={isMyTurn} />}
      </div>

      {/* BUST TOAST */}
      <AnimatePresence>
        {visibleBust && (
          <motion.div
            initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            style={{ position: 'fixed', top: 72, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none' }}
          >
            <div style={{ background: '#dc2626', color: 'white', fontFamily: 'Bebas Neue', fontSize: 22, padding: '8px 24px', borderRadius: 999, boxShadow: '0 4px 20px rgba(220,38,38,0.5)' }}>
              {visibleBust} BUSTED! 💥
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLIP 7 TOAST */}
      <AnimatePresence>
        {visibleFlip7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, pointerEvents: 'none' }}
          >
            <div style={{ background: '#f59e0b', color: '#0f2d1c', fontFamily: 'Bebas Neue', fontSize: 40, padding: '24px 32px', borderRadius: 24, textAlign: 'center' }}>
              🌟 FLIP 7! 🌟<br /><span style={{ fontSize: 26 }}>{visibleFlip7}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ACTION POPUP */}
      {showActionPopup && actionCardEvent && (
        <ActionPopup
          action={actionCardEvent.card?.value || actionCardEvent.card}
          activePlayers={actionCardEvent.activePlayers || []}
          roomCode={roomCode}
          isDrawer={actionCardEvent.drawerId === playerId}
          drawerName={actionCardEvent.drawerName}
        />
      )}

      {/* SCOREBOARD */}
      {showScoreboard && (
        <ScoreboardModal scores={gameState.players} onClose={() => setShowScoreboard(false)} />
      )}

      {/* BUTTONS */}
      <HitStayButtons roomCode={roomCode} canAct={isMyTurn} onHit={handleDraw} />
    </div>
  );
}