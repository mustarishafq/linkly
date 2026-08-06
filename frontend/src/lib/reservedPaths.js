/** App routes that must not be used as short-link slugs. */
export const RESERVED_SHORT_LINK_SLUGS = new Set([
  "login",
  "register",
  "forgot-password",
  "sso",
  "links",
  "campaigns",
  "linktrees",
  "t",
  "analytics",
  "history",
  "ab-testing",
  "redirects",
  "domains",
  "users",
  "audit-logs",
  "settings",
]);

export function isReservedShortLinkSlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  return !normalized || RESERVED_SHORT_LINK_SLUGS.has(normalized);
}
