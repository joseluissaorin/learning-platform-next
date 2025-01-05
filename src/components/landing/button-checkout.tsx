"use client";

import { type ButtonCheckoutProps } from "@/types/landing";

export function ButtonCheckout({
  priceId,
  children,
  className = "",
}: ButtonCheckoutProps) {
  async function handleCheckout() {
    // TODO: Implement Stripe checkout
    console.log("Checkout clicked for price:", priceId);
  }

  return (
    <button
      onClick={handleCheckout}
      className={className}
    >
      {children}
    </button>
  );
} 