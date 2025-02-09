"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useMotionValue, useSpring, useTransform } from "framer-motion";
import { RobotMascot } from "./robot-mascot";
import { RobotSpeechBubble } from "./robot-speech-bubble";

interface Message {
  text: string;
  expression: "happy" | "thinking" | "excited" | "winking" | "surprised" | "love";
  duration: number;
}

const messages: Message[] = [
  {
    text: "Hi! I'm Conceptly, your AI learning companion! 👋",
    expression: "excited",
    duration: 4000,
  },
  {
    text: "I'll help you master any subject with personalized lessons! 🎯",
    expression: "winking",
    duration: 4000,
  },
  {
    text: "Let's make learning fun and effective together! 🚀",
    expression: "love",
    duration: 4000,
  },
];

const hoverMessages: Message[] = [
  {
    text: "Click me to see what I can teach you! 📚",
    expression: "surprised",
    duration: 0,
  },
  {
    text: "Want to learn something cool? 🌟",
    expression: "excited",
    duration: 0,
  },
  {
    text: "Ready to boost your knowledge? 🚀",
    expression: "winking",
    duration: 0,
  },
  {
    text: "Let's make learning an adventure! ✨",
    expression: "love",
    duration: 0,
  },
  {
    text: "I wonder what we'll discover today... 🤔",
    expression: "thinking",
    duration: 0,
  },
  {
    text: "Knowledge awaits! Shall we begin? 🎯",
    expression: "excited",
    duration: 0,
  },
  {
    text: "I've got some fascinating topics for you! 🌈",
    expression: "love",
    duration: 0,
  },
  {
    text: "Curious about what I can teach? 🔍",
    expression: "thinking",
    duration: 0,
  },
  {
    text: "Learning is better with a friend like me! 🤖",
    expression: "winking",
    duration: 0,
  },
  {
    text: "Ready to unlock your potential? ⭐",
    expression: "surprised",
    duration: 0,
  },
  {
    text: "Together we can master anything! 💫",
    expression: "excited",
    duration: 0,
  },
  {
    text: "Every question is a new adventure! 🎨",
    expression: "love",
    duration: 0,
  },
  {
    text: "Let's solve some challenges together! 🧩",
    expression: "thinking",
    duration: 0,
  },
  {
    text: "Your personal learning companion awaits! 🌟",
    expression: "winking",
    duration: 0,
  },
  {
    text: "Imagine what you could learn today! 💭",
    expression: "surprised",
    duration: 0,
  }
];

interface InteractiveMascotProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  initialDelay?: number;
}

export function InteractiveMascot({
  className = "",
  size = "lg",
  initialDelay = 1000,
}: InteractiveMascotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(-1);
  const [isHovered, setIsHovered] = useState(false);
  const [customMessage, setCustomMessage] = useState<Message | null>(null);
  const [hoverCount, setHoverCount] = useState(0);
  
  // Mouse tracking values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(mouseY, [-100, 100], [5, -5]), {
    stiffness: 150,
    damping: 15,
  });
  const rotateY = useSpring(useTransform(mouseX, [-100, 100], [-5, 5]), {
    stiffness: 150,
    damping: 15,
  });

  // Scroll-based reactions
  const { scrollYProgress } = useScroll();
  useEffect(() => {
    const unsubscribe = scrollYProgress.onChange((latest) => {
      if (!isHovered) {
        if (latest > 0.8) {
          setCustomMessage({
            text: "You're almost at the end! Want to get started? 🎉",
            expression: "excited",
            duration: 0,
          });
        } else if (latest > 0.5) {
          setCustomMessage({
            text: "Keep exploring to learn more! 🔍",
            expression: "thinking",
            duration: 0,
          });
        } else {
          setCustomMessage(null);
        }
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress, isHovered]);

  // Mouse movement handler for 3D effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setCurrentMessageIndex(0);
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, [initialDelay]);

  useEffect(() => {
    if (currentMessageIndex >= 0 && !isHovered) {
      const timer = setTimeout(() => {
        setCurrentMessageIndex((prev) =>
          prev < messages.length - 1 ? prev + 1 : -1
        );
      }, messages[currentMessageIndex]?.duration || 3000);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, isHovered]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    setHoverCount((prev) => prev + 1);
    const messageIndex = hoverCount % hoverMessages.length;
    setCustomMessage(hoverMessages[messageIndex]);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setCustomMessage(null);
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleClick = () => {
    setCustomMessage({
      text: "I adapt to your learning style! Let's get started! ✨",
      expression: "love",
      duration: 0,
    });
  };

  const currentMessage = customMessage || messages[currentMessageIndex];

  return (
    <motion.div
      ref={ref}
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      whileHover={{ scale: 1.05 }}
      style={{
        perspective: 500,
        transformStyle: "preserve-3d",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 10 }}
    >
      <AnimatePresence mode="wait">
        {currentMessage && (
          <RobotSpeechBubble
            key={currentMessage.text}
            message={currentMessage.text}
            position="top"
          />
        )}
      </AnimatePresence>

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
      >
        <RobotMascot
          size={size}
          expression={currentMessage?.expression || "happy"}
          animate={true}
          className="cursor-pointer"
        />
      </motion.div>

      {/* Glow effect */}
      <motion.div
        className="absolute -inset-1 bg-primary/20 rounded-full blur-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.4, 0.2] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />

      {/* Interactive shadow */}
      <motion.div
        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-primary/30 rounded-full"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.div>
  );
} 