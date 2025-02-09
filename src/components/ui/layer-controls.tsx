import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Layers, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { logger } from "@/lib/debug/logger";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

interface LayerControlsProps {
  currentLayer: number;
  isLoading: boolean;
  onLayerChange: (layer: number) => void;
  path: string[];
  disabled?: boolean;
}

const layerVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 20 : -20,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    y: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    y: direction < 0 ? 20 : -20,
    opacity: 0
  })
};

const buttonVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95, transition: { duration: 0.1 } },
  disabled: { opacity: 0.5, scale: 1, transition: { duration: 0.2 } }
};

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

    if (currentLayer < 3 && !isLoading && !disabled) {
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
  }, [currentLayer, isLoading, onLayerChange, disabled]);

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

  const getLayerDescription = (layer: number) => {
    switch (layer) {
      case 1:
        return "High-level overview";
      case 2:
        return "Detailed explanation";
      case 3:
        return "Complete content";
      default:
        return "";
    }
  };

  return (
    <TooltipProvider>
      <motion.div 
        className="flex items-center space-x-4 bg-background/50 p-2 rounded-lg"
        initial={false}
        animate={{ 
          backgroundColor: isLoading ? "rgba(var(--background), 0.3)" : "rgba(var(--background), 0.5)"
        }}
        transition={{ duration: 0.3 }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              variants={buttonVariants}
              initial={false}
              animate={currentLayer === 1 || isLoading || disabled ? "disabled" : "center"}
              whileHover={currentLayer > 1 && !isLoading && !disabled ? "hover" : undefined}
              whileTap={currentLayer > 1 && !isLoading && !disabled ? "tap" : undefined}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimplerClick}
                disabled={currentLayer === 1 || isLoading || disabled}
                className={cn(
                  "text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200 group relative min-w-[100px]",
                  (isLoading || disabled) && "opacity-50 cursor-not-allowed",
                  currentLayer === 1 && "opacity-50"
                )}
                aria-label="Show simpler explanation"
              >
                <span className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  isLoading && "opacity-0"
                )}>
                  <ArrowUp className="h-4 w-4" />
                  Simpler
                </span>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin absolute" />
                )}
                <ShortcutTooltip shortcut="↑" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {currentLayer === 1 
              ? "Already at the simplest layer"
              : "Show a simpler explanation"}
          </TooltipContent>
        </Tooltip>

        <motion.div 
          className="flex items-center px-4 py-1 border rounded-lg bg-background relative"
          animate={{ 
            borderColor: isLoading ? "rgba(var(--primary), 0.2)" : "rgba(var(--border), 1)"
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <Layers className={cn(
              "h-4 w-4",
              isLoading ? "text-primary/50" : "text-primary"
            )} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={currentLayer}
                variants={layerVariants}
                initial="enter"
                animate="center"
                exit="exit"
                custom={currentLayer}
                className={cn(
                  "text-sm font-medium",
                  isLoading && "text-muted-foreground"
                )}
                transition={{ duration: 0.3 }}
              >
                Layer {currentLayer}
              </motion.span>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`desc-${currentLayer}`}
              variants={layerVariants}
              initial="enter"
              animate="center"
              exit="exit"
              custom={currentLayer}
              className="text-xs text-muted-foreground ml-2"
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {getLayerDescription(currentLayer)}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              variants={buttonVariants}
              initial={false}
              animate={currentLayer === 3 || isLoading || disabled ? "disabled" : "center"}
              whileHover={currentLayer < 3 && !isLoading && !disabled ? "hover" : undefined}
              whileTap={currentLayer < 3 && !isLoading && !disabled ? "tap" : undefined}
            >
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeeperClick}
                disabled={currentLayer === 3 || isLoading || disabled}
                className={cn(
                  "text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200 group relative min-w-[100px]",
                  (isLoading || disabled) && "opacity-50 cursor-not-allowed",
                  currentLayer === 3 && "opacity-50"
                )}
                aria-label="Show deeper explanation"
              >
                <span className={cn(
                  "flex items-center gap-2 transition-all duration-200",
                  isLoading && "opacity-0"
                )}>
                  <ArrowDown className="h-4 w-4" />
                  Deeper
                </span>
                {isLoading && (
                  <Loader2 className="h-4 w-4 animate-spin absolute" />
                )}
                <ShortcutTooltip shortcut="↓" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {currentLayer === 3 
              ? "Already at the deepest layer"
              : "Show a more detailed explanation"}
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
} 