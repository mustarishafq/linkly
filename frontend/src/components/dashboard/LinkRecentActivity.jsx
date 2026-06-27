import { format, formatDistanceToNow } from "date-fns";
import { Activity, Globe, Smartphone, Monitor } from "lucide-react";
import DashboardWidget from "./DashboardWidget";

const deviceIcons = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Globe,
};

export default function LinkRecentActivity({ clicks }) {
  const recent = clicks.slice(0, 8);

  return (
    <DashboardWidget icon={Activity} title="Recent Clicks">
      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No clicks yet</p>
        </div>
      ) : (
        <div className="relative">
          <div
            className="absolute left-[15px] top-3 bottom-3 w-px bg-border"
            aria-hidden
          />
          <div className="space-y-1">
            {recent.map((click) => {
              const DeviceIcon = deviceIcons[click.device_type] || Globe;
              const clickDate = new Date(click.created_date);
              const isToday =
                clickDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={click.id}
                  className="flex items-start gap-3 py-2.5 px-1 rounded-lg hover:bg-secondary/40 transition-colors"
                >
                  <div className="relative z-10 h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                    <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-xs font-medium truncate">
                      {click.referrer_source || "Direct"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {click.country || "Unknown"} · {click.browser || "Unknown"}
                      {click.is_unique && " · Unique"}
                    </p>
                  </div>
                  <div className="text-right shrink-0 pt-0.5">
                    <span className="text-[11px] font-medium text-foreground tabular-nums">
                      {format(clickDate, "HH:mm")}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {isToday
                        ? formatDistanceToNow(clickDate, { addSuffix: true })
                        : format(clickDate, "MMM d")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardWidget>
  );
}
