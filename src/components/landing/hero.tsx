import Image from "next/image";
import { type HeroProps } from "@/types/landing";
import { ButtonCheckout } from "./button-checkout";

export function Hero({ config }: HeroProps) {
  const basicPlan = config.plans[0];
  const price = basicPlan ? `${basicPlan.currency}${basicPlan.price}/${basicPlan.interval}` : "";

  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-16 bg-base-100 px-8 py-8 pb-24 lg:flex-row lg:gap-20 lg:py-20 md:pb-16">
      <div className="flex flex-col items-center gap-10 text-center lg:w-1/2 lg:items-start lg:gap-14 lg:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-6xl">
          {config.tagline.split(" ").map((word, i) => (
            <span
              key={i}
              className={
                i % 3 === 2
                  ? "ml-1 whitespace-nowrap bg-neutral px-2 text-neutral-content md:ml-1.5 md:px-4 leading-relaxed"
                  : ""
              }
            >
              {word}{" "}
            </span>
          ))}
        </h1>

        <p className="text-lg leading-relaxed text-base-content/80 lg:text-xl lg:leading-relaxed">
          {config.description}
        </p>

        <div className="flex w-full flex-col items-center gap-4 lg:w-auto lg:flex-row lg:gap-6">
          <ButtonCheckout
            priceId={basicPlan?.stripePriceId || ""}
            className="btn-primary btn-wide btn lg:btn-lg"
          >
            Get Started for {price}
          </ButtonCheckout>
          <a
            className="btn-outline btn-wide btn lg:btn-lg"
            href="#features"
          >
            See How It Works
          </a>
        </div>
      </div>

      <div className="lg:w-1/2">
        <div className="relative">
          <Image
            src="/demo-platform.png"
            alt={`${config.name} in action - AI-powered learning platform`}
            className="rounded-2xl shadow-[0_20px_50px_-10px_rgba(29,78,216,0.15)]"
            priority={true}
            width={600}
            height={400}
          />
          <div className="absolute -bottom-16 left-1/2 w-80 -translate-x-1/2 rounded-2xl bg-base-100 p-3 shadow-[0_10px_30px_-10px_rgba(29,78,216,0.25)] md:-bottom-8 md:-left-8 md:-translate-x-0 md:p-4 lg:p-8">
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary md:h-12 md:w-12">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5 text-primary-content md:h-6 md:w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                  />
                </svg>
              </div>
              <div className="text-center md:text-left">
                <p className="font-semibold">Smart Learning</p>
                <p className="whitespace-nowrap text-xs text-base-content/60">
                  Context-aware AI assistance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 