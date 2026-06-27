import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const accentStyles = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  change,
  changeType,
  accent = "primary",
  className,
  index = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "relative bg-card rounded-2xl border border-border p-3 sm:p-5 overflow-hidden",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 group",
        className
      )}
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider leading-tight">
            {label}
          </p>
          <p className="text-xl sm:text-3xl font-bold mt-0.5 sm:mt-1 tracking-tight truncate">{value}</p>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
              "group-hover:scale-110 transition-transform duration-300",
              accentStyles[accent] ?? accentStyles.primary
            )}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className="relative mt-2 sm:mt-3 flex flex-wrap items-center gap-1 sm:gap-1.5">
          <span
            className={cn(
              "text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded",
              changeType === "up"
                ? "bg-success/10 text-success"
                : changeType === "down"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {changeType === "up" ? "+" : changeType === "down" ? "" : ""}
            {change}%
          </span>
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">vs last 7 days</span>
        </div>
      )}
    </motion.div>
  );
}
