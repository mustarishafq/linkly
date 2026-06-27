import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { TrendingUp } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import DashboardWidget from "./DashboardWidget";

const chartConfig = {
  clicks: {
    label: "Total Clicks",
    color: "hsl(var(--chart-1))",
  },
  unique: {
    label: "Unique Visitors",
    color: "hsl(var(--chart-2))",
  },
};

export default function ClicksChart({ clicks }) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = startOfDay(subDays(new Date(), 6 - i));
    const dayClicks = clicks.filter(
      (c) => startOfDay(new Date(c.created_date)).getTime() === date.getTime()
    );
    return {
      date: format(date, "MMM dd"),
      clicks: dayClicks.length,
      unique: dayClicks.filter((c) => c.is_unique).length,
    };
  });

  const weekTotal = last7Days.reduce((sum, d) => sum + d.clicks, 0);

  return (
    <DashboardWidget
      icon={TrendingUp}
      title="Clicks (Last 7 Days)"
      action={
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          {weekTotal.toLocaleString()} total
        </span>
      }
      noPadding
      bodyClassName="px-2 pb-2 sm:px-5 sm:pb-5"
    >
      <ChartContainer config={chartConfig} className="h-[280px] w-full aspect-auto">
        <AreaChart data={last7Days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-clicks)" stopOpacity={0.25} />
              <stop offset="95%" stopColor="var(--color-clicks)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-unique)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--color-unique)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area
            type="monotone"
            dataKey="clicks"
            stroke="var(--color-clicks)"
            fill="url(#clickGrad)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="unique"
            stroke="var(--color-unique)"
            fill="url(#uniqueGrad)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartContainer>
    </DashboardWidget>
  );
}
