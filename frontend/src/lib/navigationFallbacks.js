const FALLBACK_RULES = [
  [/^\/links\/[^/]+/, "/links"],
  [/^\/campaigns\/[^/]+/, "/campaigns"],
  [/^\/linktrees\/[^/]+/, "/linktrees"],
];

export function getNavigationFallback(pathname) {
  for (const [pattern, fallback] of FALLBACK_RULES) {
    if (pattern.test(pathname)) {
      return fallback;
    }
  }

  return "/";
}
