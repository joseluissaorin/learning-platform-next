"use client";

import { useState } from "react";
import Link from "next/link";
import { type LayoutProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";
import { MobileMenu } from "./mobile-menu";

export function Layout({ config, children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const basicPlan = config.plans[0];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-base-100/80 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              {config.name}
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              <Link href="#features" className="hover:text-primary">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-primary">
                Pricing
              </Link>
              <Link href="#faq" className="hover:text-primary">
                FAQ
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/signin" className="btn-ghost btn">
              Sign In
            </Link>
            <ButtonCheckout
              priceId={basicPlan?.stripePriceId || ""}
              className="btn-primary btn hidden md:inline-flex"
            >
              Get Started
            </ButtonCheckout>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="btn-ghost btn-sm btn-circle btn md:hidden"
              aria-label="Open menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        config={config}
      />

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-base-200">
        <div className="mx-auto max-w-7xl px-8 py-12">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">{config.name}</h3>
              <p className="text-base-content/70 max-w-xs">
                Transform your study materials into personalized learning experiences.
              </p>
              <div className="flex gap-4">
                <a
                  href={config.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href={config.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  <span className="sr-only">GitHub</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href={config.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="hover:text-primary">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#faq" className="hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href={`mailto:${config.supportEmail}`}
                    className="hover:text-primary"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href={`mailto:${config.contactEmail}`}
                    className="hover:text-primary"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href={config.legal.terms} className="hover:text-primary">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href={config.legal.privacy} className="hover:text-primary">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href={config.legal.cookies} className="hover:text-primary">
                    Cookies
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t pt-8 text-center text-sm text-base-content/70">
            <p>© {new Date().getFullYear()} {config.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 