import {
  ScrollText,
  CheckCircle,
  UserX,
  ShieldCheck,
  KeyRound,
  UserPlus,
  LogIn,
  Settings,
  Link2,
  Plus,
  Pencil,
  Trash2,
  Layers,
} from "lucide-react";

export const AUDIT_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "users", label: "Users" },
  { id: "auth", label: "Auth" },
  { id: "sso", label: "SSO" },
  { id: "settings", label: "Settings" },
  { id: "data", label: "Data" },
];

export const AUDIT_ACTIONS = [
  { value: "", label: "All actions", category: "all" },
  { value: "user_registered", label: "Registered", category: "users" },
  { value: "user_approved", label: "Approved", category: "users" },
  { value: "user_approval_revoked", label: "Revoked", category: "users" },
  { value: "user_role_changed", label: "Role changed", category: "users" },
  { value: "user_login", label: "Login", category: "auth" },
  { value: "password_reset_requested", label: "Reset requested", category: "auth" },
  { value: "password_reset_completed", label: "Reset completed", category: "auth" },
  { value: "sso_login", label: "SSO login", category: "sso" },
  { value: "sso_register", label: "SSO register", category: "sso" },
  { value: "settings_updated", label: "Settings updated", category: "settings" },
  { value: "entity_created", label: "Created", category: "data" },
  { value: "entity_updated", label: "Updated", category: "data" },
  { value: "entity_deleted", label: "Deleted", category: "data" },
  { value: "entity_bulk_created", label: "Bulk created", category: "data" },
];

const ACTION_CATEGORY_MAP = Object.fromEntries(
  AUDIT_ACTIONS.filter((a) => a.value).map((a) => [a.value, a.category])
);

export const ACTION_VISUALS = {
  user_registered: {
    icon: UserPlus,
    label: "User registered",
    className: "bg-info/10 text-info border-info/30",
  },
  user_approved: {
    icon: CheckCircle,
    label: "User approved",
    className: "bg-success/10 text-success border-success/30",
  },
  user_approval_revoked: {
    icon: UserX,
    label: "Approval revoked",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  user_role_changed: {
    icon: ShieldCheck,
    label: "Role changed",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  user_login: {
    icon: LogIn,
    label: "User signed in",
    className: "bg-info/10 text-info border-info/30",
  },
  password_reset_requested: {
    icon: KeyRound,
    label: "Password reset requested",
    className: "bg-muted text-muted-foreground border-border",
  },
  password_reset_completed: {
    icon: KeyRound,
    label: "Password reset completed",
    className: "bg-success/10 text-success border-success/30",
  },
  sso_login: {
    icon: Link2,
    label: "SSO sign-in",
    className: "bg-primary/10 text-primary border-primary/30",
  },
  sso_register: {
    icon: UserPlus,
    label: "SSO user provisioned",
    className: "bg-info/10 text-info border-info/30",
  },
  settings_updated: {
    icon: Settings,
    label: "Settings updated",
    className: "bg-warning/10 text-warning border-warning/30",
  },
  entity_created: {
    icon: Plus,
    label: "Record created",
    className: "bg-success/10 text-success border-success/30",
  },
  entity_updated: {
    icon: Pencil,
    label: "Record updated",
    className: "bg-info/10 text-info border-info/30",
  },
  entity_deleted: {
    icon: Trash2,
    label: "Record deleted",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  entity_bulk_created: {
    icon: Layers,
    label: "Bulk records created",
    className: "bg-primary/10 text-primary border-primary/30",
  },
};

export function getActionVisual(action) {
  return (
    ACTION_VISUALS[action] || {
      icon: ScrollText,
      label: action?.replace(/_/g, " ") || "Unknown event",
      className: "bg-muted text-muted-foreground border-border",
    }
  );
}

export function getActionCategory(action) {
  return ACTION_CATEGORY_MAP[action] || "other";
}

export function filterActionsByCategory(category) {
  if (!category || category === "all") return AUDIT_ACTIONS;
  return AUDIT_ACTIONS.filter((a) => !a.value || a.category === category);
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getAuditTitle(log) {
  const visual = getActionVisual(log.action);
  const details = log.details || {};

  switch (log.action) {
    case "entity_created":
      return details.entity
        ? `Created ${details.entity}${details.label ? `: ${details.label}` : ""}`
        : visual.label;
    case "entity_updated":
      if (details.operation === "domain_verified") {
        return `Domain verified${details.label ? `: ${details.label}` : ""}`;
      }
      if (details.operation === "domain_verify_failed") {
        return `Domain verification failed${details.label ? `: ${details.label}` : ""}`;
      }
      return details.entity
        ? `Updated ${details.entity}${details.label ? `: ${details.label}` : ""}`
        : visual.label;
    case "entity_deleted":
      return details.entity
        ? `Deleted ${details.entity}${details.label ? `: ${details.label}` : ""}`
        : visual.label;
    case "entity_bulk_created":
      return details.entity
        ? `Bulk created ${details.count ?? ""} ${details.entity}`.trim()
        : visual.label;
    default:
      return visual.label;
  }
}

export function getAuditSummary(log) {
  const details = log.details || {};
  const actor = log.actor_label || (log.actor_user_id ? "User" : "System");
  const target = log.target_label && log.target_label !== "-" ? log.target_label : null;
  const targetEmail = details.email || null;

  switch (log.action) {
    case "user_registered":
      return targetEmail
        ? `Registered as ${targetEmail}`
        : target
          ? `New account: ${target}`
          : null;
    case "user_approved":
      if (actor && target && actor !== target) return `${actor} approved ${target}`;
      if (targetEmail) return `Approved ${targetEmail}`;
      return target ? `Approved ${target}` : null;
    case "user_approval_revoked":
      if (actor && target && actor !== target) return `${actor} revoked access for ${target}`;
      if (targetEmail) return `Revoked access for ${targetEmail}`;
      return target ? `Revoked access for ${target}` : null;
    case "user_role_changed":
      if (details.previous_role && details.role) {
        const who = target || targetEmail || "user";
        return `${who}: ${details.previous_role} → ${details.role}`;
      }
      return details.role ? `Role set to ${details.role}` : null;
    case "user_login":
      return targetEmail
        ? `${targetEmail} signed in${details.method ? ` via ${details.method}` : ""}`
        : target
          ? `${target} signed in`
          : details.method
            ? `Signed in via ${details.method}`
            : null;
    case "password_reset_requested":
      return targetEmail ? `Reset email sent to ${targetEmail}` : "Password reset initiated";
    case "password_reset_completed":
      return target ? `Password reset for ${target}` : "Password was successfully reset";
    case "sso_login":
      return targetEmail
        ? `${targetEmail} signed in via SSO`
        : target
          ? `${target} signed in via SSO`
          : "Signed in via Nexus SSO";
    case "sso_register":
      return targetEmail
        ? `Provisioned ${targetEmail}${details.role ? ` as ${details.role}` : ""}`
        : target
          ? `Provisioned ${target}`
          : "New SSO user created";
    case "settings_updated":
      if (Array.isArray(details.changed_fields) && details.changed_fields.length) {
        const scope = details.scope ? `${details.scope} · ` : "";
        return `${scope}Updated ${details.changed_fields.join(", ")}`;
      }
      return details.scope ? `${details.scope} settings changed` : "Settings changed";
    case "entity_created":
      return details.label
        ? `${details.entity || "Record"}: ${details.label}`
        : details.entity_id
          ? `${details.entity || "Record"} created`
          : null;
    case "entity_updated":
      if (details.operation === "domain_verified") {
        return details.label ? `${details.label} verified successfully` : "Domain verified";
      }
      if (details.operation === "domain_verify_failed") {
        return details.label ? `Verification failed for ${details.label}` : "Domain verification failed";
      }
      if (Array.isArray(details.changed_fields) && details.changed_fields.length) {
        return `${details.label || details.entity || "Record"} · ${details.changed_fields.join(", ")}`;
      }
      return details.label || null;
    case "entity_deleted":
      return details.label
        ? `Deleted ${details.entity || "record"}: ${details.label}`
        : details.entity_id
          ? `${details.entity || "Record"} deleted`
          : null;
    case "entity_bulk_created":
      if (Array.isArray(details.labels) && details.labels.length) {
        return `${details.count || details.labels.length} ${details.entity || "records"} · ${details.labels.slice(0, 2).join(", ")}${details.labels.length > 2 ? "…" : ""}`;
      }
      return details.count ? `${details.count} ${details.entity || "records"} created` : null;
    default:
      return null;
  }
}

export function getAuditDetailRows(log) {
  const details = log.details || {};
  const rows = [];

  if (log.id) rows.push({ label: "Event ID", value: log.id, mono: true });
  if (log.actor_user_id) rows.push({ label: "Actor ID", value: log.actor_user_id, mono: true });
  if (log.target_user_id) rows.push({ label: "Target ID", value: log.target_user_id, mono: true });

  const skipKeys = new Set(["snapshot", "changes"]);

  Object.entries(details).forEach(([key, value]) => {
    if (key === "secret" || skipKeys.has(key)) return;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        rows.push({
          label: `${key}.${nestedKey}`,
          value: formatValue(nestedValue),
          mono: typeof nestedValue === "string" && nestedValue.length > 20,
        });
      });
      return;
    }

    rows.push({
      label: key.replace(/_/g, " "),
      value: formatValue(value),
      mono: key.includes("id") || key === "email" || key === "label",
    });
  });

  if (details.snapshot && typeof details.snapshot === "object") {
    Object.entries(details.snapshot).forEach(([key, value]) => {
      rows.push({
        label: `snapshot ${key}`,
        value: formatValue(value),
        mono: typeof value === "string" && value.length > 20,
      });
    });
  }

  if (details.changes && typeof details.changes === "object") {
    Object.entries(details.changes).forEach(([field, change]) => {
      rows.push({
        label: `${field} change`,
        value: `${formatValue(change?.from)} → ${formatValue(change?.to)}`,
      });
    });
  }

  return rows;
}

export function buildActionCounts(logs) {
  return logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});
}

export const CATEGORY_STYLES = {
  users: "bg-primary/10 text-primary border-primary/20",
  auth: "bg-info/10 text-info border-info/20",
  sso: "bg-primary/10 text-primary border-primary/20",
  settings: "bg-warning/10 text-warning border-warning/20",
  data: "bg-success/10 text-success border-success/20",
  other: "bg-muted text-muted-foreground border-border",
};

export function shouldShowActorTargetFlow(log) {
  const actor = log.actor_user_id || log.actor_label;
  const target = log.target_user_id || (log.target_label && log.target_label !== "-");
  if (!target) return false;
  if (log.action === "user_login" && log.actor_user_id === log.target_user_id) return false;
  return Boolean(actor || target);
}
