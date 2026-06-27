import db from "@/api/openClient";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  QrCode,
  ExternalLink,
  MousePointerClick,
  Users,
  Target,
  Share2,
  Link2,
  Globe,
  Tag,
  Megaphone,
  Percent,
  Edit,
  Check,
  ArrowUpRight,
  Globe2,
} from "lucide-react";
import { getShortUrl } from "@/lib/qrcode";
import { toast } from "@/components/ui/use-toast";
import { format, subDays, startOfDay, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import WeekSummary from "@/components/dashboard/WeekSummary";
import SourceBreakdown from "@/components/dashboard/SourceBreakdown";
import LinkRecentActivity from "@/components/dashboard/LinkRecentActivity";
import QRDesignManager from "@/components/qr/QRDesignManager";
import LinkFormDialog from "@/components/links/LinkFormDialog";
import LinkNotificationManager from "@/components/links/LinkNotificationManager";
import QRDialog from "@/components/links/QRDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { glassPanelStyles } from "@/components/layout/glassStyles";

function getPeriodChange(current, previous) {
  if (previous === 0) return current > 0 ? { change: 100, changeType: "up" } : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { change: 0, changeType: "neutral" };
  return { change: Math.abs(pct), changeType: pct > 0 ? "up" : "down" };
}

function countInRange(clicks, start, endExclusive, uniqueOnly = false) {
  return clicks.filter((c) => {
    const date = new Date(c.created_date);
    if (isBefore(date, start) || !isBefore(date, endExclusive)) return false;
    if (uniqueOnly && !c.is_unique) return false;
    return true;
  }).length;
}

function countByField(clicks, field, fallback) {
  const counts = {};
  clicks.forEach((c) => {
    const key = c[field] || fallback;
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function LinkDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] sm:h-[120px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[200px] rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[360px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { label: "Active", dot: "bg-success", cls: "bg-success/10 text-success ring-success/20" },
    expired: { label: "Expired", dot: "bg-destructive", cls: "bg-destructive/10 text-destructive ring-destructive/20" },
    inactive: { label: "Inactive", dot: "bg-warning", cls: "bg-warning/10 text-warning ring-warning/20" },
  };
  const s = map[status] || { label: status, dot: "bg-muted-foreground", cls: "bg-muted text-muted-foreground ring-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ring-1", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function LinkFavicon({ url }) {
  const domain = url
    ? (() => { try { return new URL(url).hostname; } catch { return ""; } })()
    : "";
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

  if (faviconUrl) {
    return (
      <div className="w-11 h-11 rounded-xl border border-border bg-muted/50 flex items-center justify-center overflow-hidden ring-1 ring-black/5 dark:ring-white/5 shrink-0">
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      </div>
    );
  }

  return (
    <div className="w-11 h-11 rounded-xl border border-border bg-muted/50 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/5 shrink-0">
      <Globe className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

export default function LinkDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [link, setLink] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    async function load() {
      const [linkData, clickData, domainData, campaignData] = await Promise.all([
        db.entities.ShortLink.list(),
        db.entities.ClickLog.filter({ link_id: id }, "-created_date", 500),
        db.entities.CustomDomain.list(),
        db.entities.Campaign.list(),
      ]);
      const found = linkData.find((l) => l.id === id);
      setLink(found);
      setClicks(clickData);
      setDomains(domainData);
      setCampaigns(campaignData);

      if (found?.campaign_id) {
        setCampaign(campaignData.find((c) => c.id === found.campaign_id) || null);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function reloadLink() {
    const linkData = await db.entities.ShortLink.list();
    setLink(linkData.find((l) => l.id === id));
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(getShortUrl(link.slug, link.custom_domain));
    setCopied(true);
    toast({ title: "Copied!" });
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <LinkDetailSkeleton />;
  }

  if (!link) {
    return (
      <div className="text-center py-16">
        <Link2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-lg font-medium">Link not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link may have been deleted.</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/links">← Back to links</Link>
        </Button>
      </div>
    );
  }

  const shortUrl = getShortUrl(link.slug, link.custom_domain);
  const uniqueClicks = clicks.filter((c) => c.is_unique).length;
  const conversions = clicks.filter((c) => c.is_converted).length;
  const conversionRate = clicks.length > 0 ? ((conversions / clicks.length) * 100).toFixed(1) : 0;

  const now = new Date();
  const weekStart = startOfDay(subDays(now, 6));
  const weekEnd = startOfDay(subDays(now, -1));
  const prevWeekStart = startOfDay(subDays(now, 13));
  const prevWeekEnd = weekStart;

  const thisWeekClicks = countInRange(clicks, weekStart, weekEnd);
  const lastWeekClicks = countInRange(clicks, prevWeekStart, prevWeekEnd);
  const clicksTrend = getPeriodChange(thisWeekClicks, lastWeekClicks);

  const thisWeekUnique = countInRange(clicks, weekStart, weekEnd, true);
  const lastWeekUnique = countInRange(clicks, prevWeekStart, prevWeekEnd, true);
  const uniqueTrend = getPeriodChange(thisWeekUnique, lastWeekUnique);

  const todayClicks = clicks.filter(
    (c) => new Date(c.created_date).toDateString() === now.toDateString()
  );

  const referrerItems = countByField(clicks, "referrer_source", "Direct");
  const countryItems = countByField(clicks, "country", "Unknown");

  const stats = [
    {
      icon: MousePointerClick,
      label: "Total Clicks",
      value: clicks.length.toLocaleString(),
      subtitle: `${todayClicks.length} today`,
      accent: "primary",
      ...clicksTrend,
    },
    {
      icon: Users,
      label: "Unique Visitors",
      value: uniqueClicks.toLocaleString(),
      subtitle: `${thisWeekUnique} this week`,
      accent: "success",
      ...uniqueTrend,
    },
    {
      icon: Target,
      label: "Conversions",
      value: conversions.toLocaleString(),
      subtitle: conversions > 0 ? "Tracked conversions" : "None yet",
      accent: "info",
    },
    {
      icon: Percent,
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      subtitle: clicks.length > 0 ? `${conversions} of ${clicks.length}` : "No clicks yet",
      accent: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to="/links"
          className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0 mt-0.5"
          aria-label="Back to links"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            <LinkFavicon url={link.destination_url} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {link.title || `/${link.slug}`}
              </h1>
              <a
                href={link.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5"
              >
                {link.destination_url}
              </a>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={link.status || "active"} />
                {link.is_ab_test && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-chart-5/10 text-chart-5 uppercase tracking-wider ring-1 ring-chart-5/20">
                    A/B Test
                  </span>
                )}
                {campaign && (
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary/80 px-2 py-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Megaphone className="h-2.5 w-2.5" />
                    {campaign.name}
                  </Link>
                )}
                {link.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary/80 px-2 py-0.5 rounded-md text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("rounded-2xl border p-4 sm:p-5", glassPanelStyles)}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Short Link
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="group flex items-center gap-2 text-left min-w-0"
            >
              <span className="text-base sm:text-lg font-mono font-semibold text-primary truncate">
                {shortUrl}
              </span>
              {copied ? (
                <Check className="h-4 w-4 text-success shrink-0" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </button>
            <p className="text-xs text-muted-foreground mt-1.5">
              Created {format(new Date(link.created_date), "MMM d, yyyy")}
              {link.expire_by_date && ` · Expires ${format(new Date(link.expire_by_date), "MMM d, yyyy")}`}
              {link.custom_domain && (
                <span className="inline-flex items-center gap-1 ml-1">
                  · <Globe2 className="h-3 w-3 inline" /> Custom domain
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ url: shortUrl, title: link.title || link.slug });
                } else {
                  handleCopy();
                  toast({ title: "Link copied for sharing!" });
                }
              }}
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
              <QrCode className="h-3.5 w-3.5" />
              QR
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="default" size="sm" asChild>
              <a href={link.destination_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Visit
              </a>
            </Button>
          </div>
        </div>
      </motion.div>

      {clicks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-6 sm:p-8 text-center"
        >
          <Share2 className="h-10 w-10 text-primary/40 mx-auto mb-3" />
          <p className="font-semibold">No clicks yet</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Share your short link to start tracking clicks, devices, and traffic sources.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <Button size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
              <QrCode className="h-3.5 w-3.5" />
              Show QR Code
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </div>

      {clicks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
        >
          <WeekSummary
            thisWeekClicks={thisWeekClicks}
            thisWeekUnique={thisWeekUnique}
            clicksTrend={clicksTrend}
            uniqueTrend={uniqueTrend}
            clicks={clicks}
          />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <ClicksChart clicks={clicks} />
        </div>
        <DeviceChart clicks={clicks} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <SourceBreakdown
          icon={ArrowUpRight}
          title="Referrer Sources"
          items={referrerItems}
          emptyMessage="No referrer data yet"
        />
        <SourceBreakdown
          icon={Globe2}
          title="Top Countries"
          items={countryItems.slice(0, 10)}
          emptyMessage="No location data yet"
          barClassName="bg-accent"
        />
        <LinkRecentActivity clicks={clicks} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <LinkNotificationManager linkId={link.id} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <QRDesignManager link={link} />
      </motion.div>

      {showEdit && (
        <LinkFormDialog
          link={link}
          campaigns={campaigns}
          domains={domains.filter((d) => (user?.role === "admin" || d.owner_user_id === user?.id) && d.is_active !== false)}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); reloadLink(); }}
        />
      )}

      {showQr && (
        <QRDialog
          link={link}
          onClose={() => setShowQr(false)}
        />
      )}
    </div>
  );
}
