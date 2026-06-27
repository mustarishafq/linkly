import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Clock } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import DashboardWidget from "@/components/dashboard/DashboardWidget";

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

export default function HourlyChart({ clicks }) {
  const hourData = Array.from({ length: 24 }, (_, hour) => {
    const hourClicks = clicks.filter(
      (c) => new Date(c.created_date).getHours() === hour
    );
    return {
      hour: `${hour.toString().padStart(2, "0")}:00`,
      clicks: hourClicks.length,
      unique: hourClicks.filter((c) => c.is_unique).length,
    };
  });

  const peakHour = hourData.reduce(
    (best, d) => (d.clicks > best.clicks ? d : best),
    hourData[0]
  );
  const hasData = clicks.length > 0;

  return (
    <DashboardWidget
      icon={Clock}
      title="Clicks by Hour"
      action={
        hasData ? (
          <span className="text-xs font-medium text-muted-foreground">
            Peak: {peakHour.hour}
          </span>
        ) : null
      }
      noPadding
      bodyClassName="px-2 pb-2 sm:px-5 sm:pb-5"
    >
      {hasData ? (
        <ChartContainer config={chartConfig} className="h-[280px] w-full aspect-auto">
          <BarChart data={hourData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={3}
            />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="clicks"
              fill="var(--color-clicks)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="unique"
              fill="var(--color-unique)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No hourly data yet</p>
        </div>
      )}
    </DashboardWidget>
  );
}
