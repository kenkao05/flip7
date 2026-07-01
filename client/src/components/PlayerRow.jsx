import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Card from './Card';

export default function PlayerRow({ player, isMe, isCurrent }) {
  const statusLabel = () => {
    if (player.hasBusted) return { text: 'BUST', color: 'text-red-400' };
    if (player.hasStayed) return { text: 'STAYED', color: 'text-blue-300' };
    if (player.isFrozen) return { text: 'FROZEN ❄️', color: 'text-blue-300' };
    if (player.isActive) return { text: 'PLAYING', color: 'text-green-300' };
    return { text: '', color: '' };
  };

  const status = statusLabel();

  return (
    <motion.div
      layout
      className={`rounded-xl p-3 mb-2 transition-all duration-300 ${
        isMe
          ? 'bg-feltLight/50 border border-gold/40'
          : 'bg-black/20'
      } ${isCurrent ? 'pulse-gold' : ''}`}
    >
      {/* Player header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">
            {player.name}
          </span>
          {isMe && (
            <span className="text-yellow-400 text-xs">(you)</span>
          )}
          {player.isHost && (
            <span className="text-yellow-400 text-xs">👑</span>
          )}
          {status.text && (
            <span className={`text-xs font-bold ${status.color}`}>
              {status.text}
            </span>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-xs text-white/50">Total</div>
          <div className="font-display text-lg text-yellow-400">
            {player.totalScore}
          </div>
        </div>
      </div>

      {/* Cards area */}
      {player.hasBusted ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-2 py-2"
        >
          <span className="text-red-400 font-display text-3xl">BUST! 💥</span>
        </motion.div>
      ) : (
        <>
          {/* Number cards — full fan, all visible */}
          <div className="card-fan min-h-[52px]">
            <AnimatePresence>
              {player.numberCards.length === 0 && (
                <span className="text-white/30 text-xs italic self-center">
                  No cards yet
                </span>
              )}
              {player.numberCards.map((n, i) => (
                <motion.div
                  key={`${n}-${i}`}
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 22,
                    delay: i * 0.05,
                  }}
                >
                  <Card
                    card={{ type: 'number', value: n }}
                    size={isMe ? 'md' : 'sm'}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Modifier cards + Second Chance */}
          {(player.modifierCards.length > 0 || player.secondChance) && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {player.modifierCards.map((mod, i) => (
                <Card
                  key={`mod-${i}`}
                  card={{ type: 'modifier', value: mod }}
                  size="sm"
                />
              ))}
              {player.secondChance && (
                <Card
                  card={{ type: 'action', value: 'SecondChance' }}
                  size="sm"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Card count */}
      <div className="text-xs text-white/40 mt-1">
        {player.numberCards.length}/7 cards
        {player.numberCards.length === 7 && (
          <span className="text-yellow-400 font-bold ml-1">🌟 FLIP 7!</span>
        )}
      </div>
    </motion.div>
  );
}