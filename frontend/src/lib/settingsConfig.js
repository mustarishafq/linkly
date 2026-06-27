import { Bell, QrCode, Settings2, ShieldCheck } from "lucide-react";

export const SETTINGS_TABS = [
  {
    id: "general",
    label: "General",
    description: "Organization name, domain, and timezone",
    icon: Settings2,
  },
  {
    id: "security",
    label: "Security & SSO",
    description: "Nexus authentication and access",
    icon: ShieldCheck,
  },
  {
    id: "qr",
    label: "QR Codes",
    description: "Default branding for new links",
    icon: QrCode,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Outbound event webhooks",
    icon: Bell,
  },
];

export const VALID_SETTINGS_TAB_IDS = new Set(SETTINGS_TABS.map((tab) => tab.id));

export const APP_NAME = "EMZI Nexus Linkly";

export const DEFAULT_GENERAL_SETTINGS = {
  organization_name: APP_NAME,
  default_domain: "",
  brand_primary: "#0f766e",
  timezone: "UTC",
};

export const TIMEZONE_OPTIONS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Kuala_Lumpur",
  "Australia/Sydney",
];

export const WEBHOOK_EVENT_OPTIONS = [
  {
    id: "link.created",
    label: "Link created",
    description: "When a new short link is created",
  },
  {
    id: "link.updated",
    label: "Link updated",
    description: "When a link destination or settings change",
  },
  {
    id: "link.deleted",
    label: "Link deleted",
    description: "When a short link is removed",
  },
  {
    id: "user.registered",
    label: "User registered",
    description: "When a new user signs up",
  },
  {
    id: "user.approved",
    label: "User approved",
    description: "When an admin approves a user account",
  },
  {
    id: "link.metric_threshold",
    label: "Link metric threshold",
    description: "When a link notification rule target is reached",
  },
  {
    id: "webhook.test",
    label: "Test events",
    description: "Allow test delivery from settings",
  },
];

export function buildDefaultWebhookEvents() {
  return Object.fromEntries(WEBHOOK_EVENT_OPTIONS.map((event) => [event.id, false]));
}
