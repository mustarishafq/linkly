import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Link2, MousePointerClick, Users, TrendingUp } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import ReferrerChart from "@/components/analytics/ReferrerChart";
import CountryList from "@/components/analytics/CountryList";
import HourlyChart from "@/components/analytics/HourlyChart";

export default function Analytics() {
  const [links, setLinks] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    campaign: "",
    tag: "",
    device: "",
    country: "",
    dateFrom: "",
    dateTo: "",
  });

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allTags = [...new Set(links.flatMap((l) => l.tags || []))];
  const allCountries = [...new Set(clicks.map((c) => c.country).filter(Boolean))];
  const allDevices = [...new Set(clicks.map((c) => c.device_type).filter(Boolean))];

  const filteredClicks = clicks.filter((c) => {
    if (filters.campaign) {
      const campaignLinks = links.filter((l) => l.campaign_id === filters.campaign).map((l) => l.id);
      if (!campaignLinks.includes(c.link_id)) return false;
    }
    if (filters.tag) {
      const taggedLinks = links.filter((l) => l.tags?.includes(filters.tag)).map((l) => l.id);
      if (!taggedLinks.includes(c.link_id)) return false;
    }
    if (filters.device && c.device_type !== filters.device) return false;
    if (filters.country && c.country !== filters.country) return false;
    if (filters.dateFrom && new Date(c.created_date) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(c.created_date) > new Date(filters.dateTo + "T23:59:59")) return false;
    return true;
  });

  const uniqueVisitors = filteredClicks.filter((c) => c.is_unique).length;
  const topLink = getTopLink(filteredClicks, links);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Deep dive into your link performance</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
          />
          <select
            value={filters.campaign}
            onChange={(e) => setFilters({ ...filters, campaign: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
          >
            <option value="">All Campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {allTags.length > 0 && (
            <select
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          <select
            value={filters.device}
            onChange={(e) => setFilters({ ...filters, device: e.target.value })}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
          >
            <option value="">All Devices</option>
            {allDevices.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {allCountries.length > 0 && (
            <select
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs"
            >
              <option value="">All Countries</option>
              {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {Object.values(filters).some(Boolean) && (
            <button
              onClick={() => setFilters({ campaign: "", tag: "", device: "", country: "", dateFrom: "", dateTo: "" })}
              className="px-3 py-2 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Link2} label="Total Links" value={links.length} />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={filteredClicks.length} />
        <StatCard icon={Users} label="Unique Visitors" value={uniqueVisitors} />
        <StatCard icon={TrendingUp} label="Top Link" value={topLink ? `/${topLink.slug}` : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart clicks={filteredClicks} />
        </div>
        <DeviceChart clicks={filteredClicks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HourlyChart clicks={filteredClicks} />
        <ReferrerChart clicks={filteredClicks} />
      </div>

      <CountryList clicks={filteredClicks} />
    </div>
  );
}

function getTopLink(clicks, links) {
  const freq = {};
  clicks.forEach((c) => (freq[c.link_id] = (freq[c.link_id] || 0) + 1));
  const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  return links.find((l) => l.id === topId);
}