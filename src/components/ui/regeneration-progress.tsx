import { cn } from "@/lib/utils";
import { Progress } from "./progress";

interface RegenerationProgressProps {
  completedLayers: number;
  totalLayers: number;
  className?: string;
}

export function RegenerationProgress({
  completedLayers,
  totalLayers,
  className
}: RegenerationProgressProps) {
  const progress = (completedLayers / totalLayers) * 100;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
          Clearing layer caches...
        </span>
        <span className="font-medium">
          {completedLayers} of {totalLayers}
        </span>
      </div>
      <Progress 
        value={progress} 
        className={cn(
          "h-1 transition-all duration-300",
          progress === 100 && "bg-primary/20"
        )}
      />
    </div>
  );
} 