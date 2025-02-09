"use client";

import { motion } from "framer-motion";
import { type PricingProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";

export function Pricing({ plans }: PricingProps) {
  return (
    <section id="pricing" className="relative overflow-hidden bg-base-100 py-24">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 h-96 w-96 -translate-y-1/2 translate-x-[-30%] rounded-full bg-primary/5" />
        <div className="absolute top-1/2 right-0 h-96 w-96 -translate-y-1/2 translate-x-[30%] rounded-full bg-secondary/5" />
      </div>

      <div className="relative mx-auto max-w-7xl px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-base-content/70">
            Choose the plan that best fits your needs. All plans include access to our
            AI-powered learning features and regular updates.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ 
                opacity: 1, 
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  mass: 1
                }
              }}
              whileHover={{ 
                scale: plan.highlighted ? 1.03 : 1.01,
                y: -2,
                transition: {
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  mass: 0.5
                }
              }}
              viewport={{ once: true }}
              className={`group relative overflow-hidden rounded-2xl border-2 will-change-transform ${
                plan.highlighted
                  ? "border-primary bg-primary/90 text-primary-foreground hover:bg-primary hover:shadow-primary/20"
                  : "border-base-300 bg-base-100 hover:border-primary/50 hover:shadow-primary/10"
              }`}
            >
              {plan.highlighted && (
                <motion.div 
                  className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rotate-45"
                  animate={{ 
                    scale: [1, 1.02, 1],
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  }}
                >
                  <div className="flex w-[170px] items-center justify-center bg-secondary py-1.5 text-sm font-medium text-secondary-foreground shadow-sm">
                    Most Popular
                  </div>
                </motion.div>
              )}
              
              <div className="card-body gap-6 p-8">
                <h3 className={`card-title justify-center text-2xl font-bold ${
                  plan.highlighted 
                    ? "text-primary-foreground group-hover:text-primary-foreground" 
                    : "group-hover:text-primary"
                }`}>
                  {plan.name}
                </h3>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-sm font-medium ${plan.highlighted ? "text-primary-foreground/90" : ""}`}>€</span>
                    <motion.span 
                      className={`text-5xl font-bold will-change-transform ${
                        plan.highlighted ? "text-primary-foreground" : ""
                      }`}
                      whileHover={{
                        scale: 1.05,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 25
                        }
                      }}
                    >{plan.price}</motion.span>
                    <span className={`${plan.highlighted ? "text-primary-foreground/90" : "text-base-content/70"}`}>/{plan.interval}</span>
                  </div>
                </div>
                <ul className="my-8 space-y-4">
                  {plan.features.map((feature) => (
                    <motion.li 
                      key={feature} 
                      className="flex items-start gap-3 group/item will-change-transform"
                      whileHover={{ 
                        x: 2,
                        transition: {
                          type: "spring",
                          stiffness: 400,
                          damping: 25
                        }
                      }}
                    >
                      <motion.svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className={`h-5 w-5 flex-shrink-0 will-change-transform ${
                          plan.highlighted ? "text-primary-foreground" : "text-primary"
                        }`}
                        whileHover={{
                          scale: 1.1,
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 25
                          }
                        }}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </motion.svg>
                      <span className={`text-base ${
                        plan.highlighted 
                          ? "text-primary-foreground/90 group-hover/item:text-primary-foreground" 
                          : "group-hover/item:text-primary"
                      }`}>{feature}</span>
                    </motion.li>
                  ))}
                </ul>
                <motion.div 
                  className="card-actions mt-auto"
                  whileHover={{
                    y: -2,
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 25
                    }
                  }}
                >
                  <ButtonCheckout
                    priceId={plan.stripePriceId}
                    className={`btn-wide btn-lg btn w-full relative overflow-hidden will-change-transform ${
                      plan.highlighted
                        ? "btn-secondary hover:btn-secondary hover:shadow-lg hover:shadow-secondary/20 border-2 border-primary-foreground/20"
                        : "btn-primary hover:btn-primary hover:shadow-lg hover:shadow-primary/20"
                    }`}
                  >
                    Get Started
                  </ButtonCheckout>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 