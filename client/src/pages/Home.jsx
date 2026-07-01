import React, { useState } from "react";
import { motion } from "motion/react";
import { socket } from "../socket";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [error, setError] = useState("");

  socket.off("room_error");
  socket.on("room_error", ({ message }) => setError(message));

  const handleCreate = () => {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    setError("");
    socket.emit("create_room", { playerName: name.trim() });
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Enter a room code.");
      return;
    }
    setError("");
    socket.emit("join_room", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: name.trim(),
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
      {/* Title */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="text-center mb-10"
      >
        <h1 className="font-display text-7xl text-gold tracking-wide">
          FLIP 7
        </h1>
        <p className="text-white/60 text-sm mt-1">
          The card game. Online. With your friends.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Name input */}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={16}
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-base mb-4 outline-none focus:border-gold transition-colors"
        />

        {/* Mode buttons */}
        {!mode && (
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode("create")}
              className="flex-1 py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl"
            >
              CREATE
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setMode("join")}
              className="flex-1 py-4 bg-white/15 text-white font-display text-2xl rounded-2xl"
            >
              JOIN
            </motion.button>
          </div>
        )}

        {/* Create mode */}
        {mode === "create" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCreate}
              className="w-full py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl mb-3"
            >
              CREATE ROOM
            </motion.button>
            <button
              onClick={() => setMode(null)}
              className="w-full text-white/40 text-sm py-2"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Join mode */}
        {mode === "join" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <input
              type="text"
              placeholder="Room code (e.g. F7X4K2)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 text-base mb-3 outline-none focus:border-gold transition-colors room-code"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleJoin}
              className="w-full py-4 bg-gold text-feltDark font-display text-2xl rounded-2xl mb-3"
            >
              JOIN ROOM
            </motion.button>
            <button
              onClick={() => setMode(null)}
              className="w-full text-white/40 text-sm py-2"
            >
              Back
            </button>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mt-3"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
