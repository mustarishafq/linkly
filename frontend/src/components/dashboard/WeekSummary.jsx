import { format, subDays, startOfDay } from "date-fns";
import { CalendarDays, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardWidget from "./DashboardWidget";

function TrendBadge({ trend }) {
  if (!trend) return null;

  const Icon =
    trend.changeType === "up"
      ? TrendingUp
      : trend.changeType === "down"
        ? TrendingDown
        : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums",
        trend.changeType === "up" && "text-success",
        trend.changeType === "down" && "text-destructive",
        trend.changeType === "neutral" && "text-muted-foreground"
      )}
    >
      <Icon className="h-3 w-3" />
      {trend.changeType === "up" ? "+" : trend.changeType === "down" ? "-" : ""}
      {trend.change}%
    </span>
  );
}

export default function WeekSummary({
  thisWeekClicks,
  thisWeekUnique,
  clicksTrend,
  uniqueTrend,
  clicks,
}) {
  const weekStart = startOfDay(subDays(new Date(), 6));

  const dailyCounts = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    return clicks.filter(
      (c) => startOfDay(new Date(c.created_date)).getTime() === date.getTime()
    ).length;
  });

  const bestDayIndex = dailyCounts.indexOf(Math.max(...dailyCounts));
  const bestDayCount = dailyCounts[bestDayIndex];
  const bestDayLabel =
    bestDayCount > 0
      ? format(startOfDay(subDays(new Date(), 6 - bestDayIndex)), "EEE")
      : "—";

  const avgPerDay = Math.round(thisWeekClicks / 7);

  const metrics = [
    {
      label: "Total Clicks",
      value: thisWeekClicks.toLocaleString(),
      trend: clicksTrend,
    },
    {
      label: "Unique Visitors",
      value: thisWeekUnique.toLocaleString(),
      trend: uniqueTrend,
    },
    {
      label: "Daily Average",
      value: avgPerDay.toLocaleString(),
    },
    {
      label: "Best Day",
      value: bestDayLabel,
      sub: bestDayCount > 0 ? `${bestDayCount} clicks` : null,
    },
  ];

  return (
    <DashboardWidget
      icon={CalendarDays}
      title="This Week at a Glance"
      action={
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {format(weekStart, "MMM d")} – {format(new Date(), "MMM d")}
        </span>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
          >
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight tabular-nums">
                {metric.value}
              </p>
              {metric.trend && <TrendBadge trend={metric.trend} />}
            </div>
            {metric.sub && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{metric.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-end gap-1.5 h-12">
        {dailyCounts.map((count, i) => {
          const max = Math.max(...dailyCounts, 1);
          const height = count > 0 ? Math.max(12, (count / max) * 100) : 4;
          const date = startOfDay(subDays(new Date(), 6 - i));
          const isToday = i === 6;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-full rounded-md transition-all duration-500",
                  isToday ? "bg-primary" : "bg-primary/40",
                  count === 0 && "bg-muted"
                )}
                style={{ height: `${height}%` }}
                title={`${format(date, "EEE")}: ${count} clicks`}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {format(date, "EEE").charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </DashboardWidget>
  );
}
