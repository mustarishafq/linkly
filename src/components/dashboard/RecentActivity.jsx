import { format } from "date-fns";
import { Globe, Smartphone, Monitor } from "lucide-react";

const deviceIcons = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Globe,
};

export default function RecentActivity({ clicks, links }) {
  const recent = clicks.slice(0, 8);
  const linkMap = {};
  links.forEach((l) => (linkMap[l.id] = l));

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Recent Clicks</h3>
      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No clicks yet</p>
      ) : (
        <div className="space-y-3">
          {recent.map((click) => {
            const DeviceIcon = deviceIcons[click.device_type] || Globe;
            const link = linkMap[click.link_id];
            return (
              <div key={click.id} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">/{click.slug || link?.slug}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {click.country || "Unknown"} · {click.browser || "Unknown"}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(click.created_date), "HH:mm")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}