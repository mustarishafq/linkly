import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";

const POLL_INTERVAL_MS = 30000;
const TOAST_SEEN_KEY = "linkly_toast_seen_notifications";

function loadSeenIds() {
  try {
    const raw = sessionStorage.getItem(TOAST_SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids) {
  try {
    sessionStorage.setItem(TOAST_SEEN_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // Ignore storage errors.
  }
}

export function useInAppNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollStartedAt = useRef(new Date().toISOString());
  const toastSeenRef = useRef(loadSeenIds());

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const [list, countData] = await Promise.all([
        db.notifications.list(30),
        db.notifications.unreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(countData?.count ?? 0);
    } catch {
      // Keep existing state on transient failures.
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const poll = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const data = await db.notifications.poll(pollStartedAt.current);
      const incoming = data?.notifications || [];
      setUnreadCount(data?.unread_count ?? 0);

      if (incoming.length > 0) {
        setNotifications((current) => {
          const byId = new Map(current.map((item) => [item.id, item]));
          incoming.forEach((item) => byId.set(item.id, item));
          return Array.from(byId.values()).sort(
            (a, b) => new Date(b.created_date) - new Date(a.created_date)
          );
        });

        incoming.forEach((item) => {
          if (toastSeenRef.current.has(item.id)) return;
          toastSeenRef.current.add(item.id);
          saveSeenIds(toastSeenRef.current);

          toast.success(item.title, {
            description: item.body,
            action: item.link_id
              ? {
                  label: "View link",
                  onClick: () => {
                    window.location.assign(`/links/${item.link_id}`);
                  },
                }
              : undefined,
          });
        });
      }
    } catch {
      // Ignore polling errors.
    }
  }, [isAuthenticated]);

  const markRead = useCallback(async (id) => {
    await db.notifications.markRead(id);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await db.notifications.markAllRead();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    pollStartedAt.current = new Date().toISOString();
    refresh();
    poll();

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, refresh, poll]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markRead,
    markAllRead,
  };
}
