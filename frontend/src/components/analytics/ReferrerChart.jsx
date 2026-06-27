import { PieChart, Pie, Cell, Label } from "recharts";
import { Share2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DashboardWidget from "@/components/dashboard/DashboardWidget";

const REFERRER_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
];

export default function ReferrerChart({ clicks }) {
  const referrerCounts = {};
  clicks.forEach((c) => {
    const src = c.referrer_source || "Direct";
    referrerCounts[src] = (referrerCounts[src] || 0) + 1;
  });

  const data = Object.entries(referrerCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);
  const hasData = data.length > 0;

  const chartConfig = data.reduce((acc, d, i) => {
    acc[d.name] = {
      label: d.name,
      color: REFERRER_COLORS[i % REFERRER_COLORS.length],
    };
    return acc;
  }, {});

  return (
    <DashboardWidget icon={Share2} title="Referrer Sources">
      {hasData ? (
        <>
          <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={REFERRER_COLORS[i % REFERRER_COLORS.length]}
                  />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {data.length}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-muted-foreground text-xs"
                          >
                            sources
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-3">
            {data.slice(0, 6).map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs max-w-[140px]">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: REFERRER_COLORS[i % REFERRER_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate">{d.name}</span>
                <span className="font-medium tabular-nums shrink-0">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Share2 className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No referrer data yet</p>
        </div>
      )}
    </DashboardWidget>
  );
}
