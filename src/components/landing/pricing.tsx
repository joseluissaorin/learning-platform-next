import { type PricingProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";

export function Pricing({ plans }: PricingProps) {
  return (
    <section id="pricing" className="bg-base-100 py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-base-content/70">
            Choose the plan that best fits your needs. All plans include access to our
            AI-powered learning features and regular updates.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`card border-2 ${
                plan.highlighted
                  ? "border-primary bg-primary text-primary-content"
                  : "border-base-300 bg-base-100"
              }`}
            >
              <div className="card-body gap-6">
                {plan.highlighted && (
                  <div className="badge badge-secondary mx-auto">Most Popular</div>
                )}
                <h3 className="card-title justify-center text-2xl font-bold">
                  {plan.name}
                </h3>
                <div className="text-center">
                  <span className="text-4xl font-bold">
                    {plan.currency === "USD" ? "$" : plan.currency}
                    {plan.price}
                  </span>
                  <span className="text-base-content/70">/{plan.interval}</span>
                </div>
                <ul className="my-4 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="card-actions mt-auto justify-center">
                  <ButtonCheckout
                    priceId={plan.stripePriceId}
                    className={`btn-wide btn ${
                      plan.highlighted ? "btn-secondary" : "btn-primary"
                    }`}
                  >
                    Get Started
                  </ButtonCheckout>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 