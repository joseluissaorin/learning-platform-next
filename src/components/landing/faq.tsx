import { type FAQProps } from "@/types/landing";

export function FAQ({ items }: FAQProps) {
  return (
    <section id="faq" className="bg-base-100 py-24">
      <div className="mx-auto max-w-4xl px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-2xl text-base-content/70">
            Find answers to common questions about our platform, features, and how
            we can help you learn more effectively.
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <details
              key={item.question}
              className="collapse bg-base-200"
            >
              <summary className="collapse-title text-lg font-medium">
                {item.question}
              </summary>
              <div className="collapse-content">
                <p className="text-base-content/70">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
} 