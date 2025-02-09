import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export type ProgressStatus = 'pending' | 'loading' | 'success' | 'error' | 'warning';

interface ProgressIndicatorProps {
  status: ProgressStatus;
  progress?: number;
  message?: string;
  className?: string;
  showIcon?: boolean;
}

const statusColors = {
  pending: "bg-muted",
  loading: "bg-primary",
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500"
};

const statusIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle
};

export function ProgressIndicator({
  status,
  progress,
  message,
  className,
  showIcon = true
}: ProgressIndicatorProps) {
  const Icon = statusIcons[status as keyof typeof statusIcons];
  
  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between mb-1">
        {message && (
          <span className="text-sm font-medium text-muted-foreground">
            {message}
          </span>
        )}
        {progress !== undefined && (
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              statusColors[status]
            )}
            initial={{ width: 0 }}
            animate={{ 
              width: progress !== undefined ? `${progress}%` : "100%" 
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut"
            }}
          />
        </div>

        {showIcon && Icon && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-2 -top-2"
          >
            <Icon className={cn(
              "w-4 h-4",
              status === 'success' && "text-green-500",
              status === 'error' && "text-red-500",
              status === 'warning' && "text-yellow-500"
            )} />
          </motion.div>
        )}
      </div>

      {status === 'loading' && (
        <motion.div
          className="h-1 bg-primary/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{
              x: ["0%", "100%"],
              width: ["10%", "30%"]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        </motion.div>
      )}
    </div>
  );
} 