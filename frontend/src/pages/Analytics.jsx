import db from "@/api/openClient";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { subDays, startOfDay, isBefore } from "date-fns";
import {
  Link2,
  MousePointerClick,
  Users,
  TrendingUp,
  BarChart3,
  Filter,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import ReferrerChart from "@/components/analytics/ReferrerChart";
import CountryList from "@/components/analytics/CountryList";
import HourlyChart from "@/components/analytics/HourlyChart";
import AnalyticsFilters, { EMPTY_FILTERS } from "@/components/analytics/AnalyticsFilters";
import { filterOfficialClicks } from "@/lib/linkPreview";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

function getTopLink(clicks, links) {
  const freq = {};
  clicks.forEach((c) => (freq[c.link_id] = (freq[c.link_id] || 0) + 1));
  const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  const link = links.find((l) => l.id === topId);
  const count = topId ? freq[topId] : 0;
  return { link, count };
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

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-[120px] rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] sm:h-[120px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[360px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}

export default function Analytics() {
  const [links, setLinks] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    async function load() {
      const [l, c, camp] = await Promise.all([
        db.entities.ShortLink.list("-created_date", 200),
        db.entities.ClickLog.list("-created_date", 1000),
        db.entities.Campaign.list(),
      ]);
      setLinks(l);
      setClicks(c);
      setCampaigns(camp);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <AnalyticsSkeleton />;
  }

  const allTags = [...new Set(links.flatMap((l) => l.tags || []))];
  const officialClicks = filterOfficialClicks(clicks);
  const allCountries = [...new Set(officialClicks.map((c) => c.country).filter(Boolean))];
  const allDevices = [...new Set(officialClicks.map((c) => c.device_type).filter(Boolean))];

  const filteredClicks = officialClicks.filter((c) => {
    if (filters.campaign) {
      const campaignLinks = links
        .filter((l) => l.campaign_id === filters.campaign)
        .map((l) => l.id);
      if (!campaignLinks.includes(c.link_id)) return false;
    }
    if (filters.tag) {
      const taggedLinks = links
        .filter((l) => l.tags?.includes(filters.tag))
        .map((l) => l.id);
      if (!taggedLinks.includes(c.link_id)) return false;
    }
    if (filters.device && c.device_type !== filters.device) return false;
    if (filters.country && c.country !== filters.country) return false;
    if (filters.dateFrom && new Date(c.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(c.created_date) > new Date(filters.dateTo + "T23:59:59"))
      return false;
    return true;
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);
  const uniqueVisitors = filteredClicks.filter((c) => c.is_unique).length;
  const { link: topLink, count: topLinkCount } = getTopLink(filteredClicks, links);
  const activeLinks = links.filter((l) => l.is_active !== false).length;
  const uniqueRate =
    filteredClicks.length > 0
      ? Math.round((uniqueVisitors / filteredClicks.length) * 100)
      : 0;

  const now = new Date();
  const weekStart = startOfDay(subDays(now, 6));
  const weekEnd = startOfDay(subDays(now, -1));
  const prevWeekStart = startOfDay(subDays(now, 13));
  const prevWeekEnd = weekStart;

  const thisWeekClicks = countInRange(filteredClicks, weekStart, weekEnd);
  const lastWeekClicks = countInRange(filteredClicks, prevWeekStart, prevWeekEnd);
  const clicksTrend = getPeriodChange(thisWeekClicks, lastWeekClicks);

  const thisWeekUnique = countInRange(filteredClicks, weekStart, weekEnd, true);
  const lastWeekUnique = countInRange(filteredClicks, prevWeekStart, prevWeekEnd, true);
  const uniqueTrend = getPeriodChange(thisWeekUnique, lastWeekUnique);

  const stats = [
    {
      icon: Link2,
      label: "Total Links",
      value: links.length,
      subtitle: `${activeLinks} active`,
      accent: "info",
    },
    {
      icon: MousePointerClick,
      label: "Total Clicks",
      value: filteredClicks.length.toLocaleString(),
      subtitle: hasActiveFilters
        ? `${filteredClicks.length} of ${officialClicks.length} official`
        : `${thisWeekClicks} this week`,
      accent: "primary",
      ...clicksTrend,
    },
    {
      icon: Users,
      label: "Unique Visitors",
      value: uniqueVisitors.toLocaleString(),
      subtitle: `${uniqueRate}% unique rate`,
      accent: "success",
      ...uniqueTrend,
    },
    {
      icon: TrendingUp,
      label: "Top Link",
      value: topLink ? `/${topLink.slug}` : "—",
      subtitle: topLink ? `${topLinkCount.toLocaleString()} clicks` : "No clicks in range",
      accent: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description={
          hasActiveFilters
            ? `${filteredClicks.length.toLocaleString()} clicks match your filters`
            : "Deep dive into your link performance"
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.02 }}
      >
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          campaigns={campaigns}
          tags={allTags}
          devices={allDevices}
          countries={allCountries}
        />
      </motion.div>

      {hasActiveFilters && filteredClicks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center"
        >
          <Filter className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">No clicks match these filters</p>
          <p className="text-xs text-muted-foreground mt-1">
            Try adjusting your date range or clearing filters
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <ClicksChart clicks={filteredClicks} />
        </div>
        <DeviceChart clicks={filteredClicks} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <HourlyChart clicks={filteredClicks} />
        <ReferrerChart clicks={filteredClicks} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CountryList clicks={filteredClicks} />
      </motion.div>
    </div>
  );
}
