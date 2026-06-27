import { Link } from "react-router-dom";
import { ArrowUpRight, Link2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardWidget from "./DashboardWidget";

const rankStyles = [
  "bg-warning/15 text-warning border-warning/20",
  "bg-muted text-muted-foreground border-border",
  "bg-warning/10 text-warning/80 border-warning/15",
];

export default function TopLinksTable({ links, clicks }) {
  const linkClickCounts = {};
  clicks.forEach((c) => {
    linkClickCounts[c.link_id] = (linkClickCounts[c.link_id] || 0) + 1;
  });

  const topLinks = [...links]
    .sort((a, b) => (linkClickCounts[b.id] || 0) - (linkClickCounts[a.id] || 0))
    .slice(0, 5);

  const maxClicks = topLinks.length > 0 ? linkClickCounts[topLinks[0].id] || 1 : 1;

  return (
    <DashboardWidget
      icon={Trophy}
      title="Top Performing Links"
      action={
        topLinks.length > 0 ? (
          <Link
            to="/analytics"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null
      }
    >
      {topLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Link2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No links yet</p>
          <Link
            to="/links?new=true"
            className="text-xs font-medium text-primary hover:underline mt-2"
          >
            Create your first link
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {topLinks.map((link, i) => {
            const count = linkClickCounts[link.id] || 0;
            const pct = Math.round((count / maxClicks) * 100);

            return (
              <Link
                key={link.id}
                to={`/links/${link.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-secondary/40 transition-all group"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold",
                    i < 3 ? rankStyles[i] : "bg-secondary text-muted-foreground border-transparent"
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium truncate">
                      {link.title || `/${link.slug}`}
                    </p>
                    <span className="text-sm font-semibold tabular-nums shrink-0">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {link.destination_url}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </DashboardWidget>
  );
}
