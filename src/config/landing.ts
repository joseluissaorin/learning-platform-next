export const config = {
  // Company/Product Info
  name: "Conceptly AI Tutor",
  tagline: "Master Any Concept Through Personalized AI Learning",
  description: "Experience the future of learning with Conceptly AI Tutor - where artificial intelligence meets personalized education. Like Duolingo, but for mastering any subject through bite-sized, interactive lessons.",
  
  // Contact & Support
  supportEmail: "support@conceptly.ai",
  contactEmail: "hello@conceptly.ai",
  
  // Social Links
  twitter: "https://twitter.com/conceptlyai",
  github: "https://github.com/conceptlyai",
  linkedin: "https://linkedin.com/company/conceptlyai",

  // Features
  features: [
    {
      title: "Smart Assessment System",
      description: "Our AI continuously evaluates your understanding through adaptive assessments, identifying knowledge gaps and ensuring deep comprehension.",
      icon: "brain",
    },
    {
      title: "Advanced Learning Analytics",
      description: "Track your progress with detailed analytics showing study patterns, topic mastery, and personalized recommendations for improvement.",
      icon: "chart",
    },
    {
      title: "Interactive Learning Journey",
      description: "Transform any study material into engaging, interactive lessons with our AI-powered content transformation system.",
      icon: "document",
    },
    {
      title: "Personalized Study Path",
      description: "Our AI adapts to your learning style, creating custom paths and providing real-time feedback to optimize your learning experience.",
      icon: "path",
    },
  ],

  // Pricing Plans
  plans: [
    {
      name: "Explorer",
      price: 9.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_basic_monthly",
      features: [
        "5 documents per month",
        "Basic assessments",
        "Learning analytics dashboard",
        "Progress tracking",
        "1 learning path",
      ],
    },
    {
      name: "Scholar",
      price: 19.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_pro_monthly",
      features: [
        "20 documents per month",
        "Advanced assessments",
        "Detailed analytics & insights",
        "Study pattern analysis",
        "5 learning paths",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      name: "Master",
      price: 49.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_enterprise_monthly",
      features: [
        "Unlimited documents",
        "Custom assessments",
        "Advanced analytics suite",
        "AI-powered recommendations",
        "Unlimited paths",
        "24/7 support",
        "Custom learning goals",
      ],
    },
  ],

  // FAQ
  faq: [
    {
      question: "How does Conceptly assess my learning progress?",
      answer: "Our AI-powered assessment system continuously evaluates your understanding through adaptive questions and exercises. It identifies knowledge gaps, tracks your mastery level, and adjusts the difficulty to ensure optimal learning.",
    },
    {
      question: "What kind of analytics does Conceptly provide?",
      answer: "Our advanced analytics dashboard shows your study patterns, topic mastery levels, best study times, and learning pace trends. You get personalized recommendations based on your performance and detailed insights into your learning journey.",
    },
    {
      question: "How does the AI tutoring adapt to my needs?",
      answer: "Our AI analyzes your learning patterns, assessment results, and study behavior to create a personalized experience. It adjusts explanations, generates custom practice questions, and provides targeted feedback to help you master concepts effectively.",
    },
    {
      question: "Can I track my progress over time?",
      answer: "Absolutely! Our comprehensive analytics system tracks your daily streaks, completion rates, mastery levels, and study patterns. You can visualize your progress through interactive charts and receive AI-powered suggestions for improvement.",
    },
  ],

  // Testimonials
  testimonials: [
    {
      name: "Sarah Johnson",
      role: "Medical Student",
      image: "/testimonials/sarah.jpg",
      content: "Conceptly transformed how I study medicine. The AI breaks down complex concepts perfectly, and the gamification keeps me coming back every day!",
    },
    {
      name: "David Chen",
      role: "Software Engineer",
      image: "/testimonials/david.jpg",
      content: "The way Conceptly structures information is genius. I've maintained a 60-day learning streak, and my understanding of new technologies has skyrocketed.",
    },
    {
      name: "Emily Brown",
      role: "History Teacher",
      image: "/testimonials/emily.jpg",
      content: "Both my students and I love Conceptly. It makes learning history interactive and engaging, while maintaining academic depth.",
    },
  ],

  // SEO
  seo: {
    title: "Conceptly AI Tutor - Your Personal AI Learning Companion",
    description: "Master any subject with Conceptly AI Tutor. Transform your study materials into engaging, interactive lessons powered by artificial intelligence.",
    ogImage: "/og-image.jpg",
    twitterHandle: "@conceptlyai",
  },

  // Legal
  legal: {
    terms: "/terms",
    privacy: "/privacy",
    cookies: "/cookies",
  },

  // Analytics & Tracking
  googleAnalyticsId: "G-XXXXXXXXXX", // Replace with actual GA ID
  posthogId: "phc_XXXXXXXXXX", // Replace with actual PostHog ID

  // Stripe
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    productsPage: "/pricing",
    billingPage: "/account/billing",
    portalPage: "/account/portal",
  },
} as const;

// Type for the config object
export type Config = typeof config;

// Helper to get feature by title
export function getFeatureByTitle(title: string) {
  return config.features.find(feature => feature.title === title);
}

// Helper to get plan by name
export function getPlanByName(name: string) {
  return config.plans.find(plan => plan.name === name);
}

// Helper to get plan by Stripe Price ID
export function getPlanByPriceId(priceId: string) {
  return config.plans.find(plan => plan.stripePriceId === priceId);
} 