import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import {
  clampRedirectDelay,
  destinationLabel,
  formatRedirectCountdownText,
  isRedirectHtmlEmpty,
  normalizeRedirectButtonLabel,
  sanitizeRedirectHtml,
} from "@/lib/customRedirect";

const LIGHT = {
  background: "hsl(220 20% 97%)",
  foreground: "hsl(222 47% 11%)",
  card: "hsl(0 0% 100%)",
  primary: "hsl(206 92% 36%)",
  primaryForeground: "hsl(0 0% 100%)",
  muted: "hsl(220 9% 46%)",
  border: "hsl(220 13% 91%)",
};

const DARK = {
  background: "hsl(222 47% 6%)",
  foreground: "hsl(220 14% 96%)",
  card: "hsl(222 47% 9%)",
  primary: "hsl(206 92% 36%)",
  primaryForeground: "hsl(0 0% 100%)",
  muted: "hsl(220 9% 56%)",
  border: "hsl(222 40% 16%)",
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeStyle(css) {
  return String(css || "").replace(/<\/style/gi, "<\\/style");
}

function escapeScript(js) {
  return String(js || "").replace(/<\/script/gi, "<\\/script");
}

function buildPreviewDocument({
  html,
  markup,
  css,
  js,
  delay,
  buttonLabel,
  countdownText,
  destinationUrl,
  palette,
}) {
  const safeHtml = sanitizeRedirectHtml(html);
  const hasRichText = !isRedirectHtmlEmpty(safeHtml);
  const raw = String(markup || "").trim();
  const host = destinationLabel(destinationUrl);
  const seconds = clampRedirectDelay(delay);
  const label = normalizeRedirectButtonLabel(buttonLabel);
  const countdownLine = escapeHtml(formatRedirectCountdownText(countdownText, seconds));
  const content = hasRichText
    ? `<div class="custom-redirect-content">${safeHtml}</div>`
    : raw
      ? ""
      : `<p class="muted">Redirecting...</p>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; min-height: 100%; }
  body {
    font-family: Inter, system-ui, sans-serif;
    background: ${palette.background};
    color: ${palette.foreground};
  }
  .custom-redirect-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .card {
    width: 100%;
    max-width: 28rem;
    text-align: center;
    border-radius: 1rem;
    border: 1px solid ${palette.border};
    background: ${palette.card};
    padding: 24px;
  }
  .custom-redirect-content p, .custom-redirect-html p { margin: 0.4em 0; }
  .custom-redirect-content h1, .custom-redirect-html h1,
  .custom-redirect-content h2, .custom-redirect-html h2,
  .custom-redirect-content h3, .custom-redirect-html h3 {
    font-weight: 700;
    line-height: 1.25;
    margin: 0.4em 0;
  }
  .custom-redirect-content h1, .custom-redirect-html h1 { font-size: 1.5rem; }
  .custom-redirect-content h2, .custom-redirect-html h2 { font-size: 1.25rem; }
  .custom-redirect-content ul, .custom-redirect-html ul { list-style: disc; padding-left: 1.25rem; text-align: left; }
  .custom-redirect-content ol, .custom-redirect-html ol { list-style: decimal; padding-left: 1.25rem; text-align: left; }
  .custom-redirect-content a, .custom-redirect-html a { color: ${palette.primary}; }
  .custom-redirect-content img, .custom-redirect-html img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0.6em auto;
    border-radius: 0.75rem;
  }
  .ql-align-center { text-align: center; }
  .ql-align-right { text-align: right; }
  .ql-align-justify { text-align: justify; }
  .muted { color: ${palette.muted}; font-size: 0.875rem; }
  .count { margin-top: 20px; font-size: 2.25rem; font-weight: 700; color: ${palette.primary}; line-height: 1; }
  .count-label { margin-top: 4px; font-size: 0.75rem; color: ${palette.muted}; }
  .continue {
    margin-top: 20px;
    border: 0;
    border-radius: 0.5rem;
    background: ${palette.primary};
    color: ${palette.primaryForeground};
    height: 40px;
    padding: 0 16px;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
  }
</style>
<style>${escapeStyle(css)}</style>
</head>
<body>
  <div class="custom-redirect-page">
    <div class="card">
      ${content}
      ${raw ? `<div class="custom-redirect-html">${raw}</div>` : ""}
      ${host ? `<p class="muted" style="margin-top:12px">Continuing to ${escapeHtml(host)}</p>` : ""}
      <div class="count">${seconds}</div>
      ${countdownLine ? `<div class="count-label">${countdownLine}</div>` : ""}
      <button class="continue" type="button">${escapeHtml(label)}</button>
    </div>
  </div>
  <script>${escapeScript(js)}</script>
</body>
</html>`;
}

export default function RedirectLivePreview({
  html,
  rawHtml,
  css,
  js,
  delay,
  buttonLabel,
  countdownText,
  destinationUrl,
}) {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const srcDoc = useMemo(
    () =>
      buildPreviewDocument({
        html,
        markup: rawHtml,
        css,
        js,
        delay,
        buttonLabel,
        countdownText,
        destinationUrl,
        palette: isDark ? DARK : LIGHT,
      }),
    [html, rawHtml, css, js, delay, buttonLabel, countdownText, destinationUrl, isDark]
  );

  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/30 p-3 lg:sticky lg:top-0">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Live preview</p>
          <p className="text-xs text-muted-foreground">Updates as you edit. Nothing is saved yet.</p>
        </div>
      </div>
      <div className="h-[520px] overflow-hidden rounded-xl border border-border bg-background">
        <iframe
          title="Custom redirect preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="h-full w-full border-0 bg-background"
        />
      </div>
    </div>
  );
}
