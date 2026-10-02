import { formatDistanceToNow } from "date-fns";
import { Check, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getNotificationCategoryVisual,
  getNotificationTypeVisual,
  isUnreadNotification,
} from "@/lib/notificationVisuals";

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function NotificationItem({ notification, onMarkRead, onActivate }) {
  const config = getNotificationTypeVisual(notification.type);
  const category = getNotificationCategoryVisual(notification.type);
  const TypeIcon = config.icon;
  const CategoryIcon = category.icon;
  const isUnread = isUnreadNotification(notification);
  const message = String(notification.body || "").replace(/\s+/g, " ").trim();
  const timeLabel = relativeTime(notification.created_date);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex gap-3 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer text-left",
        !isUnread
          ? "border-border bg-card/70 shadow-sm hover:border-border/90 hover:bg-muted/40 dark:bg-muted/30 dark:hover:bg-muted/50"
          : cn(
              config.border,
              config.bg,
              "shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.08] hover:opacity-95"
            )
      )}
      onClick={() => onActivate?.(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate?.(notification);
        }
      }}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-black/[0.06] dark:border-white/10",
          config.bg
        )}
      >
        <TypeIcon className={cn("w-[18px] h-[18px]", config.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 pr-3">
            <p
              className={cn(
                "text-sm text-foreground leading-snug font-medium",
                isUnread && "font-semibold"
              )}
            >
              {notification.title}
            </p>
            {message ? (
              <p className="text-xs text-foreground/75 dark:text-muted-foreground mt-0.5 line-clamp-2">
                {message}
              </p>
            ) : null}
          </div>

          {isUnread && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Notification actions"
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 h-6 w-6 shrink-0"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onMarkRead?.(notification);
                  }}
                >
                  <Check className="w-3.5 h-3.5 mr-2" /> Mark as read
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-1.5 mt-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground/80 dark:text-muted-foreground bg-background/90 dark:bg-muted border border-border/50 px-1.5 py-0.5 rounded">
            <CategoryIcon className="w-2.5 h-2.5" />
            {category.label}
          </span>
          {timeLabel ? (
            <span className="text-[10px] text-foreground/60 dark:text-muted-foreground ml-auto">
              {timeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {isUnread && (
        <div className={cn("pointer-events-none absolute top-3.5 right-3.5 w-2 h-2 rounded-full", config.dot)} />
      )}
    </div>
  );
}
