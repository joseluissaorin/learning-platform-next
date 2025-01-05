import { DashboardLayout } from "@/components/dashboard/layout";

export default function LoadingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div>
          <div className="h-9 w-48 animate-pulse rounded-lg bg-base-300" />
          <div className="mt-2 h-5 w-96 animate-pulse rounded-lg bg-base-300" />
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6 rounded-lg bg-base-100 p-6 shadow-sm">
          {/* Title and Progress */}
          <div className="flex items-center justify-between">
            <div className="h-7 w-64 animate-pulse rounded-lg bg-base-300" />
            <div className="flex items-center space-x-2">
              <div className="h-5 w-32 animate-pulse rounded-lg bg-base-300" />
              <div className="h-2 w-32 animate-pulse rounded-full bg-base-300" />
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded-lg bg-base-300" />
            <div className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded-lg bg-base-300" />
              <div className="h-4 w-5/6 animate-pulse rounded-lg bg-base-300" />
              <div className="h-4 w-4/6 animate-pulse rounded-lg bg-base-300" />
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4">
            <div className="h-10 w-28 animate-pulse rounded-lg bg-base-300" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-base-300" />
            <div className="h-10 w-28 animate-pulse rounded-lg bg-base-300" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 