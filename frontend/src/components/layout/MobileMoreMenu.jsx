import { Link, useLocation } from "react-router-dom";
import { Zap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { APP_NAME } from "@/lib/settingsConfig";
import { glassPanelStyles } from "./glassStyles";
import { buildMobileMoreItems, isNavActive } from "./navItems";

export default function MobileMoreMenu({ open, onOpenChange }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const regularItems = buildMobileMoreItems(user).filter((item) => !item.adminOnly);
  const adminItems = buildMobileMoreItems(user).filter((item) => item.adminOnly);

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "rounded-t-2xl border-t p-0 h-auto max-h-[85dvh] flex flex-col",
          glassPanelStyles
        )}
        overlayClassName="bg-black/25 backdrop-blur-sm"
        hideCloseButton
      >
        <SheetHeader className="border-b border-border/50 px-4 py-4 text-left">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">{APP_NAME}</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto p-3">
          {regularItems.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
              {regularItems.map((item) => {
                const active = isNavActive(location.pathname, item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={close}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-colors",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground hover:bg-foreground/5"
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                    <span className="text-[11px] font-medium leading-none text-center px-1">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {adminItems.length > 0 && (
            <>
              <p className="px-1 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Admin
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                {adminItems.map((item) => {
                  const active = isNavActive(location.pathname, item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={close}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-colors",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                      <span className="text-[11px] font-medium leading-none text-center px-1">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        <div className="mt-auto border-t border-border/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
            </div>
            <ThemeToggle variant="switch" />
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => {
              close();
              logout(true);
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
