import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConnectionBanner({ connected, connecting }) {
  return (
    <AnimatePresence>
      {!connected && (
        <motion.div
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          exit={{ y: -60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 9999,
            background: connecting ? '#b45309' : '#dc2626',
            color: 'white',
            textAlign: 'center',
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
        >
          {connecting
            ? '⏳ Reconnecting... your game slot is held for 20 minutes'
            : '⚠️ Connection lost — attempting to reconnect'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}