import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScreenReaderTextProps {
  children: string;
  assertive?: boolean;
  clearAfter?: number;
}

export function ScreenReaderText({
  children,
  assertive = false,
  clearAfter = 0
}: ScreenReaderTextProps) {
  const [text, setText] = useState(children);

  useEffect(() => {
    setText(children);

    if (clearAfter > 0) {
      const timer = setTimeout(() => {
        setText('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [children, clearAfter]);

  return (
    <div
      className={cn(
        "sr-only",
        "pointer-events-none",
        "absolute",
        "w-px h-px",
        "overflow-hidden",
        "whitespace-nowrap"
      )}
      role={assertive ? 'alert' : 'status'}
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      {text}
    </div>
  );
} 