import Image from "next/image";
import { type TestimonialsProps } from "@/types/landing";

export function Testimonials({ testimonials }: TestimonialsProps) {
  return (
    <section className="bg-base-200 py-24">
      <div className="mx-auto max-w-7xl px-8">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
            Loved by Students and Educators
          </h2>
          <p className="mx-auto max-w-2xl text-base-content/70">
            See what our users have to say about their experience with our platform
            and how it has transformed their learning journey.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="card bg-base-100"
            >
              <div className="card-body gap-6">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-16 rounded-full">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={64}
                        height={64}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold">{testimonial.name}</h3>
                    <p className="text-sm text-base-content/70">{testimonial.role}</p>
                  </div>
                </div>
                <div className="relative">
                  <svg
                    className="absolute -left-3 -top-3 h-8 w-8 text-base-content/20"
                    fill="currentColor"
                    viewBox="0 0 32 32"
                    aria-hidden="true"
                  >
                    <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                  </svg>
                  <p className="relative text-base-content/90">
                    {testimonial.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
} 