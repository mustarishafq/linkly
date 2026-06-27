import db from "@/api/openClient";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import { ArrowLeft, MousePointerClick, Users, Target, Link2 } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [links, setLinks] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [allCampaigns, allLinks, allClicks] = await Promise.all([
        db.entities.Campaign.list(),
        db.entities.ShortLink.filter({ campaign_id: id }),
        db.entities.ClickLog.filter({ campaign_id: id }, "-created_date", 500),
      ]);
      setCampaign(allCampaigns.find((c) => c.id === id));
      setLinks(allLinks);
      setClicks(allClicks);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium">Campaign not found</p>
        <Link to="/campaigns" className="text-primary text-sm mt-2 inline-block">← Back</Link>
      </div>
    );
  }

  const uniqueVisitors = clicks.filter((c) => c.is_unique).length;
  const conversions = clicks.filter((c) => c.is_converted).length;
  const convRate = clicks.length > 0 ? ((conversions / clicks.length) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/campaigns" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">{campaign.name}</h1>
          {campaign.description && <p className="text-xs text-muted-foreground mt-0.5">{campaign.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Link2} label="Links" value={links.length} />
        <StatCard icon={MousePointerClick} label="Total Clicks" value={clicks.length} />
        <StatCard icon={Users} label="Unique Visitors" value={uniqueVisitors} />
        <StatCard icon={Target} label="Conv. Rate" value={`${convRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart clicks={clicks} />
        </div>
        <DeviceChart clicks={clicks} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-sm mb-4">Campaign Links</h3>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No links in this campaign</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.id}
                to={`/links/${link.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{link.title || `/${link.slug}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.destination_url}</p>
                </div>
                <span className="text-sm font-semibold">{link.total_clicks || 0} clicks</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}