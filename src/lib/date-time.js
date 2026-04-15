const APP_TIMEZONE = (/** @type {any} */ (import.meta).env?.VITE_APP_TIMEZONE) || "UTC";

/**
 * @param {string | number | Date} value
 * @param {string} [timezone]
 */
export function formatInAppTimezone(value, timezone) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone || APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export { APP_TIMEZONE };
