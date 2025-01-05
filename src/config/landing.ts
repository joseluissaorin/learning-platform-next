export const config = {
  // Company/Product Info
  name: "Learning Platform",
  tagline: "Transform Your Study Materials into an Intelligent Learning Journey",
  description: "An AI-powered learning platform that adapts to your needs and helps you master any subject through personalized learning paths.",
  
  // Contact & Support
  supportEmail: "support@learningplatform.com",
  contactEmail: "contact@learningplatform.com",
  
  // Social Links
  twitter: "https://twitter.com/learningplatform",
  github: "https://github.com/learningplatform",
  linkedin: "https://linkedin.com/company/learningplatform",

  // Features
  features: [
    {
      title: "AI-Powered Learning",
      description: "Our dual-LLM approach combines Claude and Gemini to create the most effective learning experience.",
      icon: "brain",
    },
    {
      title: "Smart Document Processing",
      description: "Upload any study material and let our AI transform it into structured learning units.",
      icon: "document",
    },
    {
      title: "Adaptive Learning Paths",
      description: "Get personalized learning paths that adapt to your understanding and pace.",
      icon: "path",
    },
    {
      title: "Interactive Learning",
      description: "Engage with the material through questions, explanations, and real-time feedback.",
      icon: "interactive",
    },
  ],

  // Pricing Plans
  plans: [
    {
      name: "Basic",
      price: 9.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_basic_monthly",
      features: [
        "5 documents per month",
        "Basic AI processing",
        "Standard support",
        "1 active subject",
      ],
    },
    {
      name: "Pro",
      price: 19.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_pro_monthly",
      features: [
        "20 documents per month",
        "Advanced AI processing",
        "Priority support",
        "5 active subjects",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: 49.99,
      interval: "month",
      currency: "USD",
      stripePriceId: "price_enterprise_monthly",
      features: [
        "Unlimited documents",
        "Premium AI processing",
        "24/7 support",
        "Unlimited subjects",
        "Custom integrations",
      ],
    },
  ],

  // FAQ
  faq: [
    {
      question: "How does the AI-powered learning work?",
      answer: "Our platform uses a combination of Claude and Gemini AI models to analyze your study materials, create structured learning paths, and provide intelligent explanations tailored to your understanding.",
    },
    {
      question: "What types of documents can I upload?",
      answer: "You can upload various formats including PDFs, Word documents, text files, and more. Our system will convert them into a format optimized for learning.",
    },
    {
      question: "Can I use the platform offline?",
      answer: "While full offline functionality isn't available, we cache your active learning materials for improved performance and partial offline access.",
    },
    {
      question: "How do you handle my data?",
      answer: "We follow strict GDPR compliance guidelines. Your data is encrypted, securely stored, and never shared with third parties.",
    },
  ],

  // Testimonials
  testimonials: [
    {
      name: "Sarah Johnson",
      role: "Medical Student",
      image: "/testimonials/sarah.jpg",
      content: "This platform has revolutionized how I study medical texts. The AI's ability to break down complex concepts is incredible.",
    },
    {
      name: "David Chen",
      role: "Software Engineer",
      image: "/testimonials/david.jpg",
      content: "I use it to stay updated with tech documentation. The personalized learning paths have made continuous learning much more manageable.",
    },
    {
      name: "Emily Brown",
      role: "History Teacher",
      image: "/testimonials/emily.jpg",
      content: "An invaluable tool for both teaching and personal development. The way it structures information is simply brilliant.",
    },
  ],

  // SEO
  seo: {
    title: "Learning Platform - AI-Powered Adaptive Learning",
    description: "Transform your study materials into personalized learning experiences with our AI-powered platform. Upload any document and start learning smarter.",
    ogImage: "/og-image.jpg",
    twitterHandle: "@learningplatform",
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