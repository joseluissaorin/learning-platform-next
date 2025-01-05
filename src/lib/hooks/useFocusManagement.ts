import { useEffect, useRef } from 'react';

interface FocusManagerOptions {
  shouldTrapFocus?: boolean;
  focusOnMount?: boolean;
  onEscape?: () => void;
}

export function useFocusManagement(
  containerRef: React.RefObject<HTMLElement | null>,
  options: FocusManagerOptions = {}
) {
  const {
    shouldTrapFocus = false,
    focusOnMount = false,
    onEscape
  } = options;

  const lastFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (focusOnMount && containerRef.current) {
      lastFocusedElement.current = document.activeElement as HTMLElement;
      const firstFocusable = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }

    return () => {
      if (lastFocusedElement.current) {
        lastFocusedElement.current.focus();
      }
    };
  }, [focusOnMount]);

  useEffect(() => {
    if (!shouldTrapFocus || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      );

      if (!focusableElements?.length) return;

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [shouldTrapFocus, onEscape]);
} 