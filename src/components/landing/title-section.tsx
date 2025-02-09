"use client";

import { motion } from "framer-motion";
import { InteractiveMascot } from "./interactive-mascot";

export function TitleSection() {
  return (
    <div className="container relative mx-auto mt-16 px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center gap-8"
      >
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-8xl md:text-9xl font-black tracking-tight text-primary"
        >
          Conceptly
        </motion.h1>
        <div className="relative w-24 h-24 md:w-32 md:h-32">
          <InteractiveMascot size="lg" initialDelay={1000} />
        </div>
      </motion.div>
      <motion.div 
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mx-auto mt-4 h-px w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      />
    </div>
  );
} 