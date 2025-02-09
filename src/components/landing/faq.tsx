"use client";

import { useRef, useState, useEffect } from "react";
import { Search, X, ChevronDown, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type FAQProps } from "@/types/landing";

interface FAQItem {
  question: string;
  answer: React.ReactNode;
  category: "general" | "features" | "technical" | "pricing" | "support";
}

const faqList: FAQItem[] = [
  {
    question: "What exactly is Conceptly?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Conceptly is an AI-powered learning platform that transforms how you understand and master new concepts. Like Duolingo, but for any subject. Key features include:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Smart Assessment System that adapts to your understanding</li>
          <li>Three-layer concept exploration for deeper learning</li>
          <li>Interactive questioning and personalized explanations</li>
          <li>Progress tracking and detailed analytics</li>
          <li>AI-powered content processing that makes any study material interactive</li>
        </ul>
      </div>
    ),
    category: "general",
  },
  {
    question: "How does the three-layer learning system work?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our unique three-layer system helps you progressively master concepts:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Layer 1: High-level overview and main concepts</li>
          <li>Layer 2: Detailed explanations and relationships between concepts</li>
          <li>Layer 3: Deep dive with interactive exercises and practical applications</li>
        </ul>
        <p>
          You can move between layers freely, allowing you to learn at your own pace and depth.
        </p>
      </div>
    ),
    category: "features",
  },
  {
    question: "How does Conceptly assess my learning?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our AI-powered assessment system continuously evaluates your understanding through:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Adaptive questions that adjust to your knowledge level</li>
          <li>Analysis of your explanations and responses</li>
          <li>Tracking of concept mastery and learning patterns</li>
          <li>Spaced repetition for better long-term retention</li>
        </ul>
        <p>
          This helps us provide personalized feedback and optimize your learning path.
        </p>
      </div>
    ),
    category: "features",
  },
  {
    question: "What kind of analytics do you provide?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our comprehensive analytics dashboard shows:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Your progress across different concepts and subjects</li>
          <li>Mastery levels and knowledge gaps</li>
          <li>Study patterns and optimal learning times</li>
          <li>Personalized recommendations for improvement</li>
          <li>Learning pace trends and milestone achievements</li>
        </ul>
      </div>
    ),
    category: "features",
  },
  {
    question: "Can I upload my own study materials?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Yes! Conceptly can process your study materials (up to 15MB) and transform them into interactive learning experiences. We support:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Text documents and PDFs</li>
          <li>Markdown files</li>
          <li>Structured educational content</li>
        </ul>
        <p>
          Our AI system analyzes your materials to create a personalized learning structure with questions, explanations, and exercises.
        </p>
      </div>
    ),
    category: "technical",
  },
  {
    question: "Do you offer student discounts?",
    answer: (
      <p>
        Yes! We offer a 50% discount for students with a valid student email address. We believe in making quality education accessible to everyone.
      </p>
    ),
    category: "pricing",
  },
  {
    question: "Is my data secure?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Absolutely! We take your privacy and security seriously:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>GDPR-compliant data handling</li>
          <li>Secure Google OAuth authentication</li>
          <li>Encrypted data storage</li>
          <li>Regular security audits</li>
        </ul>
      </div>
    ),
    category: "technical",
  },
  {
    question: "How can I get help if I need it?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          We're here to help! You can reach us through:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Email: support@conceptly.ai</li>
          <li>Twitter: @conceptlyai</li>
          <li>LinkedIn: /company/conceptlyai</li>
        </ul>
        <p>
          Our support team typically responds within 24 hours.
        </p>
      </div>
    ),
    category: "support",
  },
  {
    question: "How does the gamification system work?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our gamification features keep you motivated:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Earn achievements like "Quick Learner" and "Knowledge Seeker"</li>
          <li>Maintain learning streaks for consistent progress</li>
          <li>Track your mastery level across different topics</li>
          <li>Compete with yourself through personal best records</li>
        </ul>
      </div>
    ),
    category: "features",
  },
  {
    question: "What's special about the spaced repetition system?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our spaced repetition system optimizes your learning:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Automatically schedules reviews based on your performance</li>
          <li>Adapts intervals from 1 day to 6 months</li>
          <li>Focuses on concepts you find challenging</li>
          <li>Uses AI to evaluate your understanding depth</li>
        </ul>
      </div>
    ),
    category: "features",
  },
  {
    question: "How does Conceptly determine my best study times?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our analytics engine analyzes your learning patterns to identify:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Most productive hours of the day</li>
          <li>Optimal session lengths (typically 25-45 minutes)</li>
          <li>Days when you show highest retention</li>
          <li>Focus scores based on session effectiveness</li>
        </ul>
      </div>
    ),
    category: "features",
  },
  {
    question: "What are the system requirements?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Conceptly is a web-based platform that works on:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Any modern web browser (Chrome, Firefox, Safari, Edge)</li>
          <li>Desktop and mobile devices</li>
          <li>Stable internet connection</li>
          <li>No installation required</li>
        </ul>
      </div>
    ),
    category: "technical",
  },
];

interface ItemProps {
  item: FAQItem;
  index: number;
}

const Item = ({ item, index }: ItemProps) => {
  const accordion = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="bg-background rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
    >
      <button
        className={`relative flex gap-2 items-center w-full p-6 text-base font-medium text-left transition-all duration-300 ${
          isOpen ? "bg-primary/5 rounded-t-lg" : "rounded-lg hover:bg-muted"
        }`}
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span className="text-xs font-mono text-muted-foreground mr-2">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span
          className={`flex-1 text-base-content ${
            isOpen ? "text-primary font-semibold" : ""
          }`}
        >
          {item?.question}
        </span>
        <ChevronDown
          className={`flex-shrink-0 w-5 h-5 text-primary transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-2 leading-relaxed text-muted-foreground">
              {item?.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
};

const CategoryButton = ({ 
  category, 
  isSelected, 
  onClick 
}: { 
  category: { value: FAQItem["category"] | "all"; label: string }; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
      isSelected
        ? "bg-primary text-primary-foreground shadow-md"
        : "bg-muted hover:bg-muted/80 text-muted-foreground"
    }`}
  >
    {category.label}
  </button>
);

const TableView = ({ items }: { items: FAQItem[] }) => (
  <div className="overflow-hidden rounded-lg border border-border bg-background">
    <table className="w-full">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
          <th className="px-6 py-3 text-left text-sm font-medium text-muted-foreground">Question</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item, i) => (
          <tr
            key={i}
            className="group transition-colors hover:bg-muted/50"
            onClick={() => window.location.hash = `faq-${i}`}
            style={{ cursor: 'pointer' }}
          >
            <td className="whitespace-nowrap px-6 py-4 text-sm capitalize">
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary/10 text-primary">
                {item.category}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="text-sm font-medium text-foreground group-hover:text-primary">
                {item.question}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export function FAQ({ items }: FAQProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    FAQItem["category"] | "all"
  >("all");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);

  useEffect(() => {
    // Handle hash changes for direct links to questions
    const hash = window.location.hash;
    if (hash.startsWith('#faq-')) {
      const index = parseInt(hash.replace('#faq-', ''));
      if (!isNaN(index) && index >= 0 && index < faqList.length) {
        setSelectedQuestion(faqList[index].question);
      }
    }
  }, []);

  const filteredFAQs = faqList.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: Array<{ value: FAQItem["category"] | "all"; label: string }> = [
    { value: "all", label: "All Questions" },
    { value: "general", label: "General" },
    { value: "features", label: "Features" },
    { value: "technical", label: "Technical" },
    { value: "pricing", label: "Pricing" },
    { value: "support", label: "Support" },
  ];

  const questionsInCategory = (category: FAQItem["category"] | "all") =>
    faqList.filter(
      (item) => category === "all" || item.category === category
    ).length;

  return (
    <section className="bg-gradient-to-b from-base-200 to-background" id="faq">
      <div className="max-w-7xl mx-auto px-8 py-16 md:py-32">
        <div className="text-center space-y-4 mb-16">
          <h2 className="font-extrabold text-4xl lg:text-6xl tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about Conceptly and how it can help you learn more effectively.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg -m-1 blur-xl" />
            <div className="relative bg-background rounded-lg shadow-sm border border-input/50">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 bg-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <CategoryButton
                key={category.value}
                category={category}
                isSelected={selectedCategory === category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setSelectedQuestion(null);
                }}
              />
            ))}
          </div>

          {/* FAQ List */}
          <motion.div layout className="space-y-4">
            {filteredFAQs.length > 0 ? (
              selectedCategory === "all" && !searchQuery ? (
                <TableView items={filteredFAQs} />
              ) : (
                <ul className="space-y-4">
                  {filteredFAQs.map((item, i) => (
                    <Item 
                      item={item} 
                      key={i} 
                      index={i} 
                    />
                  ))}
                </ul>
              )
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 px-6 bg-background rounded-lg border-2 border-dashed border-muted"
              >
                <Hash className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No questions found
                </p>
                <p className="text-sm text-muted-foreground/80">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* Stats */}
          {!searchQuery && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-border">
              {categories.slice(1).map((category) => (
                <div key={category.value} className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {questionsInCategory(category.value)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {category.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
} 