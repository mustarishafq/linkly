import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

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

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Clicks (Last 7 Days)</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={last7Days}>
            <defs>
              <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              stroke="hsl(243, 75%, 59%)"
              fill="url(#clickGrad)"
              strokeWidth={2}
              name="Total Clicks"
            />
            <Area
              type="monotone"
              dataKey="unique"
              stroke="hsl(172, 66%, 50%)"
              fill="url(#uniqueGrad)"
              strokeWidth={2}
              name="Unique Visitors"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}