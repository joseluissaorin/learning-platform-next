import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

interface ConceptPathProps extends HTMLAttributes<HTMLElement> {
  path: string[];
  currentLayer: number;
}

export function ConceptPath({ path, currentLayer, className, ...props }: ConceptPathProps) {
  return (
    <nav 
      aria-label="Concept navigation" 
      className={cn(
        "flex items-center space-x-2 text-sm",
        className
      )}
      {...props}
    >
      {path.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          )}
          <span className={cn(
            "px-2 py-1 rounded-md transition-colors",
            index === path.length - 1
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}>
            {item}
          </span>
        </div>
      ))}

      <div className="ml-4 px-2 py-1 bg-muted rounded-md text-xs">
        Layer {currentLayer}
      </div>
    </nav>
  );
} 