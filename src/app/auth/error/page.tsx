import { Metadata } from "next";
import Link from "next/link";
import { config } from "@/config/landing";

export const metadata: Metadata = {
  title: `Authentication Error - ${config.name}`,
  description: "There was an error signing in to your account.",
};

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6 text-error"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Authentication Error
          </h1>
          <p className="mt-2 text-base-content/70">
            There was an error signing in to your account. Please try again.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/auth/signin" className="btn-primary btn w-full">
            Try Again
          </Link>
          <Link href="/" className="btn-ghost btn w-full">
            Back to Home
          </Link>
        </div>

        {/* Support */}
        <p className="text-sm text-base-content/70">
          Need help?{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-medium hover:text-primary"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
} 