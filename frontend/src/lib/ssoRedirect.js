const RETURN_TO_KEY = "linkly_sso_return_to";

/**
 * @param {string | null | undefined} value
 */
export function storeSsoReturnTo(value) {
  if (typeof window === "undefined" || !value) return;
  window.sessionStorage.setItem(RETURN_TO_KEY, value);
}

export function consumeSsoReturnTo() {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(RETURN_TO_KEY);
  window.sessionStorage.removeItem(RETURN_TO_KEY);
  return value;
}

/**
 * @param {string | undefined} path
 */
export function sanitizeClientRedirect(path) {
  const raw = String(path || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  const lower = raw.toLowerCase();
  if (lower.includes("javascript:") || lower.includes("data:")) {
    return "/";
  }
  return raw;
}
