import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Link2,
  Megaphone,
  BarChart3,
  History,
  Globe,
  Shield,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Link2, label: "Links", path: "/links" },
  { icon: Megaphone, label: "Campaigns", path: "/campaigns" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: History, label: "History", path: "/history" },
  { icon: Globe, label: "Domains", path: "/domains" },
  { icon: Shield, label: "Users", path: "/users", adminOnly: true },
];

export default function MobileNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-14 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-base">Linkly</span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-2">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 top-14 bg-card z-40 p-4">
          <nav className="space-y-1">
            {navItems.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      <div className="h-14" />
    </>
  );
}