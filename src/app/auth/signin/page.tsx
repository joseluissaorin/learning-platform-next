import { Metadata } from "next";
import { config } from "@/config/landing";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: `Sign In - ${config.name}`,
  description: "Sign in to your account to access your personalized learning experience.",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sign in to {config.name}
          </h1>
          <p className="mt-2 text-base-content/70">
            Start your learning journey today
          </p>
        </div>

        {/* Sign In Form */}
        <SignInForm />

        {/* Terms */}
        <p className="text-center text-sm text-base-content/70">
          By signing in, you agree to our{" "}
          <a
            href={config.legal.terms}
            className="font-medium hover:text-primary"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href={config.legal.privacy}
            className="font-medium hover:text-primary"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
} 