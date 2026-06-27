import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const MAX_WIDTH = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

export default function FormDialog({
  onClose,
  title,
  icon: Icon,
  children,
  maxWidth = "lg",
  tall = false,
  className,
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        hideClose
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          MAX_WIDTH[maxWidth] ?? MAX_WIDTH.lg,
          tall && "h-[90vh] max-h-[90vh]",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/70 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold leading-tight">
            {Icon && (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            {title}
          </DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function FormDialogBody({ className, children }) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-y-auto px-5 py-4", className)}>
      {children}
    </div>
  );
}

export function FormDialogFooter({ className, children }) {
  return (
    <div
      className={cn(
        "flex flex-row gap-3 px-5 py-4 border-t border-border/70 shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}
