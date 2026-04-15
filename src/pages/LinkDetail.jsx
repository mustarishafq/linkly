import db from "@/api/openClient";

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

import {
  ArrowLeft,
  Copy,
  QrCode,
  ExternalLink,
  MousePointerClick,
  Users,
  Target,
  Share2,
} from "lucide-react";
import { getShortUrl } from "@/lib/qrcode";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import StatCard from "@/components/ui/StatCard";
import ClicksChart from "@/components/dashboard/ClicksChart";
import DeviceChart from "@/components/dashboard/DeviceChart";
import QRDesignManager from "@/components/qr/QRDesignManager";

export default function LinkDetail() {
  const { id } = useParams();
  const [link, setLink] = useState(null);
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [linkData, clickData] = await Promise.all([
        db.entities.ShortLink.list(),
        db.entities.ClickLog.filter({ link_id: id }, "-created_date", 500),
      ]);
      setLink(linkData.find((l) => l.id === id));
      setClicks(clickData);
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

  if (!link) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-medium">Link not found</p>
        <Link to="/links" className="text-primary text-sm mt-2 inline-block">← Back to links</Link>
      </div>
    );
  }

  const shortUrl = getShortUrl(link.slug, link.custom_domain);
  const uniqueClicks = clicks.filter((c) => c.is_unique).length;
  const conversions = clicks.filter((c) => c.is_converted).length;
  const conversionRate = clicks.length > 0 ? ((conversions / clicks.length) * 100).toFixed(1) : 0;

  const referrerCounts = {};
  clicks.forEach((c) => {
    const src = c.referrer_source || "Direct";
    referrerCounts[src] = (referrerCounts[src] || 0) + 1;
  });

  const countryCounts = {};
  clicks.forEach((c) => {
    const country = c.country || "Unknown";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/links" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{link.title || `/${link.slug}`}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{link.destination_url}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-mono text-primary">{shortUrl}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Created {format(new Date(link.created_date), "MMM dd, yyyy")}
            {link.expire_by_date && ` · Expires ${format(new Date(link.expire_by_date), "MMM dd, yyyy")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shortUrl);
              toast({ title: "Copied!" });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ url: shortUrl, title: link.title || link.slug });
              } else {
                navigator.clipboard.writeText(shortUrl);
                toast({ title: "Link copied for sharing!" });
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            <Share2 className="h-3 w-3" /> Share
          </button>
          <a
            href={link.destination_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
          >
            <ExternalLink className="h-3 w-3" /> Visit
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MousePointerClick} label="Total Clicks" value={clicks.length} />
        <StatCard icon={Users} label="Unique Visitors" value={uniqueClicks} />
        <StatCard icon={Target} label="Conversions" value={conversions} />
        <StatCard icon={Target} label="Conversion Rate" value={`${conversionRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ClicksChart clicks={clicks} />
        </div>
        <DeviceChart clicks={clicks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Referrer Sources</h3>
          <div className="space-y-2">
            {Object.entries(referrerCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => (
                <div key={src} className="flex items-center justify-between">
                  <span className="text-sm">{src}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / clicks.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {Object.keys(referrerCounts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-sm mb-4">Top Countries</h3>
          <div className="space-y-2">
            {Object.entries(countryCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([country, count]) => (
                <div key={country} className="flex items-center justify-between">
                  <span className="text-sm">{country}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(count / clicks.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            {Object.keys(countryCounts).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>

      <QRDesignManager link={link} />
    </div>
  );
}