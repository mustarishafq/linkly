import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-sm mb-4">Clicks by Hour</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" interval={3} />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(220, 9%, 46%)" />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 13%, 91%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="clicks" fill="hsl(243, 75%, 59%)" radius={[4, 4, 0, 0]} name="Total" />
            <Bar dataKey="unique" fill="hsl(172, 66%, 50%)" radius={[4, 4, 0, 0]} name="Unique" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}