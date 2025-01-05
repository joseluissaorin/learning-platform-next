import { Metadata } from "next";
import { config } from "@/config/landing";
import { Layout } from "@/components/landing/layout";
import { Hero } from "@/components/landing/hero";
import { FeaturesGrid } from "@/components/landing/features-grid";
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
      <FeaturesGrid features={config.features} />
      <Pricing plans={config.plans} />
      <Testimonials testimonials={config.testimonials} />
      <FAQ items={config.faq} />
    </Layout>
  );
}
