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
 * @param {string} [returnTo]
 */
export function getNexusBrainLogoutUrl(returnTo) {
  const base = getNexusBrainUrl();
  if (!returnTo) return base;
  return `${base}?return_to=${encodeURIComponent(returnTo)}`;
}

export function isNexusSsoEnabled() {
  return Boolean(getNexusBrainUrl());
}
