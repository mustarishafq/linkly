import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";

const POLL_INTERVAL_MS = 30000;
const TOAST_SEEN_KEY = "linkly_toast_seen_notifications";

function normalizeNotificationId(id) {
  return String(id);
}

function loadSeenIds() {
  try {
    const raw = window.localStorage.getItem(TOAST_SEEN_KEY);
    return raw ? new Set(JSON.parse(raw).map(normalizeNotificationId)) : new Set();
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids) {
  try {
    window.localStorage.setItem(
      TOAST_SEEN_KEY,
      JSON.stringify(Array.from(ids).slice(-200))
    );
  } catch {
    // Ignore storage errors.
  }
}

function markIdsSeen(ids, seenSet) {
  ids.forEach((id) => seenSet.add(normalizeNotificationId(id)));
  saveSeenIds(seenSet);
}

export function useInAppNotifications() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const pollStartedAt = useRef(new Date().toISOString());
  const toastSeenRef = useRef(loadSeenIds());
  const readyForToastsRef = useRef(false);

  const showToast = useCallback((item) => {
    const id = normalizeNotificationId(item.id);
    if (toastSeenRef.current.has(id)) return;

    toastSeenRef.current.add(id);
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
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return [];

    setLoading(true);
    try {
      const [list, countData] = await Promise.all([
        db.notifications.list(30),
        db.notifications.unreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(countData?.count ?? 0);
      markIdsSeen(list.map((item) => item.id), toastSeenRef.current);

      return list;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const poll = useCallback(async () => {
    if (!isAuthenticated || !readyForToastsRef.current) return;

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

        incoming.forEach((item) => showToast(item));
      }
    } catch {
      // Ignore polling errors.
    }
  }, [isAuthenticated, showToast]);

  const markRead = useCallback(async (id) => {
    await db.notifications.markRead(id);
    markIdsSeen([id], toastSeenRef.current);
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await db.notifications.markAllRead();
    setNotifications((current) => {
      markIdsSeen(current.map((item) => item.id), toastSeenRef.current);

      return current.map((item) => ({ ...item, is_read: true }));
    });
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      readyForToastsRef.current = false;
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function initialize() {
      readyForToastsRef.current = false;
      pollStartedAt.current = new Date().toISOString();
      await refresh();

      if (cancelled) return;

      readyForToastsRef.current = true;
    }

    initialize();

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      readyForToastsRef.current = false;
      window.clearInterval(interval);
    };
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
