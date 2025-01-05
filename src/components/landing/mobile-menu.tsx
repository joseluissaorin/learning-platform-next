"use client";

import { useEffect } from "react";
import Link from "next/link";
import { type MobileMenuProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";

export function MobileMenu({ isOpen, onClose, config }: MobileMenuProps) {
  const basicPlan = config.plans[0];

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Menu */}
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-base-100 p-6 shadow-lg transition-transform duration-300">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold" onClick={onClose}>
              {config.name}
            </Link>
            <button
              onClick={onClose}
              className="btn-ghost btn-sm btn-circle btn"
              aria-label="Close menu"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-8">
            <ul className="space-y-3">
              <li>
                <Link
                  href="#features"
                  className="block py-2 text-lg hover:text-primary"
                  onClick={onClose}
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="block py-2 text-lg hover:text-primary"
                  onClick={onClose}
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#faq"
                  className="block py-2 text-lg hover:text-primary"
                  onClick={onClose}
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </nav>

          {/* Actions */}
          <div className="mt-auto space-y-4">
            <Link
              href="/auth/signin"
              className="btn-outline btn-block btn"
              onClick={onClose}
            >
              Sign In
            </Link>
            <ButtonCheckout
              priceId={basicPlan?.stripePriceId || ""}
              className="btn-primary btn-block btn"
            >
              Get Started
            </ButtonCheckout>
          </div>
        </div>
      </div>
    </div>
  );
} 