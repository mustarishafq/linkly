import db from "@/api/openClient";
import { isLinkPreviewMode } from "@/lib/linkPreview";
import { isReservedShortLinkSlug } from "@/lib/reservedPaths";

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectBrowser, detectDevice, detectPlatform, detectReferrerSource } from "@/lib/clickContext";

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

export default function RedirectPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState("redirecting");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewVariant, setPreviewVariant] = useState(null);
  const [previewCountdown, setPreviewCountdown] = useState(PREVIEW_COUNTDOWN_SECONDS);
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
    if (status !== "preview" || !previewUrl) return;

    setPreviewCountdown(PREVIEW_COUNTDOWN_SECONDS);

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
  }, [status, previewUrl]);

  useEffect(() => {
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

      await db.entities.ClickLog.create(clickPayload);

      if (!isPreview) {
        await db.entities.ShortLink.update(link.id, {
          total_clicks: (link.total_clicks || 0) + 1,
        });

        window.location.href = redirectUrl;
        return;
      }

      setPreviewUrl(redirectUrl);
      setPreviewVariant(abVariant);
      setStatus("preview");
    }

    handleRedirect();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground mt-4">Redirecting...</p>
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
