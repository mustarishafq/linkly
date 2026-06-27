import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import MobileMoreMenu from "./MobileMoreMenu";

export default function AppLayout() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <main className="flex-1 min-w-0 pt-16 pb-[calc(5.25rem+env(safe-area-inset-bottom))]">
        <div className="max-w-[1600px] mx-auto w-full p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
      <BottomNav onOpenMore={() => setMoreOpen(true)} />
      <MobileMoreMenu open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
