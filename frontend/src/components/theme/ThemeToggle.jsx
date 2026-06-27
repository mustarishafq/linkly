import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ variant = "icon", className, auth = false }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = (resolvedTheme || theme) === "dark";

  if (!mounted) {
    if (variant === "switch") {
      return <Switch disabled checked={false} />;
    }
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)} disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  if (variant === "switch") {
    return (
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-9 w-9",
        auth && "text-white lg:text-foreground hover:bg-white/10 lg:hover:bg-muted",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
