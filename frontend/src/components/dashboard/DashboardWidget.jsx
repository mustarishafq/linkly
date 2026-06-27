import { cn } from "@/lib/utils";

export default function DashboardWidget({
  icon: Icon,
  title,
  action,
  children,
  className,
  bodyClassName,
  noPadding,
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border overflow-hidden shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
          {title}
        </h3>
        {action}
      </div>
      <div className={cn(!noPadding && "px-5 pb-5", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
