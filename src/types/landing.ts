import { type Config } from "@/config/landing";

// Common Props
export interface WithChildrenProps {
  children: React.ReactNode;
}

// Feature Types
export interface Feature {
  title: string;
  description: string;
  icon: string;
}

// Pricing Types
export interface PricingPlan {
  name: string;
  price: number;
  interval: "month" | "year";
  currency: string;
  stripePriceId: string;
  features: readonly string[];
  highlighted?: boolean;
}

// Testimonial Types
export interface Testimonial {
  name: string;
  role: string;
  image: string;
  content: string;
}

// FAQ Types
export interface FAQItem {
  question: string;
  answer: string | React.ReactNode;
}

// Component Props
export interface HeroProps {
  config: Config;
}

export interface FeaturesGridProps {
  features: readonly Feature[];
}

export interface PricingProps {
  plans: readonly PricingPlan[];
}

export interface TestimonialsProps {
  testimonials: readonly Testimonial[];
}

export interface FAQProps {
  items: readonly FAQItem[];
}

export interface CTAProps {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

export interface ButtonCheckoutProps {
  priceId: string;
  children: React.ReactNode;
  className?: string;
}

export interface ButtonSigninProps {
  className?: string;
}

export interface ButtonSupportProps {
  email: string;
  className?: string;
}

// Animation Props
export interface ScrollAnimationProps extends WithChildrenProps {
  animation?: "fade" | "slide" | "zoom";
  duration?: number;
  delay?: number;
}

// Modal Props
export interface ModalProps extends WithChildrenProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// Mobile Menu Types
export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  config: Config;
}

// Layout Props
export interface LayoutProps extends WithChildrenProps {
  config: Config;
} 