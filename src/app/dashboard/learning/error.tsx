"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/layout";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <DashboardLayout>
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-error/20">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold">Something went wrong!</h2>
          <p className="mt-2 text-base-content/70">
            {error.message || "An error occurred while loading your learning session."}
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => reset()}
              className="btn-outline btn"
            >
              Try again
            </button>
            <a href="/dashboard" className="btn-primary btn">
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 