import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  onClose?: () => void;
  className?: string;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle
};

const toastColors = {
  success: "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  error: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  info: "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
};

export function Toast({ type, message, onClose, className }: ToastProps) {
  const Icon = toastIcons[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "fixed bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg",
        "border border-white/10 backdrop-blur-sm",
        toastColors[type],
        className
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          aria-label="Close notification"
        >
          <XCircle className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

interface ToastContainerProps {
  children: React.ReactNode;
}

export function ToastContainer({ children }: ToastContainerProps) {
  return (
    <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
      <AnimatePresence mode="sync">
        {children}
      </AnimatePresence>
    </div>
  );
} 