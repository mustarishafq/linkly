import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Grip,
  Link2,
  History,
  FlaskConical,
  Route,
  Globe,
  Shield,
  ScrollText,
  Settings,
} from "lucide-react";

/** 5-tab mobile glass dock — Linkly routes */
export const MOBILE_BOTTOM_NAV_ITEMS = [
  { type: "link", icon: LayoutDashboard, label: "Home", path: "/" },
  { type: "link", icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { type: "apps-orb", label: "Links", path: "/links" },
  { type: "link", icon: BarChart3, label: "Analytics", path: "/analytics" },
  { type: "more", icon: Grip, label: "More" },
];

const DESKTOP_NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Link2, label: "Links", path: "/links" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: History, label: "History", path: "/history" },
  { icon: FlaskConical, label: "A/B Testing", path: "/ab-testing" },
  { icon: Route, label: "Redirects", path: "/redirects" },
  { icon: Globe, label: "Domains", path: "/domains" },
  { icon: Shield, label: "Users", path: "/users", adminOnly: true },
  { icon: ScrollText, label: "Audit Logs", path: "/audit-logs", adminOnly: true },
  { icon: Settings, label: "Settings", path: "/settings", adminOnly: true },
];

const MOBILE_DOCK_PATHS = new Set(["/", "/campaigns", "/links", "/analytics"]);

const MOBILE_MORE_PATHS = [
  "/history",
  "/ab-testing",
  "/redirects",
  "/domains",
  "/users",
  "/audit-logs",
  "/settings",
];

export function buildDesktopNavItems(user) {
  return DESKTOP_NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");
}

export function buildMobileMoreItems(user) {
  return DESKTOP_NAV_ITEMS.filter(
    (item) => !MOBILE_DOCK_PATHS.has(item.path) && (!item.adminOnly || user?.role === "admin")
  );
}

export function filterNavItems(items, user) {
  return items.filter((item) => !item.adminOnly || user?.role === "admin");
}

export function isNavActive(pathname, path) {
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isMoreMenuActive(pathname) {
  return MOBILE_MORE_PATHS.some((p) => isNavActive(pathname, p));
}

// Legacy exports
export const mobileDockItems = MOBILE_BOTTOM_NAV_ITEMS;
export const allNavItems = DESKTOP_NAV_ITEMS;
export const moreMenuItems = buildMobileMoreItems;
