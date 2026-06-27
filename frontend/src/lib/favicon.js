const SKIP_FAVICON_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "localhost",
  "127.0.0.1",
]);

export function getDomainFromUrl(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getFaviconUrl(urlOrDomain) {
  const domain = urlOrDomain.includes("://")
    ? getDomainFromUrl(urlOrDomain)
    : String(urlOrDomain || "").toLowerCase();

  if (!domain || SKIP_FAVICON_DOMAINS.has(domain)) {
    return null;
  }

  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}
