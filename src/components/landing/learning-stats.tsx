"use client";

import { motion } from "framer-motion";

interface Stat {
  label: string;
  value: string;
  icon: React.ReactNode;
}

export function LearningStats() {
  const stats = [
    {
      label: "Understanding Guarantee",
      value: "100%",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Knowledge Retention",
      value: "Long-term",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "Learning Speed",
      value: "2x Faster",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="bg-base-200 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-3xl font-bold mb-4">Learn Smarter, Not Harder</h2>
        <p className="text-center text-base-content/70 mb-12 max-w-2xl mx-auto">
          Our AI ensures you truly understand every concept, making learning feel natural and effortless
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-base-100 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover:scale-110 transition-transform duration-300">
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold group-hover:text-primary transition-colors duration-300">{stat.value}</div>
                  <div className="text-base-content/60">{stat.label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 