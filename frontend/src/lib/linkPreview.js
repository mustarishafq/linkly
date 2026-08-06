import { getShortUrl } from "@/lib/qrcode";

export const LINK_PREVIEW_PARAM = "preview";

export function isLinkPreviewMode(search = window.location.search) {
  const params = new URLSearchParams(search);
  const value = params.get(LINK_PREVIEW_PARAM) ?? params.get("test");
  if (value === null) return false;
  return value === "" || value === "1" || value.toLowerCase() === "true";
}

export function getTestLinkUrl(slug, customDomain) {
  const url = new URL(getShortUrl(slug, customDomain));
  url.searchParams.set(LINK_PREVIEW_PARAM, "1");
  return url.toString();
}

export function isTestClick(click) {
  return Boolean(click?.is_test);
}

/** True when the click belongs to a Link Tree (not a short link). */
export function isLinkTreeClick(click) {
  return Boolean(click?.link_tree_id) || click?.event === "page_view" || click?.event === "block_click";
}

/** Official short-link clicks only (excludes previews and Link Tree events). */
export function filterOfficialClicks(clicks) {
  return clicks.filter((click) => !isTestClick(click) && !isLinkTreeClick(click));
}

export function filterOfficialLinkTreeClicks(clicks) {
  return clicks.filter((click) => !isTestClick(click) && isLinkTreeClick(click));
}
