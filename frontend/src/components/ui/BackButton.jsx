import { ArrowLeft } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { cn } from "@/lib/utils";

export default function BackButton({
  fallback,
  className,
  label = "Go back",
  icon: Icon = ArrowLeft,
  children,
}) {
  const goBack = useGoBack(fallback);

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "p-2 rounded-lg hover:bg-secondary transition-colors shrink-0",
        className
      )}
      aria-label={label}
    >
      {children ?? <Icon className="h-4 w-4" />}
    </button>
  );
}
