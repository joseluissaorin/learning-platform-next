import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { type ConceptIndex } from "@/types/analysis";

interface ConceptPathProps extends HTMLAttributes<HTMLElement> {
  path: string[];
  currentLayer: number;
  branchLayerStates?: {
    [conceptId: string]: {
      layer: number;
      expandedChildren: string[];
    };
  };
  currentConcept?: ConceptIndex | null;
  allConcepts?: ConceptIndex[];
}

export function ConceptPath({ 
  path, 
  currentLayer, 
  branchLayerStates = {},
  currentConcept,
  allConcepts = [],
  className, 
  ...props 
}: ConceptPathProps) {
  // Get the effective layer for each concept in the path
  const getEffectiveLayer = (title: string, index: number): number => {
    if (!currentConcept || !allConcepts.length) return index === path.length - 1 ? currentLayer : 1;

    // Find the concept in allConcepts by title
    const concept = allConcepts.find(c => c.title === title);
    if (!concept) return 1;

    // Get root concept
    let root = concept;
    while (root.parentId) {
      const parent = allConcepts.find(c => c.id === root.parentId);
      if (!parent) break;
      root = parent;
    }

    // Get branch state
    const branchState = branchLayerStates[root.id];
    if (!branchState) return concept.level === 0 ? 1 : 0;

    return branchState.layer;
  };

  return (
    <nav 
      aria-label="Concept navigation" 
      className={cn(
        "flex items-center space-x-2 text-sm",
        className
      )}
      {...props}
    >
      {path.map((item, index) => {
        const effectiveLayer = getEffectiveLayer(item, index);
        const isCurrentConcept = index === path.length - 1;
        const isParentOfCurrent = index === path.length - 2;

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
            )}
            <span className={cn(
              "px-2 py-1 rounded-md transition-colors",
              isCurrentConcept
                ? "bg-primary/10 text-primary font-medium"
                : isParentOfCurrent
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground",
              effectiveLayer > 1 && "border-l-2 border-primary/30"
            )}>
              {item}
              {!isCurrentConcept && effectiveLayer > 1 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Layer {effectiveLayer}
                </span>
              )}
            </span>
          </div>
        );
      })}

      <div className="ml-4 px-2 py-1 bg-muted rounded-md text-xs">
        Layer {currentLayer}
      </div>
    </nav>
  );
} 