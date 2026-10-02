import { useCallback, useState } from "react";
import { Bell } from "lucide-react";
import { useInAppNotifications } from "@/hooks/useInAppNotifications";
import NotificationPanel from "@/components/notifications/NotificationPanel";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
  } = useInAppNotifications();

  return (
    <>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationPanel
        open={open}
        onClose={close}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        markRead={markRead}
        markAllRead={markAllRead}
      />
    </>
  );
}
