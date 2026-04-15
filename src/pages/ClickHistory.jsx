import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { Search, Download, ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const PAGE_SIZE = 20;

export default function ClickHistory() {
  const [clicks, setClicks] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function load() {
      const [c, l] = await Promise.all([
        db.entities.ClickLog.list("-created_date", 1000),
        db.entities.ShortLink.list("-created_date", 200),
      ]);
      setClicks(c);
      setLinks(l);
      setLoading(false);
    }
    load();
  }, []);

  const linkMap = {};
  links.forEach((l) => (linkMap[l.id] = l));

  const filtered = clicks.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.slug?.toLowerCase().includes(s) ||
      c.country?.toLowerCase().includes(s) ||
      c.browser?.toLowerCase().includes(s) ||
      c.platform?.toLowerCase().includes(s) ||
      c.referrer_source?.toLowerCase().includes(s) ||
      c.ip_address?.includes(s)
    );
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  async function markConverted(clickId) {
    await db.entities.ClickLog.update(clickId, { is_converted: true });
    setClicks((prev) =>
      prev.map((c) => (c.id === clickId ? { ...c, is_converted: true } : c))
    );
    toast({ title: "Marked as converted" });
  }

  function exportCSV() {
    const headers = ["Date", "Slug", "IP", "Country", "Browser", "Platform", "Device", "Referrer", "Converted"];
    const rows = filtered.map((c) => [
      format(new Date(c.created_date), "yyyy-MM-dd HH:mm:ss"),
      c.slug,
      c.ip_address || "",
      c.country || "",
      `${c.browser || ""} ${c.browser_version || ""}`.trim(),
      c.platform || "",
      c.device_type || "",
      c.referrer_source || "",
      c.is_converted ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `click-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "CSV downloaded" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Click History</h1>
          <p className="text-muted-foreground mt-1">{clicks.length} total clicks logged</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by slug, country, browser, IP..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Link</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Country</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Browser</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Platform</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Referrer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((click) => (
                <tr key={click.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {format(new Date(click.created_date), "MMM dd, HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-primary">/{click.slug}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{click.ip_address || "—"}</td>
                  <td className="px-4 py-3 text-xs">{click.country || "—"}</td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {click.browser || "—"} {click.browser_version}
                  </td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">{click.platform || "—"}</td>
                  <td className="px-4 py-3 text-xs hidden md:table-cell">{click.referrer_source || "Direct"}</td>
                  <td className="px-4 py-3">
                    {click.is_converted ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <button
                        onClick={() => markConverted(click.id)}
                        className="text-[10px] px-2 py-1 rounded border border-border hover:bg-secondary transition-colors"
                      >
                        Mark
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No clicks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-border hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}