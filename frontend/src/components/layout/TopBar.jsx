import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import ThemeToggle from "@/components/theme/ThemeToggle";
import NotificationBell from "@/components/layout/NotificationBell";
import GlobalSearch, { GlobalSearchTrigger, useGlobalSearch } from "./GlobalSearch";
import { glassPanelStyles } from "./glassStyles";

export default function TopBar() {
  const { user, logout } = useAuth();
  const { open: searchOpen, setOpen: setSearchOpen, openSearch } = useGlobalSearch();

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 h-16 w-full flex items-center justify-between gap-3 px-4 sm:px-6 border-b transition-all duration-200 z-30",
          glassPanelStyles
        )}
      >
        <div className="min-w-0 flex-1">
          <GlobalSearchTrigger onClick={openSearch} />
        </div>

        <div className="hidden md:flex items-center gap-1 sm:gap-2 shrink-0">
          <NotificationBell />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none truncate max-w-[140px]">
                  {user?.full_name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || "user"}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5 md:hidden">
                <p className="text-sm font-medium truncate">{user?.full_name || user?.email}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="md:hidden" />
              <DropdownMenuItem
                onClick={() => logout(true)}
                className="text-destructive focus:text-destructive gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex md:hidden items-center gap-1 shrink-0">
          <NotificationBell />
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
