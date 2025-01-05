import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onNext: () => void;
  onPrevious: () => void;
  onLayerUp: () => void;
  onLayerDown: () => void;
  onQuestion: () => void;
  onRegenerate: () => void;
  isDisabled?: boolean;
}

export function useKeyboardShortcuts({
  onNext,
  onPrevious,
  onLayerUp,
  onLayerDown,
  onQuestion,
  onRegenerate,
  isDisabled = false
}: ShortcutHandlers) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isDisabled) return;
    
    // Don't trigger shortcuts if user is typing in an input or textarea
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        onNext();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        onPrevious();
        break;
      case 'ArrowUp':
        event.preventDefault();
        onLayerUp();
        break;
      case 'ArrowDown':
        event.preventDefault();
        onLayerDown();
        break;
      case 'q':
      case 'Q':
        event.preventDefault();
        onQuestion();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        onRegenerate();
        break;
    }
  }, [isDisabled, onNext, onPrevious, onLayerUp, onLayerDown, onQuestion, onRegenerate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
} 