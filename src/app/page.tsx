import { Metadata } from "next";
import { config } from "@/config/landing";
import { Layout } from "@/components/landing/layout";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { GamificationPreview } from "@/components/landing/gamification-preview";
import { LearningStats } from "@/components/landing/learning-stats";
import { Pricing } from "@/components/landing/pricing";
import { Testimonials } from "@/components/landing/testimonials";
import { FAQ } from "@/components/landing/faq";

export const metadata: Metadata = {
  title: config.seo.title,
  description: config.seo.description,
  openGraph: {
    title: config.seo.title,
    description: config.seo.description,
    images: [config.seo.ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: config.seo.title,
    description: config.seo.description,
    creator: config.seo.twitterHandle,
    images: [config.seo.ogImage],
  },
};

export default function LandingPage() {
  return (
    <Layout config={config}>
      <Hero config={config} />
      <LearningStats />
      <FeaturesGrid features={config.features} />
      <GamificationPreview />
      <Testimonials testimonials={config.testimonials} />
      <Pricing plans={config.plans} />
      <FAQ items={config.faq} />
    </Layout>
  );
}
