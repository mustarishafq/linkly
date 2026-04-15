import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/lib/AuthContext";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden md:block shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>
      <div className="md:hidden">
        <MobileNav />
      </div>
      <main className="flex-1 min-w-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="mb-4 flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <button
              onClick={() => logout(true)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
            >
              Logout
            </button>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}