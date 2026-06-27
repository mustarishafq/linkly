import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import NotificationLink from "@/components/notifications/NotificationLink";

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
  } = useInAppNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-2 rounded-lg hover:bg-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 20).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex flex-col items-start gap-1 px-3 py-3 cursor-pointer rounded-none",
                  !notification.is_read && "bg-primary/5"
                )}
                onClick={() => {
                  if (!notification.is_read) {
                    markRead(notification.id);
                  }
                }}
              >
                <NotificationLink
                  notification={notification}
                  onNavigate={() => {
                    if (!notification.is_read) {
                      markRead(notification.id);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.body}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </div>
        {notifications.length > 0 && <DropdownMenuSeparator />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
