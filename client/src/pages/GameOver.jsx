import React from "react";
import { motion } from "motion/react";
import { socket } from "../socket";

export default function GameOver({
  winner,
  finalScores,
  playerId,
  roomCode,
  hostId,
}) {
  const isHost = playerId === hostId;
  const sorted = [...finalScores].sort((a, b) => b.totalScore - a.totalScore);
  const iWon = winner?.id === playerId;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      {/* Winner announcement */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <div className="text-6xl mb-3">{iWon ? "🏆" : "🎉"}</div>
        <h1 className="font-display text-4xl text-gold mb-1">
          {iWon ? "YOU WIN!" : `${winner?.name} WINS!`}
        </h1>
        <p className="text-white/50 text-sm">
          {iWon ? "Absolutely dominant." : `Better luck next time.`}
        </p>
      </motion.div>

      {/* Final scores */}
      <div className="w-full max-w-sm mb-8">
        <div className="text-white/50 text-xs uppercase tracking-widest mb-2">
          Final Scores
        </div>
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex items-center justify-between py-3 px-4 rounded-xl mb-2 ${
              i === 0 ? "bg-gold/20 border border-gold/30" : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-xl text-white/40 w-5">
                {i + 1}
              </span>
              <span className="font-semibold text-white">{player.name}</span>
            </div>
            <div className="font-display text-2xl text-gold">
              {player.totalScore}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Play again (host only) */}
      {isHost ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => socket.emit("play_again", { roomCode })}
          className="w-full max-w-sm py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
        >
          PLAY AGAIN
        </motion.button>
      ) : (
        <p className="text-white/40 text-sm">
          Waiting for host to start a new game...
        </p>
      )}
    </div>
  );
}
