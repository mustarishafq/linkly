import db from "@/api/openClient";
import { isLinkPreviewMode } from "@/lib/linkPreview";
import { isReservedShortLinkSlug } from "@/lib/reservedPaths";
import {
  destinationLabel,
  formatRedirectCountdownText,
  isRedirectHtmlEmpty,
  normalizeCustomRedirect,
  sanitizeRedirectHtml,
} from "@/lib/customRedirect";
import { cn } from "@/lib/utils";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { detectBrowser, detectDevice, detectPlatform, detectReferrerSource } from "@/lib/clickContext";
import "@/components/links/custom-redirect.css";

function normalizeHost(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).host.toLowerCase();
  } catch {
    return raw;
  }
}

const PREVIEW_COUNTDOWN_SECONDS = 5;
const IMAGE_READY_TIMEOUT_MS = 4000;

function imageSourcesFromHtml(html) {
  const value = String(html || "").trim();
  if (!value || typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(value, "text/html");
  return [...doc.querySelectorAll("img")]
    .map((img) => String(img.getAttribute("src") || "").trim())
    .filter((src) => /^https?:\/\//i.test(src) || (src.startsWith("/") && !src.startsWith("//")));
}

function whenImageReady(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = src;
    if (img.complete) done();
  });
}

async function waitForRedirectImages(html, markup) {
  const sources = [...new Set([...imageSourcesFromHtml(html), ...imageSourcesFromHtml(markup)])];
  if (sources.length === 0) return;
  await Promise.race([
    Promise.all(sources.map(whenImageReady)),
    new Promise((resolve) => window.setTimeout(resolve, IMAGE_READY_TIMEOUT_MS)),
  ]);
}

export default function RedirectPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState("redirecting");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVariant, setPreviewVariant] = useState(null);
  const [previewCountdown, setPreviewCountdown] = useState(PREVIEW_COUNTDOWN_SECONDS);
  const [countdownTotal, setCountdownTotal] = useState(PREVIEW_COUNTDOWN_SECONDS);
  const [customPage, setCustomPage] = useState(null);
  const countdownIntervalRef = useRef(null);
  const isPreview = isLinkPreviewMode();

  function continueToDestination(url = previewUrl) {
    if (!url) return;
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    window.location.href = url;
  }

  useEffect(() => {
    if ((status !== "preview" && status !== "custom") || !previewUrl) return;

    setPreviewCountdown(countdownTotal);

    countdownIntervalRef.current = window.setInterval(() => {
      setPreviewCountdown((current) => {
        if (current <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          window.location.href = previewUrl;
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [status, previewUrl, countdownTotal]);

  useEffect(() => {
    let cancelled = false;

    async function handleRedirect() {
      if (isReservedShortLinkSlug(slug)) {
        setStatus("not_found");
        return;
      }

      const links = await db.entities.ShortLink.filter({ slug });
      const requestHost = normalizeHost(window.location.host);
      const link =
        links.find((item) => normalizeHost(item.custom_domain) === requestHost) ||
        links.find((item) => !item.custom_domain) ||
        links[0];

      if (!link) {
        setStatus("not_found");
        return;
      }

      if (link.status === "expired" || link.status === "paused") {
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      if (link.expire_by_date && new Date(link.expire_by_date) < new Date()) {
        if (!isPreview) {
          await db.entities.ShortLink.update(link.id, { status: "expired" });
        }
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      if (
        !isPreview &&
        link.expire_by_clicks &&
        (link.total_clicks || 0) >= link.expire_by_clicks
      ) {
        await db.entities.ShortLink.update(link.id, { status: "expired" });
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      const ua = navigator.userAgent;
      const browser = detectBrowser(ua);
      const deviceType = detectDevice(ua);
      const platform = detectPlatform(ua);

      const rules = await db.entities.RedirectRule.filter({ link_id: link.id });
      const activeRules = rules.filter((r) => r.is_active).sort((a, b) => (b.priority || 0) - (a.priority || 0));

      let redirectUrl = link.destination_url;

      for (const rule of activeRules) {
        if (rule.rule_type === "device" && deviceType === rule.condition_value) {
          redirectUrl = rule.redirect_url;
          break;
        }
      }

      let abVariant = null;
      if (link.is_ab_test) {
        const variants = await db.entities.ABVariant.filter({ link_id: link.id });
        if (variants.length > 0) {
          const selected = selectVariant(variants);
          if (selected) {
            redirectUrl = selected.destination_url;
            abVariant = selected.name;
            if (!isPreview) {
              await db.entities.ABVariant.update(selected.id, {
                clicks: (selected.clicks || 0) + 1,
              });
            }
          }
        }
      }

      const clickPayload = {
        link_id: link.id,
        slug: link.slug,
        campaign_id: link.campaign_id || null,
        timestamp: new Date().toISOString(),
        user_agent: ua,
        browser: browser.name,
        browser_version: browser.version,
        device_type: deviceType,
        platform,
        referrer: document.referrer || null,
        referrer_source: detectReferrerSource(document.referrer),
        is_unique: !isPreview,
        is_test: isPreview,
        ab_variant: abVariant,
      };

      async function recordClick() {
        await db.entities.ClickLog.create(clickPayload);
        if (!isPreview) {
          await db.entities.ShortLink.update(link.id, {
            total_clicks: (link.total_clicks || 0) + 1,
          });
        }
      }

      const page = normalizeCustomRedirect(link);
      if (isPreview || page.enabled) {
        void recordClick().catch(() => {});
        if (page.enabled) {
          await waitForRedirectImages(page.html, page.markup);
        }
        if (cancelled) return;
        setPreviewUrl(redirectUrl);
        setPreviewVariant(abVariant);
        setCustomPage(page.enabled ? page : null);
        setCountdownTotal(page.enabled ? page.delay : PREVIEW_COUNTDOWN_SECONDS);
        setStatus(page.enabled ? "custom" : "preview");
        return;
      }

      await recordClick();
      if (!cancelled) window.location.href = redirectUrl;
    }

    handleRedirect();
    return () => {
      cancelled = true;
    };
  }, [slug, isPreview]);

  if (status === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-muted-foreground mt-2">This link does not exist</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-muted-foreground mt-2">This link is no longer active</p>
        </div>
      </div>
    );
  }

  if (status === "custom" && previewUrl && customPage) {
    return (
      <CustomRedirectView
        page={customPage}
        destinationUrl={previewUrl}
        countdown={previewCountdown}
        isPreview={isPreview}
        variant={previewVariant}
        onContinue={() => continueToDestination()}
      />
    );
  }

  if (status === "preview" && previewUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ring-1",
              "bg-warning/10 text-warning ring-warning/20"
            )}
          >
            Preview mode
          </span>
          <h1 className="text-lg font-semibold mt-3">This click won&apos;t count in analytics</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Redirecting through the full short-link path. Remove{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">?preview=1</code> when sharing.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3 text-left">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Destination
            </p>
            <p className="text-sm font-mono break-all text-foreground">{previewUrl}</p>
            {previewVariant && (
              <p className="text-xs text-muted-foreground mt-2">A/B variant: {previewVariant}</p>
            )}
          </div>
          <div className="mt-5 flex flex-col items-center gap-1">
            <span className="text-4xl font-bold tabular-nums text-primary leading-none">
              {previewCountdown}
            </span>
            <span className="text-xs text-muted-foreground">
              Redirecting in {previewCountdown} second{previewCountdown === 1 ? "" : "s"}...
            </span>
          </div>
          <Button
            className="mt-5 w-full sm:w-auto"
            onClick={() => continueToDestination()}
          >
            Continue now
          </Button>
        </div>
      </div>
    );
  }

  return <RedirectPending />;
}

function RedirectPending() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="mx-auto mt-4 h-4 w-4/5" />
        <Skeleton className="mx-auto mt-2 h-4 w-3/5" />
        <Skeleton className="mx-auto mt-6 h-10 w-10" />
        <Skeleton className="mx-auto mt-2 h-3 w-24" />
        <Skeleton className="mx-auto mt-5 h-10 w-28" />
      </div>
    </div>
  );
}

function CountdownLine({ text, seconds }) {
  const line = formatRedirectCountdownText(text, seconds);

  return (
    <div className="mt-5 flex flex-col items-center gap-1">
      <span className="text-4xl font-bold tabular-nums text-primary leading-none">
        {seconds}
      </span>
      {line ? <span className="text-xs text-muted-foreground">{line}</span> : null}
    </div>
  );
}

function CustomRedirectView({ page, destinationUrl, countdown, isPreview, variant, onContinue }) {
  const markupRef = useRef(null);
  const safeHtml = useMemo(() => sanitizeRedirectHtml(page.html), [page.html]);
  const markup = String(page.markup || "").trim();
  const hasContent = !isRedirectHtmlEmpty(safeHtml);
  const host = destinationLabel(destinationUrl);

  useEffect(() => {
    const container = markupRef.current;
    if (!container) return undefined;
    container.innerHTML = markup;
    container.querySelectorAll("script").forEach((oldScript) => {
      const script = document.createElement("script");
      [...oldScript.attributes].forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      script.text = oldScript.textContent || "";
      oldScript.replaceWith(script);
    });
    return () => {
      container.innerHTML = "";
    };
  }, [markup]);

  useEffect(() => {
    const css = String(page.css || "").trim();
    if (!css) return undefined;
    const style = document.createElement("style");
    style.setAttribute("data-custom-redirect", "css");
    style.textContent = css;
    document.head.appendChild(style);
    return () => style.remove();
  }, [page.css]);

  useEffect(() => {
    const source = String(page.js || "").trim();
    if (!source) return undefined;
    const script = document.createElement("script");
    script.setAttribute("data-custom-redirect", "js");
    script.text = source;
    document.body.appendChild(script);
    return () => script.remove();
  }, [page.js]);

  return (
    <div className="custom-redirect-page min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        {isPreview && (
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ring-1 mb-3",
              "bg-warning/10 text-warning ring-warning/20"
            )}
          >
            Preview mode
          </span>
        )}
        {hasContent ? (
          <div
            className="custom-redirect-content text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : !markup ? (
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        ) : null}
        {markup ? (
          <div ref={markupRef} className="custom-redirect-html text-sm text-foreground" />
        ) : null}
        {host && (
          <p className="text-xs text-muted-foreground mt-3">Continuing to {host}</p>
        )}
        {isPreview && variant && (
          <p className="text-xs text-muted-foreground mt-1">A/B variant: {variant}</p>
        )}
        <CountdownLine text={page.countdownText} seconds={countdown} />
        <Button className="mt-5 w-full sm:w-auto" onClick={onContinue}>
          {page.buttonLabel}
        </Button>
      </div>
    </div>
  );
}

function selectVariant(variants) {
  const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
  if (totalWeight === 0) return variants[0];
  let random = Math.random() * totalWeight;
  for (const variant of variants) {
    random -= variant.weight || 0;
    if (random <= 0) return variant;
  }
  return variants[0];
}
