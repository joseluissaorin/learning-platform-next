"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { InteractiveMascot } from "./interactive-mascot";

export function GamificationPreview() {
  const achievements = [
    {
      name: "Quick Learner",
      description: "Complete 5 lessons in one day",
      icon: "🚀",
      progress: 80,
    },
    {
      name: "Knowledge Seeker",
      description: "Master 10 different concepts",
      icon: "🎓",
      progress: 60,
    },
    {
      name: "Streak Master",
      description: "Maintain a 7-day learning streak",
      icon: "🔥",
      progress: 100,
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-base-100 to-base-200">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-4xl font-bold">Learning Made Fun</h2>
              <InteractiveMascot size="sm" className="hidden lg:block" />
            </div>
            <p className="text-lg text-base-content/80 mb-8">
              Stay motivated with gamification features inspired by the world's best learning apps.
              Track your progress, earn achievements, and maintain your learning streak!
            </p>
            
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <motion.div
                  key={achievement.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  viewport={{ once: true }}
                  className="bg-base-100 rounded-lg p-4 shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{achievement.name}</h3>
                      <p className="text-sm text-base-content/60">{achievement.description}</p>
                      <div className="mt-2 h-2 bg-base-300 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${achievement.progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          viewport={{ once: true }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="absolute -top-4 -left-4 bg-primary text-white font-medium text-sm px-3 py-1 rounded-full shadow-lg">
                🔥 30 Day Streak!
              </div>
              <div className="bg-base-100 rounded-2xl shadow-xl p-6 border border-base-300">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Your Learning Journey</h3>
                    <p className="text-base-content/60">Making progress every day</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐️</span>
                    <span className="font-bold">1,234</span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xl">📚</span>
                      </div>
                      <div>
                        <h4 className="font-semibold">Daily Goal</h4>
                        <p className="text-sm text-base-content/60">3/5 lessons completed</p>
                      </div>
                    </div>
                    <div className="w-20 h-20">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          className="stroke-base-300"
                          strokeWidth="10"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          className="stroke-primary"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray="283"
                          strokeDashoffset="113"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Mascot */}
              <div className="absolute -right-8 -bottom-8 z-10">
                <InteractiveMascot size="md" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 