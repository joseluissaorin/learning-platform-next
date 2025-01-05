import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingStateProps {
  state: 'loading' | 'generating' | 'summarizing' | 'analyzing' | 'regenerating';
  layer?: number;
  progress?: number;
  className?: string;
}

const messages = {
  loading: "Loading your learning content...",
  generating: "Generating explanation...",
  summarizing: "Creating a concise summary...",
  analyzing: "Analyzing content structure...",
  regenerating: "Regenerating explanation..."
};

const details = {
  loading: "We're preparing your learning materials",
  generating: "Our AI is crafting a detailed explanation",
  summarizing: "Distilling the key concepts into a clear summary",
  analyzing: "Understanding the content structure and relationships",
  regenerating: "Creating a fresh perspective on this concept"
};

const spinTransition = {
  loop: Infinity,
  ease: "linear",
  duration: 1
};

export function LoadingState({ state, layer, progress, className }: LoadingStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center min-h-[300px] space-y-6 text-center px-4",
        className
      )}
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={spinTransition}
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <AnimatePresence mode="wait">
          {progress !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-xs font-medium">{Math.round(progress)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        layout
        className="space-y-2 max-w-md"
      >
        <motion.h3
          key={state}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="text-lg font-semibold text-foreground"
        >
          {messages[state]}
        </motion.h3>
        <motion.p
          key={`${state}-${layer}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          {details[state]}
          {layer && state !== 'loading' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            > for Layer {layer}</motion.span>
          )}
        </motion.p>
      </motion.div>

      <AnimatePresence>
        {state === 'generating' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-muted-foreground/60 max-w-xs"
          >
            This usually takes a few seconds. We're making sure the explanation is thorough and easy to understand.
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
} 