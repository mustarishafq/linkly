import db from "@/api/openClient";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Copy,
  QrCode,
  ExternalLink,
  PlayCircle,
  MousePointerClick,
  Users,
  Target,
  Share2,
  Link2,
  Tag,
  Megaphone,
  Percent,
  Edit,
  Check,
  ArrowUpRight,
  Globe2,
  ChevronDown,
  FlaskConical,
  Trophy,
  Palette,
} from "lucide-react";
import { getShortUrl } from "@/lib/qrcode";
import { getTestLinkUrl, filterOfficialClicks } from "@/lib/linkPreview";
import { toast } from "@/components/ui/use-toast";
import { format, subDays, startOfDay, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { useGoBack } from "@/hooks/useGoBack";
import BackButton from "@/components/ui/BackButton";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import WeekSummary from "@/components/dashboard/WeekSummary";
import SourceBreakdown from "@/components/dashboard/SourceBreakdown";
import LinkRecentActivity from "@/components/dashboard/LinkRecentActivity";
import QRDesignDialog from "@/components/qr/QRDesignDialog";
import LinkFormDialog from "@/components/links/LinkFormDialog";
import LinkFavicon from "@/components/links/LinkFavicon";
import LinkNotificationManager from "@/components/links/LinkNotificationManager";
import QRDialog from "@/components/links/QRDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/AuthContext";
import { glassPanelStyles } from "@/components/layout/glassStyles";

const VARIANT_COLORS = [
  { bar: "bg-primary", badge: "bg-primary/10 text-primary ring-1 ring-primary/20", dot: "bg-primary" },
  { bar: "bg-info", badge: "bg-info/10 text-info ring-1 ring-info/20", dot: "bg-info" },
  { bar: "bg-warning", badge: "bg-warning/10 text-warning ring-1 ring-warning/20", dot: "bg-warning" },
  { bar: "bg-success", badge: "bg-success/10 text-success ring-1 ring-success/20", dot: "bg-success" },
];

function getBestVariant(variants, clicks) {
  if (!variants.length) return null;
  return variants.reduce((best, variant) => {
    const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
    const variantConversions = clicks.filter(
      (c) => c.ab_variant === variant.name && c.is_converted
    ).length;
    const convRate = variantClicks > 0 ? variantConversions / variantClicks : 0;
    const bestClicks = clicks.filter((c) => c.ab_variant === best?.name).length;
    const bestConversions = clicks.filter(
      (c) => c.ab_variant === best?.name && c.is_converted
    ).length;
    const bestConvRate = bestClicks > 0 ? bestConversions / bestClicks : 0;
    return convRate > bestConvRate ? variant : best;
  }, variants[0]);
}

function ABVariantBreakdown({ variants, clicks }) {
  const totalClicks = clicks.length;
  const bestVariant = getBestVariant(variants, clicks);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border p-4 sm:p-5", glassPanelStyles)}
    >
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="h-4 w-4 text-chart-5" />
        <h2 className="text-sm font-semibold">A/B Test Variants</h2>
        <span className="text-xs text-muted-foreground">
          {variants.length} destinations
        </span>
      </div>

      {totalClicks > 0 && (
        <div className="mb-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-muted ring-1 ring-border/60">
            {variants.map((variant, idx) => {
              const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
              const pct = (variantClicks / totalClicks) * 100;
              const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
              if (pct <= 0) return null;
              return (
                <div
                  key={variant.id}
                  className={cn("h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full", color.bar)}
                  style={{ width: `${pct}%` }}
                  title={`${variant.name}: ${pct.toFixed(0)}%`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {variants.map((variant, idx) => {
              const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
              return (
                <span key={variant.id} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", color.dot)} />
                  {variant.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {variants.map((variant, idx) => {
          const variantClicks = clicks.filter((c) => c.ab_variant === variant.name).length;
          const variantConversions = clicks.filter(
            (c) => c.ab_variant === variant.name && c.is_converted
          ).length;
          const variantConvRate =
            variantClicks > 0 ? ((variantConversions / variantClicks) * 100).toFixed(1) : "0.0";
          const sharePercent =
            totalClicks > 0 ? ((variantClicks / totalClicks) * 100).toFixed(0) : 0;
          const color = VARIANT_COLORS[idx % VARIANT_COLORS.length];
          const isLeader = variant.id === bestVariant?.id && variantClicks > 0;

          return (
            <div
              key={variant.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                isLeader
                  ? "border-primary/30 bg-primary/[0.04] ring-1 ring-primary/10"
                  : "border-border/80 bg-secondary/20"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0", color.badge)}>
                    {variant.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{variant.weight}% traffic</span>
                  {isLeader && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md ring-1 ring-warning/20">
                      <Trophy className="h-2.5 w-2.5" /> Leader
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      parseFloat(variantConvRate) > 0 ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {variantConvRate}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">CVR</p>
                </div>
              </div>

              <a
                href={variant.destination_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate mb-2 group/url"
              >
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60 group-hover/url:opacity-100 transition-opacity" />
                <span className="truncate">{variant.destination_url}</span>
              </a>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-background overflow-hidden ring-1 ring-border/60">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", color.bar)}
                    style={{
                      width: totalClicks > 0 ? `${(variantClicks / totalClicks) * 100}%` : "0%",
                    }}
                  />
                </div>
                <span className="text-[10px] font-medium tabular-nums text-muted-foreground shrink-0">
                  {sharePercent}% · {variantClicks}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

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

export default function LinkDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const goBack = useGoBack("/links");
  const [link, setLink] = useState(null);
  const [variants, setVariants] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showQrDesigns, setShowQrDesigns] = useState(false);

  useEffect(() => {
    async function load() {
      const linkId = Number(id);
      const [found, clickData, domainData, campaignData] = await Promise.all([
        db.entities.ShortLink.get(id),
        db.entities.ClickLog.filter({ link_id: linkId }, "-created_date", 500),
        db.entities.CustomDomain.list(),
        db.entities.Campaign.list(),
      ]);
      setLink(found);
      setClicks(clickData);

      if (found?.is_ab_test) {
        const variantData = await db.entities.ABVariant.filter({ link_id: linkId });
        setVariants(variantData);
      } else {
        setVariants([]);
      }
      setDomains(domainData);
      setCampaigns(campaignData);

      if (found?.campaign_id) {
        setCampaign(campaignData.find((c) => String(c.id) === String(found.campaign_id)) || null);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function reloadLink() {
    const found = await db.entities.ShortLink.get(id);
    setLink(found);
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
        <Button variant="link" className="mt-4" onClick={goBack}>
          ← Back to links
        </Button>
      </div>
    );
  }

  const shortUrl = getShortUrl(link.slug, link.custom_domain);
  const testLinkUrl = getTestLinkUrl(link.slug, link.custom_domain);
  const officialClicks = filterOfficialClicks(clicks);
  const uniqueClicks = officialClicks.filter((c) => c.is_unique).length;
  const conversions = officialClicks.filter((c) => c.is_converted).length;
  const conversionRate = officialClicks.length > 0 ? ((conversions / officialClicks.length) * 100).toFixed(1) : 0;

  const now = new Date();
  const weekStart = startOfDay(subDays(now, 6));
  const weekEnd = startOfDay(subDays(now, -1));
  const prevWeekStart = startOfDay(subDays(now, 13));
  const prevWeekEnd = weekStart;

  const thisWeekClicks = countInRange(officialClicks, weekStart, weekEnd);
  const lastWeekClicks = countInRange(officialClicks, prevWeekStart, prevWeekEnd);
  const clicksTrend = getPeriodChange(thisWeekClicks, lastWeekClicks);

  const thisWeekUnique = countInRange(officialClicks, weekStart, weekEnd, true);
  const lastWeekUnique = countInRange(officialClicks, prevWeekStart, prevWeekEnd, true);
  const uniqueTrend = getPeriodChange(thisWeekUnique, lastWeekUnique);

  const todayClicks = officialClicks.filter(
    (c) => new Date(c.created_date).toDateString() === now.toDateString()
  );

  const referrerItems = countByField(officialClicks, "referrer_source", "Direct");
  const countryItems = countByField(officialClicks, "country", "Unknown");

  const stats = [
    {
      icon: MousePointerClick,
      label: "Total Clicks",
      value: officialClicks.length.toLocaleString(),
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
      subtitle: officialClicks.length > 0 ? `${conversions} of ${officialClicks.length}` : "No clicks yet",
      accent: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackButton
          fallback="/links"
          className="mt-0.5"
          label="Back to links"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3">
            {link.is_ab_test ? (
              <div className="w-11 h-11 rounded-xl bg-chart-5/10 flex items-center justify-center shrink-0 ring-1 ring-chart-5/20">
                <FlaskConical className="h-4 w-4 text-chart-5" />
              </div>
            ) : (
              <LinkFavicon url={link.destination_url} size="md" />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {link.title || `/${link.slug}`}
              </h1>
              {link.is_ab_test && variants.length > 0 ? (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {variants.length} destinations · traffic split across variants
                </p>
              ) : (
                <a
                  href={link.destination_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors truncate block mt-0.5"
                >
                  {link.destination_url}
                </a>
              )}
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
          <div className="grid grid-cols-3 gap-1.5 w-full sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full px-0 sm:w-auto sm:px-3"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy link"}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full px-0 sm:w-auto sm:px-3"
              aria-label="Share link"
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
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full px-0 sm:w-auto sm:px-3"
              onClick={() => setShowQr(true)}
              aria-label="Show QR code"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">QR</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full px-0 sm:w-auto sm:px-3"
              onClick={() => setShowQrDesigns(true)}
              aria-label="Manage QR designs"
            >
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Designs</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full px-0 sm:w-auto sm:px-3"
              onClick={() => setShowEdit(true)}
              aria-label="Edit link"
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="w-full px-0 sm:w-auto sm:px-3" aria-label="Visit options">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Visit</span>
                  <ChevronDown className="h-3 w-3 opacity-70 sm:h-3.5 sm:w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild className="items-start py-2">
                  <a href={testLinkUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex flex-col items-start gap-0.5">
                      <span>Test short link</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Full redirect path, not tracked
                      </span>
                    </span>
                  </a>
                </DropdownMenuItem>
                {link.is_ab_test && variants.length > 0 ? (
                  variants.map((variant) => (
                    <DropdownMenuItem key={variant.id} asChild className="items-start py-2">
                      <a href={variant.destination_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex flex-col items-start gap-0.5 min-w-0">
                          <span>Open {variant.name}</span>
                          <span className="text-[11px] font-normal text-muted-foreground truncate max-w-full">
                            {variant.destination_url}
                          </span>
                        </span>
                      </a>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem asChild className="items-start py-2">
                    <a href={link.destination_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex flex-col items-start gap-0.5">
                        <span>Open destination</span>
                        <span className="text-[11px] font-normal text-muted-foreground">
                          Final URL only, not tracked
                        </span>
                      </span>
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopy} className="items-start py-2">
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex flex-col items-start gap-0.5">
                    <span>Copy short link</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      For sharing — clicks are tracked
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>

      {link.is_ab_test && variants.length > 0 && (
        <ABVariantBreakdown variants={variants} clicks={officialClicks} />
      )}

      {officialClicks.length === 0 && (
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

      {officialClicks.length > 0 && (
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
            clicks={officialClicks}
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
          <ClicksChart clicks={officialClicks} />
        </div>
        <DeviceChart clicks={officialClicks} />
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

      {showQrDesigns && (
        <QRDesignDialog
          link={link}
          onClose={() => setShowQrDesigns(false)}
        />
      )}
    </div>
  );
}
