import { cn } from "@/lib/utils";

interface RegenerationProgressProps {
  completedLayers: number;
  totalLayers: number;
  className?: string;
}

export function RegenerationProgress({ completedLayers, totalLayers, className }: RegenerationProgressProps) {
  const progress = (completedLayers / totalLayers) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-sm text-muted-foreground mb-2">
        <span>Layer {completedLayers}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
} 