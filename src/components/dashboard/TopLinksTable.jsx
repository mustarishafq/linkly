import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

export default function TopLinksTable({ links, clicks }) {
  const linkClickCounts = {};
  clicks.forEach((c) => {
    linkClickCounts[c.link_id] = (linkClickCounts[c.link_id] || 0) + 1;
  });

  const topLinks = [...links]
    .sort((a, b) => (linkClickCounts[b.id] || 0) - (linkClickCounts[a.id] || 0))
    .slice(0, 5);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Top Performing Links</h3>
      {topLinks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No links yet</p>
      ) : (
        <div className="space-y-3">
          {topLinks.map((link, i) => (
            <Link
              key={link.id}
              to={`/links/${link.id}`}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{link.title || `/${link.slug}`}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.destination_url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{linkClickCounts[link.id] || 0}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}