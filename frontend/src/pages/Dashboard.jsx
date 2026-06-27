import db from "@/api/openClient";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Link2,
  MousePointerClick,
  Users,
  TrendingUp,
  LayoutDashboard,
  Zap,
} from "lucide-react";
import { subDays, startOfDay, isBefore } from "date-fns";
import { filterOfficialClicks } from "@/lib/linkPreview";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import TopLinksTable from "@/components/dashboard/TopLinksTable";
import WeekSummary from "@/components/dashboard/WeekSummary";
import RecentActivity from "@/components/dashboard/RecentActivity";
import PageHeader from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

function getMostFrequent(arr) {
  const freq = {};
  arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
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

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[400px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [links, setLinks] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [linkData, clickData] = await Promise.all([
        db.entities.ShortLink.list("-created_date", 100),
        db.entities.ClickLog.list("-created_date", 500),
      ]);
      setLinks(linkData);
      setClicks(clickData);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));
  const weekEnd = startOfDay(subDays(now, -1));
  const prevWeekStart = startOfDay(subDays(now, 13));
  const prevWeekEnd = weekStart;
  const yesterdayStart = startOfDay(subDays(now, 1));

  const officialClicks = filterOfficialClicks(clicks);

  const totalClicks = officialClicks.length;
  const uniqueVisitors = officialClicks.filter((c) => c.is_unique).length;

  const thisWeekClicks = countInRange(officialClicks, weekStart, weekEnd);
  const lastWeekClicks = countInRange(officialClicks, prevWeekStart, prevWeekEnd);
  const clicksTrend = getPeriodChange(thisWeekClicks, lastWeekClicks);

  const thisWeekUnique = countInRange(officialClicks, weekStart, weekEnd, true);
  const lastWeekUnique = countInRange(officialClicks, prevWeekStart, prevWeekEnd, true);
  const uniqueTrend = getPeriodChange(thisWeekUnique, lastWeekUnique);

  const todayClicks = officialClicks.filter(
    (c) => new Date(c.created_date).toDateString() === now.toDateString()
  );
  const yesterdayClicks = officialClicks.filter((c) => {
    const d = new Date(c.created_date);
    return d >= yesterdayStart && d < todayStart;
  });
  const todayTrend = getPeriodChange(todayClicks.length, yesterdayClicks.length);

  const topLinkTodayId = todayClicks.length > 0
    ? getMostFrequent(todayClicks.map((c) => c.link_id))
    : null;
  const topLinkToday = topLinkTodayId
    ? links.find((l) => l.id === topLinkTodayId)
    : null;
  const topLinkTodayCount = topLinkTodayId
    ? todayClicks.filter((c) => c.link_id === topLinkTodayId).length
    : 0;

  const activeLinks = links.filter((l) => l.is_active !== false).length;

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
      value: totalClicks.toLocaleString(),
      subtitle: `${todayClicks.length} today`,
      accent: "primary",
      ...clicksTrend,
    },
    {
      icon: Users,
      label: "Unique Visitors",
      value: uniqueVisitors.toLocaleString(),
      subtitle: `${thisWeekUnique} this week`,
      accent: "success",
      ...uniqueTrend,
    },
    {
      icon: TrendingUp,
      label: "Top Link Today",
      value: topLinkToday ? `/${topLinkToday.slug}` : "—",
      subtitle: topLinkToday ? `${topLinkTodayCount} clicks` : "No clicks yet today",
      accent: "warning",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Overview of your link performance"
      />

      {todayClicks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/15">
            <Zap className="h-3.5 w-3.5" />
            {todayClicks.length} click{todayClicks.length !== 1 ? "s" : ""} today
          </span>
          {todayTrend && todayTrend.changeType !== "neutral" && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                todayTrend.changeType === "up"
                  ? "bg-success/10 text-success ring-success/15"
                  : "bg-destructive/10 text-destructive ring-destructive/15"
              }`}
            >
              {todayTrend.changeType === "up" ? "+" : "-"}
              {todayTrend.change}% vs yesterday
            </span>
          )}
          {topLinkToday && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              Top: <span className="font-medium text-foreground ml-1">/{topLinkToday.slug}</span>
            </span>
          )}
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
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <TopLinksTable links={links} clicks={officialClicks} />
        </div>
        <RecentActivity clicks={officialClicks} links={links} />
      </motion.div>
    </div>
  );
}
