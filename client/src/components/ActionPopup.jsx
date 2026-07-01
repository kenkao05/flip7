import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { socket } from "../socket";

export default function ActionPopup({
  action,
  activePlayers,
  roomCode,
  isDrawer,
  drawerName,
}) {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const cardColors = {
    Freeze: { bg: "#1e40af", border: "#3b82f6", icon: "❄️", label: "FREEZE" },
    FlipThree: {
      bg: "#5b21b6",
      border: "#8b5cf6",
      icon: "🃏",
      label: "FLIP THREE",
    },
  };

  const colors = cardColors[action] || {
    bg: "#374151",
    border: "#6b7280",
    icon: "?",
    label: action,
  };

  const handleConfirm = () => {
    if (!selected) return;
    socket.emit("select_target", { roomCode, targetId: selected });
    setConfirmed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 flex items-end justify-center pb-6 px-4"
      >
        <motion.div
          initial={{ y: 300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background: colors.bg,
            border: `2px solid ${colors.border}`,
          }}
        >
          {/* Header */}
          <div className="p-4 text-center">
            <div className="text-4xl mb-1">{colors.icon}</div>
            <div className="font-display text-2xl text-white">
              {colors.label}
            </div>
            {isDrawer ? (
              <p className="text-white/80 text-sm mt-1">
                Choose a target player
              </p>
            ) : (
              <p className="text-white/80 text-sm mt-1">
                <strong>{drawerName}</strong> is choosing a target...
              </p>
            )}
          </div>

          {/* Player list — only shown to drawer */}
          {isDrawer && !confirmed && (
            <div className="px-4 pb-2">
              {activePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl mb-2 font-semibold transition-all ${
                    selected === p.id
                      ? "bg-white text-gray-900 scale-105"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {p.name}
                  {p.id === socket.id && " (you)"}
                </button>
              ))}

              <button
                onClick={handleConfirm}
                disabled={!selected}
                className={`w-full py-3 rounded-xl font-bold mt-2 transition-all ${
                  selected
                    ? "bg-white text-gray-900 active:scale-95"
                    : "bg-white/20 text-white/40 cursor-not-allowed"
                }`}
              >
                Confirm Target
              </button>
            </div>
          )}

          {confirmed && (
            <div className="px-4 pb-4 text-center text-white/80 text-sm">
              Waiting for server...
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
