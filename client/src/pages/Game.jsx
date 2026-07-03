import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { socket } from '../socket';
import Card from '../components/Card';
import HitStayButtons from '../components/HitStayButtons';
import ActionPopup from '../components/ActionPopup';
import ScoreboardModal from '../components/ScoreboardModal';
import PlayerRow from '../components/PlayerRow';

// ── DECK STACK ────────────────────────────────
function DeckStack({ count, canAct, onDraw, small = false }) {
  const w = small ? 50 : 60;
  const h = small ? 72 : 86;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <motion.div
        onClick={canAct ? onDraw : undefined}
        whileTap={canAct ? { scale: 0.88, rotate: -5 } : {}}
        style={{
          cursor: canAct ? 'pointer' : 'default',
          position: 'relative', width: w, height: h,
        }}
      >
        {count > 2 && (
          <div style={{
            position: 'absolute', top: -4, left: -4, width: w, height: h,
            borderRadius: 8, background: 'linear-gradient(135deg,#163060,#1e3a7a)',
            border: '2px solid #3a7ad4', transform: 'rotate(-4deg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }} />
        )}
        {count > 1 && (
          <div style={{
            position: 'absolute', top: -2, left: -2, width: w, height: h,
            borderRadius: 8, background: 'linear-gradient(135deg,#1a3870,#2347a0)',
            border: '2px solid #4a8ae4', transform: 'rotate(-2deg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }} />
        )}
        <div style={{
          position: 'absolute', top: 0, left: 0, width: w, height: h,
          borderRadius: 8,
          background: count > 0
            ? 'linear-gradient(135deg,#1e3a5f 0%,#2d5a9f 50%,#1e3a5f 100%)'
            : 'rgba(255,255,255,0.05)',
          border: `2px solid ${canAct ? '#f59e0b' : '#5a9ae4'}`,
          boxShadow: canAct
            ? '0 0 20px rgba(245,158,11,0.5),0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'box-shadow 0.2s,border-color 0.2s',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Bebas Neue', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              {count}
            </span>
          </div>
        </div>
      </motion.div>

      {canAct && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5], y: [0, -2, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, marginTop: 6 }}
        >
          TAP
        </motion.div>
      )}
    </div>
  );
}

// ── PLAYER AVATAR (used in circular layout) ───
function PlayerAvatar({ player, isCurrent }) {
  const statusColor = () => {
    if (player.hasBusted) return '#dc2626';
    if (player.hasStayed) return '#3b82f6';
    if (player.isFrozen)  return '#60a5fa';
    if (isCurrent)        return '#f59e0b';
    return 'rgba(255,255,255,0.2)';
  };

  const statusIcon = () => {
    if (player.hasBusted) return '💥';
    if (player.hasStayed) return '✋';
    if (player.isFrozen)  return '❄️';
    if (!player.connected) return '📵';
    return player.name[0].toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {/* Avatar circle */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(0,0,0,0.5)',
        border: `2px solid ${statusColor()}`,
        boxShadow: isCurrent ? `0 0 0 3px rgba(245,158,11,0.35)` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Bebas Neue', fontSize: 18, color: 'white',
        opacity: player.connected === false ? 0.4 : 1,
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}>
        {statusIcon()}
      </div>

      {/* Name + score */}
      <div style={{
        background: 'rgba(0,0,0,0.65)',
        borderRadius: 6, padding: '2px 5px',
        textAlign: 'center', maxWidth: 72,
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: 'white',
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', maxWidth: 64,
        }}>
          {player.name}
        </div>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 12, color: '#f59e0b', lineHeight: 1 }}>
          {player.totalScore}
        </div>
      </div>

      {/* Card count */}
      <div style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 8, padding: '1px 6px',
        fontSize: 9, color: 'rgba(255,255,255,0.75)',
        whiteSpace: 'nowrap',
      }}>
        {player.hasBusted
          ? 'BUST'
          : player.hasStayed
          ? `${player.numberCards.length} stayed`
          : player.isFrozen
          ? `${player.numberCards.length} frozen`
          : `${player.numberCards.length}/7`}
      </div>

      {/* Modifier indicator */}
      {player.modifierCards.length > 0 && (
        <div style={{ fontSize: 8, color: '#ec4899' }}>
          {player.modifierCards.join(' ')}
        </div>
      )}
    </div>
  );
}

// ── CIRCULAR TABLE LAYOUT (2-4 players) ───────
// Returns absolute position {top,left,right,bottom,transform} for each slot
function getPositions(totalPlayers) {
  // totalPlayers includes ME at bottom
  // We position others (totalPlayers - 1) around the top half
  const others = totalPlayers - 1;

  if (others === 1) {
    // 2 players: opponent at top center
    return [{ top: 8, left: '50%', transform: 'translateX(-50%)' }];
  }
  if (others === 2) {
    // 3 players: top-left, top-right
    return [
      { top: 8, left: '15%' },
      { top: 8, right: '15%' },
    ];
  }
  if (others === 3) {
    // 4 players: top-center, middle-left, middle-right
    return [
      { top: 8,   left: '50%', transform: 'translateX(-50%)' },
      { top: '40%', left: 4,  transform: 'translateY(-50%)' },
      { top: '40%', right: 4, transform: 'translateY(-50%)' },
    ];
  }
  return [];
}

// ── CIRCULAR LAYOUT COMPONENT ─────────────────
function CircularLayout({ me, others, gameState, isMyTurn, onDraw }) {
  const positions = getPositions(gameState.players.length);

  return (
    <div className="game-table-wrapper">

      {/* Other players around the table */}
      {others.map((player, i) => {
        const pos = positions[i] || { top: 8, left: '50%', transform: 'translateX(-50%)' };
        const isCurrent = gameState.currentTurnPlayerId === player.id;
        return (
          <motion.div
            key={player.id}
            style={{ position: 'absolute', zIndex: 3, ...pos }}
            animate={isCurrent ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 1.5, repeat: isCurrent ? Infinity : 0 }}
          >
            <PlayerAvatar player={player} isCurrent={isCurrent} />
          </motion.div>
        );
      })}

      {/* Center oval table + deck */}
      <div className="center-table">
        <DeckStack
          count={gameState.deckRemaining}
          canAct={isMyTurn}
          onDraw={onDraw}
          small
        />
      </div>

      {/* ME — bottom, full card display */}
      <div className="me-slot">
        {/* My name + score header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>{me?.name}</span>
            <span style={{
              background: '#f59e0b', color: '#0f2d1c',
              fontSize: 9, fontWeight: 700, padding: '1px 5px',
              borderRadius: 4, fontFamily: 'Bebas Neue',
            }}>YOU</span>
            {me?.isHost && <span style={{ fontSize: 12 }}>👑</span>}
            {me?.secondChance && (
              <span style={{ fontSize: 10, color: '#10b981' }}>2ND CHANCE</span>
            )}
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: 16, color: '#f59e0b' }}>
            {me?.totalScore} pts
          </div>
        </div>

        {/* My cards */}
        <div className="me-card-row">
          <AnimatePresence>
            {me?.numberCards.length === 0 && !me?.hasBusted && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, alignSelf: 'center' }}>
                No cards yet
              </span>
            )}
            {me?.hasBusted && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                style={{ fontFamily: 'Bebas Neue', fontSize: 20, color: '#dc2626', marginRight: 6 }}
              >
                BUST! 💥
              </motion.span>
            )}
            {me?.numberCards.map((n, i) => (
              <motion.div
                key={`${n}-${i}`}
                initial={{ opacity: 0, y: -20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              >
                <Card card={{ type: 'number', value: n }} size="md" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* My modifier cards */}
        {me && me.modifierCards.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {me.modifierCards.map((mod, i) => (
              <Card key={`mod-${i}`} card={{ type: 'modifier', value: mod }} size="sm" />
            ))}
          </div>
        )}

        {/* Card count */}
        {me && !me.hasBusted && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            {me.numberCards.length}/7 cards
            {me.numberCards.length === 7 && (
              <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 4 }}>🌟 FLIP 7!</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── LIST LAYOUT COMPONENT (5-8 players) ───────
function ListLayout({ me, others, gameState, isMyTurn, onDraw }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 0' }}>
      {/* Other players */}
      {others.map(player => (
        <PlayerRow
          key={player.id}
          player={player}
          isMe={false}
          isCurrent={gameState.currentTurnPlayerId === player.id}
        />
      ))}

      {/* Deck in the middle of list */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
        <div style={{
          width: 160, height: 90, borderRadius: '50%',
          background: 'radial-gradient(ellipse at center,#2d6a4f 0%,#1a472a 70%,#0f2d1c 100%)',
          border: '5px solid #8B6914',
          boxShadow: '0 0 0 2px #5a4209,inset 0 0 20px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DeckStack count={gameState.deckRemaining} canAct={isMyTurn} onDraw={onDraw} small />
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: 8 }} />

      {/* Me */}
      {me && <PlayerRow player={me} isMe={true} isCurrent={isMyTurn} />}
    </div>
  );
}

// ── MAIN GAME COMPONENT ───────────────────────
export default function Game({ gameState, playerId, roomCode, bustEvent, flip7Event, actionCardEvent }) {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [visibleBust, setVisibleBust]     = useState(null);
  const [visibleFlip7, setVisibleFlip7]   = useState(null);
  const bustTimer  = useRef(null);
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

  const me     = gameState.players.find(p => p.id === playerId);
  const others = gameState.players.filter(p => p.id !== playerId);
  const useCircular = gameState.players.length <= 4;

  const isMyTurn =
    gameState.phase === 'playing' &&
    !gameState.pendingAction &&
    gameState.currentTurnPlayerId === playerId;

  // Turn banner label
  let turnLabel = '';
  let turnIsMe  = false;
  if (gameState.pendingAction) {
    if (gameState.pendingAction.drawerId === playerId) {
      turnLabel = '🃏 Choose who gets the card';
      turnIsMe  = true;
    } else {
      turnLabel = `🃏 ${gameState.pendingAction.drawerName} is choosing...`;
    }
  } else if (isMyTurn) {
    turnLabel = '⭐ YOUR TURN';
    turnIsMe  = true;
  } else {
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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: useCircular ? 0 : 130,
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px 6px', flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'Bebas Neue', fontSize: 24, color: '#f59e0b' }}>FLIP 7</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
            Round {gameState.roundNumber}
          </span>
          <button
            onClick={() => setShowScoreboard(true)}
            style={{
              fontSize: 11, background: 'rgba(255,255,255,0.1)',
              border: 'none', color: 'rgba(255,255,255,0.7)',
              padding: '3px 10px', borderRadius: 7, cursor: 'pointer',
            }}
          >
            Scores
          </button>
        </div>
      </div>

      {/* ── TURN BANNER ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={turnLabel}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            textAlign: 'center', padding: '6px 16px', flexShrink: 0,
            background: turnIsMe
              ? 'linear-gradient(90deg,transparent,rgba(245,158,11,0.15),transparent)'
              : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)',
            borderTop:    turnIsMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
            borderBottom: turnIsMe ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <span style={{
            fontFamily: 'Bebas Neue', fontSize: 18,
            color: turnIsMe ? '#f59e0b' : 'rgba(255,255,255,0.55)',
          }}>
            {turnLabel}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* ── MAIN LAYOUT ── */}
      {useCircular ? (
        <CircularLayout
          me={me}
          others={others}
          gameState={gameState}
          isMyTurn={isMyTurn}
          onDraw={handleDraw}
        />
      ) : (
        <ListLayout
          me={me}
          others={others}
          gameState={gameState}
          isMyTurn={isMyTurn}
          onDraw={handleDraw}
        />
      )}

      {/* ── BUST TOAST ── */}
      <AnimatePresence>
        {visibleBust && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            style={{
              position: 'fixed', top: 68, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              zIndex: 40, pointerEvents: 'none',
            }}
          >
            <div style={{
              background: '#dc2626', color: 'white',
              fontFamily: 'Bebas Neue', fontSize: 20,
              padding: '6px 20px', borderRadius: 999,
              boxShadow: '0 4px 20px rgba(220,38,38,0.5)',
            }}>
              {visibleBust} BUSTED! 💥
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FLIP 7 TOAST ── */}
      <AnimatePresence>
        {visibleFlip7 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'fixed', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 50, pointerEvents: 'none',
            }}
          >
            <div style={{
              background: '#f59e0b', color: '#0f2d1c',
              fontFamily: 'Bebas Neue', fontSize: 38,
              padding: '20px 28px', borderRadius: 20,
              boxShadow: '0 8px 40px rgba(245,158,11,0.6)',
              textAlign: 'center',
            }}>
              🌟 FLIP 7! 🌟<br />
              <span style={{ fontSize: 24 }}>{visibleFlip7}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTION POPUP ── */}
      {showActionPopup && actionCardEvent && (
        <ActionPopup
          action={actionCardEvent.card?.value || actionCardEvent.card}
          activePlayers={actionCardEvent.activePlayers || []}
          roomCode={roomCode}
          isDrawer={actionCardEvent.drawerId === playerId}
          drawerName={actionCardEvent.drawerName}
        />
      )}

      {/* ── SCOREBOARD ── */}
      {showScoreboard && (
        <ScoreboardModal
          scores={gameState.players}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* ── HIT / STAY BUTTONS ── */}
      <HitStayButtons
        roomCode={roomCode}
        canAct={isMyTurn}
        onHit={handleDraw}
      />
    </div>
  );
}