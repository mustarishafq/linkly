export const DEFAULT_REDIRECT_DELAY = 5;
export const MIN_REDIRECT_DELAY = 1;
export const MAX_REDIRECT_DELAY = 30;
export const DEFAULT_REDIRECT_BUTTON_LABEL = "Continue";
export const DEFAULT_REDIRECT_COUNTDOWN_TEXT = "Redirecting...";
export const DEFAULT_REDIRECT_HTML =
  "<p>Thanks for clicking. You will continue in a moment.</p>";

export const MAX_CUSTOM_CODE_LENGTH = 20000;

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "a",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
  "span",
  "img",
]);

const BLOCKED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "button",
  "link",
  "meta",
  "base",
  "svg",
  "math",
]);

const ALIGN_CLASS = /^ql-align-(center|right|justify)$/;

export function clampRedirectDelay(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_REDIRECT_DELAY;
  return Math.min(MAX_REDIRECT_DELAY, Math.max(MIN_REDIRECT_DELAY, Math.round(parsed)));
}

export function normalizeRedirectButtonLabel(value) {
  const label = String(value || "").trim().slice(0, 40);
  return label || DEFAULT_REDIRECT_BUTTON_LABEL;
}

export function normalizeRedirectCountdownText(value) {
  const text = String(value ?? "").trim().slice(0, 80);
  return text || DEFAULT_REDIRECT_COUNTDOWN_TEXT;
}

export function formatRedirectCountdownText(value, seconds) {
  const count = String(Math.max(0, Math.round(Number(seconds) || 0)));
  return normalizeRedirectCountdownText(value).replace(/\{seconds\}/gi, count);
}

export function isRedirectHtmlEmpty(html) {
  const text = String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0;
}

export function clampCustomCode(value) {
  return String(value || "").slice(0, MAX_CUSTOM_CODE_LENGTH);
}

export function normalizeCustomRedirect(link) {
  const enabled = Boolean(link?.custom_redirect_enabled);
  return {
    enabled,
    html: typeof link?.custom_redirect_html === "string" ? link.custom_redirect_html : "",
    markup: clampCustomCode(link?.custom_redirect_raw_html),
    css: clampCustomCode(link?.custom_redirect_css),
    js: clampCustomCode(link?.custom_redirect_js),
    delay: clampRedirectDelay(link?.custom_redirect_delay ?? DEFAULT_REDIRECT_DELAY),
    buttonLabel: normalizeRedirectButtonLabel(link?.custom_redirect_button_label),
    countdownText: normalizeRedirectCountdownText(link?.custom_redirect_countdown_text),
  };
}

function isSafeHref(href) {
  const value = String(href || "").trim();
  return /^(https?:\/\/|mailto:)/i.test(value);
}

function isSafeImageSrc(src) {
  const value = String(src || "").trim();
  if (/^https?:\/\//i.test(value)) return true;
  return value.startsWith("/") && !value.startsWith("//");
}

function applyAllowedAttributes(source, target) {
  const tag = target.tagName.toLowerCase();
  const align = String(source.getAttribute("class") || "")
    .split(/\s+/)
    .find((name) => ALIGN_CLASS.test(name));
  if (align) target.setAttribute("class", align);

  if (tag === "img") {
    const src = source.getAttribute("src");
    if (isSafeImageSrc(src)) target.setAttribute("src", src.trim());
    const alt = source.getAttribute("alt");
    if (alt) target.setAttribute("alt", alt.slice(0, 200));
    return;
  }

  if (tag !== "a") return;
  const href = source.getAttribute("href");
  if (!isSafeHref(href)) return;
  target.setAttribute("href", href.trim());
  target.setAttribute("target", "_blank");
  target.setAttribute("rel", "noopener noreferrer");
}

function cleanNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tag)) return null;

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      const cleaned = cleanNode(child);
      if (cleaned) fragment.appendChild(cleaned);
    });
    return fragment;
  }

  const element = document.createElement(tag);
  applyAllowedAttributes(node, element);
  if (tag === "img" && !element.getAttribute("src")) return null;
  Array.from(node.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) element.appendChild(cleaned);
  });
  return element;
}

export function sanitizeRedirectHtml(html) {
  const source = String(html || "");
  if (!source.trim() || typeof document === "undefined") return "";

  const parsed = new DOMParser().parseFromString(source, "text/html");
  const fragment = document.createDocumentFragment();
  Array.from(parsed.body.childNodes).forEach((child) => {
    const cleaned = cleanNode(child);
    if (cleaned) fragment.appendChild(cleaned);
  });

  const holder = document.createElement("div");
  holder.appendChild(fragment);
  return holder.innerHTML;
}

export function destinationLabel(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
