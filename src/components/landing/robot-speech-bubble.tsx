"use client";

import { motion } from "framer-motion";

interface RobotSpeechBubbleProps {
  message: string;
  position?: "left" | "right" | "top" | "bottom";
  className?: string;
}

export function RobotSpeechBubble({
  message,
  position = "right",
  className = "",
}: RobotSpeechBubbleProps) {
  const positionClasses = {
    left: "right-full mr-2",
    right: "left-full ml-2",
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
  };

  const arrowClasses = {
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-90",
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 -rotate-90",
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-180",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
  };

  return (
    <motion.div
      className={`absolute whitespace-nowrap ${positionClasses[position]} ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative bg-white rounded-xl px-4 py-2 shadow-lg">
        <div
          className={`absolute w-3 h-3 bg-white transform rotate-45 ${arrowClasses[position]}`}
        />
        <motion.p
          className="relative text-sm font-medium text-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
} 