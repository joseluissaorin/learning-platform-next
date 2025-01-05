import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Layers, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { logger } from "@/lib/debug/logger";

interface LayerControlsProps {
  currentLayer: number;
  isLoading: boolean;
  onLayerChange: (layer: number) => void;
  path: string[];
  disabled?: boolean;
}

export function LayerControls({ 
  currentLayer, 
  isLoading, 
  onLayerChange,
  path,
  disabled = false
}: LayerControlsProps) {
  logger.debug('LayerControls', 'Render', {
    currentLayer,
    isLoading,
    pathLength: path.length,
    disabled
  });
  
  const handleDeeperClick = useCallback(() => {
    logger.debug('LayerControls', 'Deeper click', {
      currentLayer,
      isLoading,
      disabled
    });

    if (currentLayer < 3 && !isLoading && !disabled && path.length > 1) {
      const newLayer = currentLayer + 1;
      logger.debug('LayerControls', 'Calling onLayerChange', { newLayer });
      onLayerChange(newLayer);
    } else {
      logger.debug('LayerControls', 'Deeper click ignored', {
        currentLayer,
        isLoading,
        disabled,
        pathLength: path.length
      });
    }
  }, [currentLayer, isLoading, onLayerChange, disabled, path.length]);

  const handleSimplerClick = useCallback(() => {
    logger.debug('LayerControls', 'Simpler click', {
      currentLayer,
      isLoading,
      disabled
    });

    if (currentLayer > 1 && !isLoading && !disabled) {
      const newLayer = currentLayer - 1;
      logger.debug('LayerControls', 'Calling onLayerChange', { newLayer });
      onLayerChange(newLayer);
    } else {
      logger.debug('LayerControls', 'Simpler click ignored', {
        currentLayer,
        isLoading,
        disabled
      });
    }
  }, [currentLayer, isLoading, onLayerChange, disabled]);

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSimplerClick}
        disabled={currentLayer === 1 || isLoading || disabled}
        className={cn(
          "text-muted-foreground hover:text-primary transition-all duration-200 group relative",
          (isLoading || disabled) && "opacity-50 cursor-not-allowed",
          currentLayer === 1 && "opacity-50"
        )}
        aria-label="Simpler explanation"
      >
        <span className={cn(
          "transition-all duration-200",
          isLoading && "opacity-0"
        )}>
          Simpler
        </span>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin absolute" />
        )}
        <ShortcutTooltip shortcut="↓" />
      </Button>

      <div className="flex items-center space-x-1">
        <Layers className={cn(
          "h-4 w-4",
          isLoading ? "text-primary/50" : "text-primary"
        )} />
        <span className={cn(
          "text-sm font-medium",
          isLoading && "text-muted-foreground"
        )}>
          Layer {currentLayer}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleDeeperClick}
        disabled={currentLayer === 3 || isLoading || disabled || path.length < 2}
        className={cn(
          "text-muted-foreground hover:text-primary transition-all duration-200 group relative",
          (isLoading || disabled) && "opacity-50 cursor-not-allowed",
          (currentLayer === 3 || path.length < 2) && "opacity-50"
        )}
        aria-label="Deeper explanation"
      >
        <span className={cn(
          "transition-all duration-200",
          isLoading && "opacity-0"
        )}>
          Deeper
        </span>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin absolute" />
        )}
        <ShortcutTooltip shortcut="↑" />
      </Button>
    </div>
  );
} 