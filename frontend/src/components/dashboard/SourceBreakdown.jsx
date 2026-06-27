import DashboardWidget from "./DashboardWidget";

export default function SourceBreakdown({
  icon: Icon,
  title,
  items = [],
  emptyMessage = "No data yet",
  barClassName = "bg-primary",
}) {
  const max = items[0]?.count || 1;

  return (
    <DashboardWidget icon={Icon} title={title}>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Icon className="h-10 w-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map(({ label, count }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-sm w-28 sm:w-32 truncate shrink-0" title={label}>
                {label}
              </span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barClassName}`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-10 text-right font-mono tabular-nums shrink-0">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  );
}
