import React, { useState } from "react";
import { motion } from "motion/react";
import { socket } from "../socket";
import ScoreboardModal from "../components/ScoreboardModal";

export default function RoundSummary({
  scores,
  roundNumber,
  playerId,
  roomCode,
  hostId,
}) {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const isHost = playerId === hostId;
  const sorted = [...scores].sort((a, b) => b.roundScore - a.roundScore);

  return (
    <div className="min-h-dvh flex flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="text-white/50 text-sm uppercase tracking-widest">
          Round {roundNumber}
        </div>
        <h1 className="font-display text-5xl text-gold">RESULTS</h1>
      </motion.div>

      {/* Round scores */}
      <div className="w-full max-w-sm mb-6">
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
              player.id === playerId
                ? "bg-gold/20 border border-gold/30"
                : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-white/40 w-5">
                {i + 1}
              </span>
              <span className="font-semibold text-white">{player.name}</span>
            </div>
            <div className="text-right">
              <div className="font-display text-2xl text-gold">
                +{player.roundScore}
              </div>
              <div className="text-xs text-white/40">
                Total: {player.totalScore}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* View full scoreboard */}
      <button
        onClick={() => setShowScoreboard(true)}
        className="text-white/60 text-sm underline mb-6"
      >
        View full scoreboard
      </button>

      {/* Start next round (host only) */}
      {isHost ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => socket.emit("start_next_round", { roomCode })}
          className="w-full max-w-sm py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
        >
          NEXT ROUND
        </motion.button>
      ) : (
        <p className="text-white/40 text-sm">
          Waiting for host to start next round...
        </p>
      )}

      {showScoreboard && (
        <ScoreboardModal
          scores={scores}
          onClose={() => setShowScoreboard(false)}
        />
      )}
    </div>
  );
}
