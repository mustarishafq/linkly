import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PreviewClickBadge({ className }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-normal text-muted-foreground border-muted-foreground/25 bg-muted/50 hover:bg-muted/50",
        className
      )}
    >
      Preview
    </Badge>
  );
}
