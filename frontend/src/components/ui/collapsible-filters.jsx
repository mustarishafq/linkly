import { useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function CollapsibleFilters({
  children,
  badge,
  actions,
  className,
  headerClassName,
  contentClassName,
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("overflow-hidden", className)}>
      <Collapsible open={isMobile ? open : true} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild disabled={!isMobile}>
          <div
            className={cn(
              "flex items-center justify-between gap-2",
              isMobile && "cursor-pointer select-none",
              headerClassName
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Filter className="w-4 h-4 text-primary shrink-0" />
              <h3 className="font-semibold text-sm">Filters</h3>
              {badge}
            </div>
            <div
              className="flex items-center gap-2 shrink-0"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
              {isMobile && (
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    open && "rotate-180"
                  )}
                />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={contentClassName}>{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
