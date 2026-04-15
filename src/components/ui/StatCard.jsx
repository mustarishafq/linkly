import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, change, changeType, className }) {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-5 transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
        </div>
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded",
              changeType === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
            )}
          >
            {changeType === "up" ? "+" : ""}{change}%
          </span>
          <span className="text-xs text-muted-foreground">vs last period</span>
        </div>
      )}
    </div>
  );
}