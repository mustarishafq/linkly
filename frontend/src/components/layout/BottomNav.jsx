import { Link, useLocation } from "react-router-dom";
import { Grip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { glassDockStyles } from "./glassStyles";
import AppsOrbNavItem from "./AppsOrbNavItem";
import { NavActiveIndicator } from "./NavActiveIndicator";
import {
  MOBILE_BOTTOM_NAV_ITEMS,
  buildDesktopNavItems,
  isNavActive,
  isMoreMenuActive,
} from "./navItems";

const navCellClass =
  "relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5 transition-colors";

const desktopScrollClass =
  "overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

function StandardNavItem({ item, active, mobile }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      aria-current={active ? "page" : undefined}
      className={cn(
        navCellClass,
        mobile ? "flex-1 px-1" : "min-w-[4.5rem] shrink-0 px-2",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && <NavActiveIndicator />}
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="text-[10px] font-medium leading-none">{item.label}</span>
    </Link>
  );
}

function MoreNavItem({ active, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open more menu"
      aria-expanded={active}
      className={cn(
        navCellClass,
        "flex-1 px-1",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && <NavActiveIndicator />}
      <Grip className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="text-[10px] font-medium leading-none">More</span>
    </button>
  );
}

export default function BottomNav({ onOpenMore }) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { user } = useAuth();

  const items = isMobile ? MOBILE_BOTTOM_NAV_ITEMS : buildDesktopNavItems(user);
  const moreActive = isMoreMenuActive(location.pathname);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      aria-label="Main navigation"
    >
      <div className="flex justify-center px-3 sm:px-4">
        <div
          className={cn(
            glassDockStyles,
            "relative flex items-stretch px-1 pointer-events-auto",
            isMobile
              ? "h-[4.25rem] w-full max-w-lg overflow-visible border-t-0 ring-0"
              : cn("h-16 w-fit max-w-full", desktopScrollClass)
          )}
        >
          {items.map((item) => {
            if (item.type === "apps-orb") {
              if (!isMobile) return null;
              return (
                <AppsOrbNavItem
                  key="apps-orb"
                  active={isNavActive(location.pathname, item.path)}
                  to={item.path}
                  label={item.label}
                />
              );
            }

            if (item.type === "more") {
              if (!isMobile) return null;
              return (
                <MoreNavItem
                  key="more"
                  active={moreActive}
                  onOpen={onOpenMore}
                />
              );
            }

            return (
              <StandardNavItem
                key={item.path}
                item={item}
                active={isNavActive(location.pathname, item.path)}
                mobile={isMobile}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
