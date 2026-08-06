/** Shared UA / referrer helpers for click logging. */

export function detectBrowser(ua = navigator.userAgent) {
  if (ua.includes("Firefox")) return { name: "Firefox", version: ua.match(/Firefox\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Edg")) return { name: "Edge", version: ua.match(/Edg\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Chrome")) return { name: "Chrome", version: ua.match(/Chrome\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Safari")) return { name: "Safari", version: ua.match(/Version\/([\d.]+)/)?.[1] || "" };
  return { name: "Other", version: "" };
}

export function detectDevice(ua = navigator.userAgent) {
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

export function detectPlatform(ua = navigator.userAgent) {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export function detectReferrerSource(referrer) {
  if (!referrer) return "Direct";
  if (referrer.includes("facebook.com") || referrer.includes("fb.com")) return "Facebook";
  if (referrer.includes("instagram.com")) return "Instagram";
  if (referrer.includes("whatsapp")) return "WhatsApp";
  if (referrer.includes("twitter.com") || referrer.includes("t.co") || referrer.includes("x.com")) {
    return "Twitter";
  }
  if (referrer.includes("google.com")) return "Google";
  return "Other";
}

export function buildClientClickContext() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const browser = detectBrowser(ua);
  const referrer = typeof document !== "undefined" ? document.referrer || null : null;

  return {
    timestamp: new Date().toISOString(),
    user_agent: ua,
    browser: browser.name,
    browser_version: browser.version,
    device_type: detectDevice(ua),
    platform: detectPlatform(ua),
    referrer,
    referrer_source: detectReferrerSource(referrer),
  };
}
