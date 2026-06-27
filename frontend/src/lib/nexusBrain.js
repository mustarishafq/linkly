const DEFAULT_NEXUS_BRAIN_URL = "https://emzinexus.com";

export const NEXUS_BRAIN_URL =
  (/** @type {any} */ (import.meta).env?.VITE_NEXUS_BRAIN_URL) || DEFAULT_NEXUS_BRAIN_URL;

export function getNexusBrainUrl() {
  return NEXUS_BRAIN_URL.replace(/\/$/, "");
}

export function getNexusBrainLoginUrl() {
  return getNexusBrainUrl();
}

/**
 * Resolve a Nexus Brain return target to a full URL.
 * Prefer direct navigation (e.g. /applications) over ?return_to= on the root,
 * since Nexus may not consume the query param on landing.
 *
 * @param {string} [returnTo]
 */
export function getNexusBrainLogoutUrl(returnTo) {
  const base = getNexusBrainUrl();
  if (!returnTo) return base;

  const raw = String(returnTo).trim();
  if (!raw) return base;

  const nexusOrigin = (() => {
    try {
      return new URL(base).origin;
    } catch {
      return null;
    }
  })();

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return `${base}${raw}`;
  }

  try {
    const parsed = new URL(raw);
    if (nexusOrigin && parsed.origin === nexusOrigin) {
      return parsed.toString();
    }
  } catch {
    // fall through to query-param fallback
  }

  return `${base}?return_to=${encodeURIComponent(raw)}`;
}

export function isNexusSsoEnabled() {
  return Boolean(getNexusBrainUrl());
}
