import React from "react";
import { motion, AnimatePresence } from "motion/react";

export default function ConnectionBanner({ connected, connecting }) {
  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-50 bg-yellow-600 text-white text-center py-2 text-sm font-semibold"
        >
          {connecting
            ? "⏳ Connecting to server..."
            : "⚠️ Disconnected. Reconnecting..."}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
