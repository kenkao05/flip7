import React from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ScoreboardModal({ scores, onClose }) {
  const sorted = [...scores].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-feltDark border border-white/10 rounded-2xl p-6 w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-display text-3xl text-gold text-center mb-4">
            SCOREBOARD
          </h2>

          {sorted.map((player, i) => (
            <div
              key={player.id}
              className={`flex items-center justify-between py-3 border-b border-white/10 ${
                i === 0 ? "text-gold" : "text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-xl w-6">{i + 1}</span>
                <span className="font-semibold">{player.name}</span>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl">{player.totalScore}</div>
                {player.roundScore !== undefined && (
                  <div className="text-xs text-white/50">
                    +{player.roundScore} this round
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-white/10 rounded-xl text-white font-semibold hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
