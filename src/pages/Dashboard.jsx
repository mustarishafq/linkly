import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Link2, MousePointerClick, Users, TrendingUp, ArrowUpRight } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import TopLinksTable from "@/components/dashboard/TopLinksTable";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { Link } from "react-router-dom";

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalClicks = clicks.length;
  const uniqueVisitors = clicks.filter((c) => c.is_unique).length;
  const todayClicks = clicks.filter(
    (c) => new Date(c.created_date).toDateString() === new Date().toDateString()
  );
  const topLinkToday = todayClicks.length > 0
    ? links.find((l) => l.id === getMostFrequent(todayClicks.map((c) => c.link_id)))
    : null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your link performance</p>
        </div>
        <Link
          to="/links?new=true"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Create Link <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Link2} label="Total Links" value={links.length} />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={totalClicks} />
        <StatCard icon={Users} label="Unique Visitors" value={uniqueVisitors} />
        <StatCard
          icon={TrendingUp}
          label="Top Link Today"
          value={topLinkToday ? `/${topLinkToday.slug}` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart clicks={clicks} />
        </div>
        <DeviceChart clicks={clicks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopLinksTable links={links} clicks={clicks} />
        </div>
        <RecentActivity clicks={clicks} links={links} />
      </div>
    </div>
  );
}

function getMostFrequent(arr) {
  const freq = {};
  arr.forEach((v) => (freq[v] = (freq[v] || 0) + 1));
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
}