import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { glassPanelStyles } from "@/components/layout/glassStyles";
import NotificationItem from "@/components/notifications/NotificationItem";
import { cn } from "@/lib/utils";
import {
  isCriticalNotification,
  isUnreadNotification,
} from "@/lib/notificationVisuals";

export default function NotificationPanel({
  open,
  onClose,
  notifications,
  unreadCount,
  loading,
  markRead,
  markAllRead,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState("all");
  const locationKey = `${location.pathname}${location.search}`;
  const locationKeyRef = useRef(locationKey);

  useEffect(() => {
    if (open) setFilter("all");
  }, [open]);

  useEffect(() => {
    if (locationKeyRef.current === locationKey) return;
    locationKeyRef.current = locationKey;
    onClose?.();
  }, [locationKey, onClose]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "unread") return isUnreadNotification(notification);
      if (filter === "critical") return isCriticalNotification(notification);
      return true;
    });
  }, [filter, notifications]);

  const headerCount = filter === "critical" ? filtered.length : unreadCount;

  function activate(notification) {
    if (isUnreadNotification(notification)) {
      markRead(notification.id);
    }
    onClose?.();
    if (notification.link_id) {
      navigate(`/links/${notification.link_id}`);
    }
  }

  if (!open) return null;

  return createPortal(
    <>
      <motion.div
        key="notification-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
      />
      <motion.div
        key="notification-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-[61] flex w-full max-w-md flex-col",
          "rounded-bl-2xl md:rounded-none border-l",
          glassPanelStyles
        )}
      >
        <div className="flex items-center justify-between gap-2 p-4 border-b border-border/50">
          <div className="flex items-center gap-2 min-w-0">
            <Bell className="w-5 h-5 text-primary shrink-0" />
            <h2 className="font-semibold text-lg">Notifications</h2>
            {headerCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                {headerCount > 99 ? "99+" : headerCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => markAllRead()}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Close notifications"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 pt-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="w-full bg-muted/50 h-9 text-foreground/60">
              <TabsTrigger value="all" className="text-xs flex-1 data-[state=active]:text-foreground">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs flex-1 data-[state=active]:text-foreground">
                Unread
              </TabsTrigger>
              <TabsTrigger value="critical" className="text-xs flex-1 data-[state=active]:text-foreground">
                Critical
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-3 py-2">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground">No notifications</p>
              <p className="text-xs text-foreground/60 dark:text-muted-foreground mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={(item) => markRead(item.id)}
                  onActivate={activate}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </motion.div>
    </>,
    document.body
  );
}
