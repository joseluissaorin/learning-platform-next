"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { type HeroProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";
import { InteractiveMascot } from "./interactive-mascot";
import { TitleSection } from "./title-section";

export function Hero({ config }: HeroProps) {
  const basicPlan = config.plans[0];
  const price = basicPlan ? `€${basicPlan.price}/${basicPlan.interval}` : "";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-base-100 to-base-100">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5" />
        <div className="absolute top-20 -left-20 h-40 w-40 rounded-full bg-secondary/5" />
      </div>

      <TitleSection />

      <div className="container relative mx-auto flex min-h-[calc(100vh-32rem)] flex-col items-center justify-start gap-4 px-8 py-8 lg:flex-row lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-6 text-center lg:w-1/2 lg:items-start lg:text-left"
        >
          <div className="flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            >
              🎓 The Future of Learning is Here
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl font-extrabold tracking-tight lg:text-6xl"
            >
              {config.tagline.split(" ").map((word, i) => (
                <span
                  key={i}
                  className={
                    i % 3 === 2
                      ? "ml-1 whitespace-nowrap bg-primary px-2 text-white md:ml-1.5 md:px-4 leading-relaxed"
                      : ""
                  }
                >
                  {word}{" "}
                </span>
              ))}
            </motion.h2>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-lg leading-relaxed text-base-content/80 lg:text-xl lg:leading-relaxed"
          >
            {config.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex w-full flex-col items-center gap-4 lg:w-auto lg:flex-row lg:gap-6"
          >
            <ButtonCheckout
              priceId={basicPlan?.stripePriceId || ""}
              className="btn-primary btn-wide btn-lg btn relative overflow-hidden rounded-xl px-8 py-4 transition-all duration-300 hover:shadow-[0_8px_25px_-8px_rgba(29,78,216,0.5)] before:absolute before:inset-0 before:-z-10 before:translate-y-full before:rounded-xl before:bg-gradient-to-t before:from-white/10 before:to-transparent before:transition-transform before:duration-300 hover:before:translate-y-0 hover:brightness-110"
            >
              <span className="relative z-10 flex items-center gap-3 px-2">
                Start Learning for {price}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </ButtonCheckout>
            <a
              className="btn-outline btn-wide btn-lg btn group relative overflow-hidden rounded-xl px-8 py-4 transition-all duration-300 hover:border-primary hover:bg-transparent hover:text-primary before:absolute before:inset-0 before:-z-10 before:translate-y-[102%] before:rounded-xl before:bg-gradient-to-t before:from-primary/10 before:to-transparent before:transition-transform before:duration-300 hover:before:translate-y-0"
              href="#features"
            >
              <span className="relative z-10 flex items-center gap-3 px-2">
                See How It Works
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative lg:w-1/2"
        >
          <div className="relative">
            <Image
              src="/demo-platform.png"
              alt={`${config.name} in action - AI-powered learning platform`}
              className="rounded-2xl shadow-[0_20px_50px_-10px_rgba(29,78,216,0.15)]"
              priority={true}
              width={1200}
              height={0}
              style={{ width: '600px', height: 'auto' }}
            />
            
            {/* Achievement popup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="absolute -right-6 -top-6 flex items-center gap-3 rounded-xl bg-white p-4 shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <p className="font-semibold">Concept Mastered!</p>
                <p className="text-sm text-base-content/60">Neural Networks</p>
              </div>
            </motion.div>

            {/* Streak counter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="absolute -bottom-6 -left-6 rounded-xl bg-white p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-content">
                  <span className="text-xl">🔥</span>
                </div>
                <div>
                  <p className="font-semibold">30 Day Streak!</p>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-base-300">
                    <div className="h-full w-4/5 bg-primary" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Interactive Mascot */}
            <div className="absolute -right-12 -bottom-12 z-10">
              <InteractiveMascot size="lg" initialDelay={2000} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
} 