import { Globe } from "lucide-react";
import DashboardWidget from "@/components/dashboard/DashboardWidget";

export default function CountryList({ clicks }) {
  const countryCounts = {};
  clicks.forEach((c) => {
    const country = c.country || "Unknown";
    countryCounts[country] = (countryCounts[country] || 0) + 1;
  });

  const sorted = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  const hasData = sorted.length > 0;

  return (
    <DashboardWidget
      icon={Globe}
      title="Country Distribution"
      action={
        hasData ? (
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {sorted.length} {sorted.length === 1 ? "country" : "countries"}
          </span>
        ) : null
      }
    >
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Globe className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No geographic data yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.slice(0, 15).map(([country, count], i) => {
            const pct = Math.round((count / total) * 100);
            const barWidth = (count / max) * 100;
            return (
              <div key={country} className="group">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground/60 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium truncate">{country}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                    <span className="text-xs font-mono font-medium tabular-nums w-10 text-right">
                      {count}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 group-hover:bg-primary/80"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardWidget>
  );
}
