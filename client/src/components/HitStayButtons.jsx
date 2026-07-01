import React from 'react';
import { motion } from 'motion/react';
import { socket } from '../socket';

export default function HitStayButtons({ roomCode, canAct, onHit }) {
  const emitStay = () => {
    if (!canAct) return;
    socket.emit('player_action', { roomCode, action: 'stay' });
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '12px 16px 20px',
      background: 'rgba(15,45,28,0.95)',
      backdropFilter: 'blur(8px)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      zIndex: 30,
    }}>
      {/* Status text */}
      <p style={{
        textAlign: 'center',
        color: canAct ? '#f59e0b' : 'rgba(255,255,255,0.3)',
        fontSize: 12,
        marginBottom: 10,
        fontWeight: 600,
        letterSpacing: '0.05em',
        margin: '0 0 10px 0',
      }}>
        {canAct ? 'TAP THE DECK TO DRAW — OR STAY TO BANK YOUR SCORE' : 'WAIT FOR YOUR TURN'}
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* STAY */}
        <motion.button
          whileTap={canAct ? { scale: 0.93 } : {}}
          onClick={emitStay}
          disabled={!canAct}
          style={{
            flex: 1,
            padding: '16px 0',
            borderRadius: 18,
            border: 'none',
            fontFamily: 'Bebas Neue',
            fontSize: 24,
            cursor: canAct ? 'pointer' : 'not-allowed',
            background: canAct ? '#3b82f6' : 'rgba(255,255,255,0.07)',
            color: canAct ? '#ffffff' : 'rgba(255,255,255,0.2)',
            transition: 'background 0.2s, color 0.2s',
            letterSpacing: '0.05em',
          }}
        >
          STAY
        </motion.button>

        {/* HIT */}
        <motion.button
          whileTap={canAct ? { scale: 0.93 } : {}}
          onClick={canAct ? onHit : undefined}
          disabled={!canAct}
          style={{
            flex: 1,
            padding: '16px 0',
            borderRadius: 18,
            border: 'none',
            fontFamily: 'Bebas Neue',
            fontSize: 24,
            cursor: canAct ? 'pointer' : 'not-allowed',
            background: canAct ? '#f59e0b' : 'rgba(255,255,255,0.07)',
            color: canAct ? '#0f2d1c' : 'rgba(255,255,255,0.2)',
            transition: 'background 0.2s, color 0.2s',
            letterSpacing: '0.05em',
          }}
        >
          HIT
        </motion.button>
      </div>
    </div>
  );
}