import React from "react";
import { motion } from "motion/react";

const cardVariants = {
  hidden: { opacity: 0, y: -40, rotateY: 90, scale: 0.8 },
  visible: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
  bust: {
    x: [0, -8, 8, -8, 8, 0],
    backgroundColor: "#dc2626",
    transition: { duration: 0.4 },
  },
  exit: { opacity: 0, scale: 0.6, transition: { duration: 0.2 } },
};

const CARD_COLORS = {
  number: {
    bg: "#f8f4e8",
    text: "#1a1a1a",
    border: "#c8b89a",
  },
  action_Freeze: {
    bg: "#dbeafe",
    text: "#1e40af",
    border: "#3b82f6",
    label: "❄️",
  },
  action_FlipThree: {
    bg: "#ede9fe",
    text: "#5b21b6",
    border: "#8b5cf6",
    label: "×3",
  },
  action_SecondChance: {
    bg: "#d1fae5",
    text: "#065f46",
    border: "#10b981",
    label: "✓",
  },
  modifier_X2: {
    bg: "#fef3c7",
    text: "#92400e",
    border: "#f59e0b",
  },
  modifier_plus: {
    bg: "#fce7f3",
    text: "#831843",
    border: "#ec4899",
  },
};

function getCardStyle(card) {
  if (card.type === "number") return CARD_COLORS.number;
  if (card.type === "action") {
    return CARD_COLORS[`action_${card.value}`] || CARD_COLORS.number;
  }
  if (card.type === "modifier") {
    if (card.value === "X2") return CARD_COLORS.modifier_X2;
    return CARD_COLORS.modifier_plus;
  }
  return CARD_COLORS.number;
}

function getCardLabel(card) {
  if (card.type === "number") return card.value;
  if (card.type === "action") {
    if (card.value === "Freeze") return "❄️ FREEZE";
    if (card.value === "FlipThree") return "× FLIP 3";
    if (card.value === "SecondChance") return "✓ 2ND";
  }
  if (card.type === "modifier") return card.value;
  return "?";
}

export default function Card({
  card,
  size = "md",
  busting = false,
  animate = true,
}) {
  const style = getCardStyle(card);
  const label = getCardLabel(card);

  const sizeClasses = {
    sm: "w-10 h-14 text-lg",
    md: "w-14 h-20 text-2xl",
    lg: "w-16 h-24 text-3xl",
  };

  const content = (
    <div
      className={`card-base ${sizeClasses[size]} flex-col gap-0 relative`}
      style={{
        background: style.bg,
        color: style.text,
        borderColor: style.border,
        borderWidth: 2,
      }}
    >
      <span className="font-display leading-none select-none">{label}</span>
      {card.type === "number" && (
        <span className="absolute bottom-1 right-1 text-xs opacity-40 font-display rotate-180">
          {label}
        </span>
      )}
    </div>
  );

  if (!animate) return content;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate={busting ? "bust" : "visible"}
      exit="exit"
      style={{ perspective: 800 }}
    >
      {content}
    </motion.div>
  );
}
