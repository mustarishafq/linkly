import { PieChart, Pie, Cell, Label } from "recharts";
import { Monitor } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import DashboardWidget from "./DashboardWidget";

const DEVICE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
];

export default function DeviceChart({ clicks }) {
  const deviceData = ["Desktop", "Mobile", "Tablet"]
    .map((type) => ({
      name: type,
      value: clicks.filter((c) => c.device_type === type).length,
    }))
    .filter((d) => d.value > 0);

  const total = deviceData.reduce((sum, d) => sum + d.value, 0);
  const hasData = deviceData.length > 0;

  const chartConfig = deviceData.reduce((acc, d, i) => {
    acc[d.name] = {
      label: d.name,
      color: DEVICE_COLORS[i % DEVICE_COLORS.length],
    };
    return acc;
  }, {});

  return (
    <DashboardWidget icon={Monitor} title="Device Breakdown">
      {hasData ? (
        <>
          <ChartContainer config={chartConfig} className="mx-auto h-[200px] w-full aspect-auto">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={deviceData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {deviceData.map((entry, i) => (
                  <Cell key={entry.name} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
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
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 18}
                            className="fill-muted-foreground text-xs"
                          >
                            clicks
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
            {deviceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium tabular-nums">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Monitor className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No device data yet</p>
        </div>
      )}
    </DashboardWidget>
  );
}
