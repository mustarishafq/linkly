import { Zap } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { APP_NAME } from "@/lib/settingsConfig";

export function AuthBrandPanel({ title, description, children, chips = [] }) {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-[hsl(206,92%,15%)]">
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(206,92%,25%)] via-[hsl(206,92%,20%)] to-[hsl(206,92%,10%)]" />
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full border border-white/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/5" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">{APP_NAME}</span>
      </div>

      <div className="relative z-10 space-y-6 max-w-md">
        <h2 className="text-4xl font-bold text-white leading-tight">{title}</h2>
        <p className="text-white/60 text-lg leading-relaxed">{description}</p>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {chips.map((chip) => (
              <span
                key={chip}
                className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-medium ring-1 ring-white/10"
              >
                {chip}
              </span>
            ))}
          </div>
        )}
        {children}
      </div>

      <p className="relative z-10 text-white/50 text-sm">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
    </div>
  );
}

export function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex relative">
      <div className="absolute top-4 right-4 z-20 lg:top-6 lg:right-6">
        <ThemeToggle auth />
      </div>

      {/* Mobile gradient background */}
      <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-[hsl(206,92%,25%)] via-[hsl(206,92%,20%)] to-[hsl(206,92%,10%)]" />

      {children}

      <p className="lg:hidden absolute bottom-6 left-0 right-0 text-center text-white/50 text-xs z-10 pointer-events-none">
        © {new Date().getFullYear()} {APP_NAME}
      </p>
    </div>
  );
}

export function AuthFormPanel({ children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative z-10 lg:bg-background">
      <div className="w-full max-w-sm">
        <div className="lg:hidden mb-6 flex justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
        </div>
        <div className="bg-card rounded-3xl p-8 shadow-2xl space-y-6 lg:bg-transparent lg:rounded-none lg:p-0 lg:shadow-none lg:space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export const authInputClass =
  "h-12 lg:h-11 bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary";

export const authSubmitClass =
  "w-full h-12 lg:h-11 font-semibold text-base lg:text-sm shadow-md shadow-primary/20 hover:shadow-primary/30";
