"use client";

import { motion } from "framer-motion";

interface Expression {
  eyes: string;
  mouth: string;
  eyeAnimation: {
    scale?: number[];
    rotate?: number[];
    y?: number[];
    scaleY?: number[];
  };
  // Fixed position for consistent animations
  eyePosition?: {
    x: number;
    y: number;
  };
}

interface RobotMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  expression?: "happy" | "thinking" | "excited" | "winking" | "surprised" | "love";
  animate?: boolean;
}

export function RobotMascot({ className = "", size = "md", expression = "happy", animate = true }: RobotMascotProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  // Define fixed eye center position
  const EYE_CENTER_X = 17;
  const EYE_CENTER_Y = 20;
  const MAX_MOVEMENT = 1.5;

  const expressions: { [K in NonNullable<RobotMascotProps["expression"]>]: Expression } = {
    happy: {
      eyes: `M ${EYE_CENTER_X - 2},${EYE_CENTER_Y} Q ${EYE_CENTER_X},${EYE_CENTER_Y - 2} ${EYE_CENTER_X + 2},${EYE_CENTER_Y}`,
      mouth: "M 12,25 Q 17,28 22,25",
      eyeAnimation: { 
        scale: [1, 1.05, 1],
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
    thinking: {
      // Question mark shape - smaller and centered with increased spacing
      eyes: `M ${EYE_CENTER_X - 0.75},${EYE_CENTER_Y - 1.5} 
             C ${EYE_CENTER_X - 0.75},${EYE_CENTER_Y - 2} ${EYE_CENTER_X + 1.5},${EYE_CENTER_Y - 2} ${EYE_CENTER_X + 1.5},${EYE_CENTER_Y - 0.75}
             C ${EYE_CENTER_X + 1.5},${EYE_CENTER_Y - 0.25} ${EYE_CENTER_X + 0.75},${EYE_CENTER_Y - 0.25} ${EYE_CENTER_X + 0.75},${EYE_CENTER_Y + 0.5}
             M ${EYE_CENTER_X + 0.75},${EYE_CENTER_Y + 2} L ${EYE_CENTER_X + 0.75},${EYE_CENTER_Y + 2}`,
      mouth: "M 12,25 Q 17,28 22,25",
      eyeAnimation: { 
        rotate: [-2, 2, -2],
        scale: [1, 1, 1], // Added to ensure consistent size
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
    excited: {
      eyes: `M ${EYE_CENTER_X - 2},${EYE_CENTER_Y} Q ${EYE_CENTER_X},${EYE_CENTER_Y - 1.5} ${EYE_CENTER_X + 2},${EYE_CENTER_Y}`,
      mouth: "M 12,25 Q 17,30 22,25",
      eyeAnimation: { 
        y: [0, -MAX_MOVEMENT, 0],
        scale: [1, 1, 1], // Added to ensure consistent size
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
    winking: {
      eyes: `M ${EYE_CENTER_X - 2},${EYE_CENTER_Y} Q ${EYE_CENTER_X},${EYE_CENTER_Y - 2} ${EYE_CENTER_X + 2},${EYE_CENTER_Y}`,
      mouth: "M 12,25 Q 17,28 22,25",
      eyeAnimation: { 
        scaleY: [1, 0.2, 1],
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
    surprised: {
      eyes: `M ${EYE_CENTER_X - 1.5},${EYE_CENTER_Y} a 1.5,1.5 0 1,0 3,0 a 1.5,1.5 0 1,0 -3,0`,
      mouth: "M 12,25 Q 17,29 22,25",
      eyeAnimation: { 
        scale: [1, 1.1, 1],
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
    love: {
      eyes: `M ${EYE_CENTER_X},${EYE_CENTER_Y} 
             l -1.5,-1.5 l 1.5,1.5 l 1.5,-1.5 
             l -1.5,1.5 l 1.5,1.5 l -1.5,-1.5 
             l -1.5,1.5 z`,
      mouth: "M 12,25 Q 17,28 22,25",
      eyeAnimation: { 
        scale: [1, 1.1, 1],
      },
      eyePosition: {
        x: EYE_CENTER_X,
        y: EYE_CENTER_Y,
      },
    },
  };

  const currentExpression = expressions[expression];

  return (
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      initial={animate ? { rotate: 0 } : undefined}
      animate={animate ? {
        rotate: [0, -2, 2, -2, 0],
        y: [0, -1, 0],
      } : undefined}
      transition={{
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      {/* Robot Head */}
      <motion.svg
        viewBox="0 0 40 40"
        className="w-full h-full drop-shadow-lg"
        initial={false}
      >
        {/* Head Background Glow */}
        <motion.path
          d="M 8,10 L 32,10 Q 35,10 35,13 L 35,32 Q 35,35 32,35 L 8,35 Q 5,35 5,32 L 5,13 Q 5,10 8,10"
          fill="hsl(var(--primary))"
          className="opacity-20"
          initial={animate ? { scale: 1.05 } : undefined}
          animate={animate ? { scale: [1.05, 1.1, 1.05] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Head */}
        <motion.path
          d="M 8,10 L 32,10 Q 35,10 35,13 L 35,32 Q 35,35 32,35 L 8,35 Q 5,35 5,32 L 5,13 Q 5,10 8,10"
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          initial={animate ? { scale: 0.95 } : undefined}
          animate={animate ? { scale: 1 } : undefined}
          transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
        />

        {/* Antenna with glow */}
        <motion.circle
          cx="20"
          cy="5"
          r="1.5"
          className="text-white"
          fill="currentColor"
          initial={animate ? { opacity: 0.4 } : undefined}
          animate={animate ? { opacity: [0.4, 0.8, 0.4] } : undefined}
          transition={{ duration: 1, repeat: Infinity }}
        />
        <motion.path
          d="M 20,10 L 20,5 M 18,5 L 22,5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="text-white"
          initial={animate ? { y: 0 } : undefined}
          animate={animate ? { y: [-1, 1, -1] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Single Eye with fixed positioning */}
        <motion.g
          initial={false}
          animate={currentExpression.eyeAnimation}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            transformOrigin: `${currentExpression.eyePosition?.x || EYE_CENTER_X}px ${currentExpression.eyePosition?.y || EYE_CENTER_Y}px`,
          }}
          key={expression} // Added to force animation reset on expression change
        >
          <motion.path
            d={currentExpression.eyes}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-white"
            fill={expression === "surprised" || expression === "love" ? "currentColor" : "none"}
          />
        </motion.g>

        {/* Mouth */}
        <motion.path
          d={currentExpression.mouth}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-white"
          fill="none"
          initial={animate ? { scale: 1 } : undefined}
          animate={animate ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Cheek Lights */}
        <motion.circle
          cx="8"
          cy="23"
          r="2"
          className="text-white"
          fill="currentColor"
          initial={animate ? { opacity: 0.4 } : undefined}
          animate={animate ? { opacity: [0.4, 0.8, 0.4] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle
          cx="32"
          cy="23"
          r="2"
          className="text-white"
          fill="currentColor"
          initial={animate ? { opacity: 0.4 } : undefined}
          animate={animate ? { opacity: [0.4, 0.8, 0.4] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.svg>
    </motion.div>
  );
} 