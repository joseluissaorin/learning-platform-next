import { cn } from "@/lib/utils";
import { RefreshCw, BookOpen, Layers, Brain, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export type LoadingStateType = 
  | 'summarizing' 
  | 'analyzing' 
  | 'generating' 
  | 'regenerating'
  | 'processing'
  | 'thinking';

interface LoadingStateProps {
  state: LoadingStateType;
  layer?: number;
  progress?: number;
  className?: string;
  message?: string;
}

const loadingMessages = {
  summarizing: "Creating a concise summary...",
  analyzing: "Analyzing content in depth...",
  generating: "Generating detailed explanation...",
  regenerating: "Regenerating explanations...",
  processing: "Processing your request...",
  thinking: "Thinking about your question..."
};

const loadingIcons = {
  summarizing: BookOpen,
  analyzing: Brain,
  generating: Sparkles,
  regenerating: RefreshCw,
  processing: Layers,
  thinking: Brain
};

export function LoadingState({ 
  state, 
  layer, 
  progress, 
  className,
  message 
}: LoadingStateProps) {
  const Icon = loadingIcons[state];
  const defaultMessage = loadingMessages[state];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center h-full space-y-6",
      className
    )}>
      <motion.div
        animate={{
          rotate: state === 'regenerating' ? 360 : 0,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: {
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          },
          scale: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className="relative"
      >
        <Icon className="h-12 w-12 text-primary" />
        {state === 'regenerating' && (
          <motion.div
            className="absolute inset-0 border-2 border-primary rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.div>

      <div className="space-y-3 text-center">
        <p className="text-lg font-medium text-foreground">
          {message || defaultMessage}
        </p>
        {layer && (
          <p className="text-sm text-muted-foreground">
            Layer {layer} {state === 'regenerating' ? 'regeneration' : 'generation'}
          </p>
        )}
      </div>

      {progress !== undefined && (
        <div className="w-64 space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  );
} 