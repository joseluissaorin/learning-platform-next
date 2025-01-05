import { cn } from "@/lib/utils";

interface ShortcutTooltipProps {
  shortcut: string;
  className?: string;
}

export function ShortcutTooltip({ shortcut, className }: ShortcutTooltipProps) {
  return (
    <kbd className={cn(
      "pointer-events-none absolute right-1.5 top-1.5",
      "hidden h-5 select-none items-center gap-1",
      "rounded border bg-muted px-1.5",
      "font-mono text-[10px] font-medium opacity-100",
      "group-hover:flex group-focus:flex",
      className
    )}>
      {shortcut}
    </kbd>
  );
} 