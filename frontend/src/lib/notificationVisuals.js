import { AlertTriangle, CheckCircle, Info, ListTodo, Monitor, ThumbsUp } from "lucide-react";

const typeVisuals = {
  info: {
    icon: Info,
    color: "text-info",
    bg: "bg-info/10",
    border: "border-info/45 dark:border-info/30",
    dot: "bg-info",
  },
  success: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/45 dark:border-success/30",
    dot: "bg-success",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/50 dark:border-warning/35",
    dot: "bg-warning",
  },
};

const categoryVisuals = {
  task: { label: "Task", icon: ListTodo },
  approval: { label: "Approval", icon: ThumbsUp },
  system: { label: "System", icon: Monitor },
};

export function isUnreadNotification(notification) {
  return notification?.is_read !== true && notification?.is_read !== 1 && notification?.is_read !== "1";
}

export function isCriticalNotification(notification) {
  const event = String(notification?.type || "").toLowerCase();
  return event.includes("deleted") || event.includes("critical") || event.includes("error");
}

export function getNotificationTypeVisual(type = "") {
  const event = String(type).toLowerCase();
  if (event.includes("deleted")) return typeVisuals.warning;
  if (event.includes("approved")) return typeVisuals.success;
  return typeVisuals.info;
}

export function getNotificationCategoryVisual(type = "") {
  const event = String(type).toLowerCase();
  if (event.startsWith("user.")) return categoryVisuals.approval;
  if (event.startsWith("link.")) return categoryVisuals.task;
  return categoryVisuals.system;
}
