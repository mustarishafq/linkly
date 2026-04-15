import db from "@/api/openClient";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Zap } from "lucide-react";

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

export default function RedirectPage() {
  const { slug } = useParams();
  const [status, setStatus] = useState("redirecting");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function handleRedirect() {
      // Find the link by slug and match custom domain when duplicates exist.
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

      // Check if expired
      if (link.status === "expired" || link.status === "paused") {
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      // Check date expiry
      if (link.expire_by_date && new Date(link.expire_by_date) < new Date()) {
        await db.entities.ShortLink.update(link.id, { status: "expired" });
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      // Check click limit expiry
      if (link.expire_by_clicks && (link.total_clicks || 0) >= link.expire_by_clicks) {
        await db.entities.ShortLink.update(link.id, { status: "expired" });
        if (link.fallback_url) {
          window.location.href = link.fallback_url;
          return;
        }
        setStatus("expired");
        return;
      }

      // Detect visitor info
      const ua = navigator.userAgent;
      const browser = detectBrowser(ua);
      const deviceType = detectDevice(ua);
      const platform = detectPlatform(ua);

      // Check smart redirect rules
      const rules = await db.entities.RedirectRule.filter({ link_id: link.id });
      const activeRules = rules.filter((r) => r.is_active).sort((a, b) => (b.priority || 0) - (a.priority || 0));

      let redirectUrl = link.destination_url;

      for (const rule of activeRules) {
        if (rule.rule_type === "device" && deviceType === rule.condition_value) {
          redirectUrl = rule.redirect_url;
          break;
        }
        // Country and schedule rules would need backend support for IP geolocation
      }

      // Handle A/B testing
      let abVariant = null;
      if (link.is_ab_test) {
        const variants = await db.entities.ABVariant.filter({ link_id: link.id });
        if (variants.length > 0) {
          const selected = selectVariant(variants);
          if (selected) {
            redirectUrl = selected.destination_url;
            abVariant = selected.name;
            await db.entities.ABVariant.update(selected.id, {
              clicks: (selected.clicks || 0) + 1,
            });
          }
        }
      }

      // Log click
      await db.entities.ClickLog.create({
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
        is_unique: true,
        ab_variant: abVariant,
      });

      // Update click count
      await db.entities.ShortLink.update(link.id, {
        total_clicks: (link.total_clicks || 0) + 1,
      });

      // Redirect
      window.location.href = redirectUrl;
    }

    handleRedirect();
  }, [slug]);

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

function detectBrowser(ua) {
  if (ua.includes("Firefox")) return { name: "Firefox", version: ua.match(/Firefox\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Edg")) return { name: "Edge", version: ua.match(/Edg\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Chrome")) return { name: "Chrome", version: ua.match(/Chrome\/([\d.]+)/)?.[1] || "" };
  if (ua.includes("Safari")) return { name: "Safari", version: ua.match(/Version\/([\d.]+)/)?.[1] || "" };
  return { name: "Other", version: "" };
}

function detectDevice(ua) {
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile|iphone|android.*mobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

function detectPlatform(ua) {
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh|mac os/i.test(ua)) return "macOS";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function detectReferrerSource(referrer) {
  if (!referrer) return "Direct";
  if (referrer.includes("facebook.com") || referrer.includes("fb.com")) return "Facebook";
  if (referrer.includes("instagram.com")) return "Instagram";
  if (referrer.includes("whatsapp")) return "WhatsApp";
  if (referrer.includes("twitter.com") || referrer.includes("t.co")) return "Twitter";
  if (referrer.includes("google.com")) return "Google";
  return "Other";
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