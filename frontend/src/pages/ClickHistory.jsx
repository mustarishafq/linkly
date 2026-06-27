import db from "@/api/openClient";

import { useEffect, useMemo, useState } from "react";

import { motion } from "framer-motion";
import { format, formatDistanceToNow, isToday, startOfDay } from "date-fns";
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  History,
  MousePointerClick,
  TrendingUp,
  Users,
  Globe,
  Smartphone,
  Monitor,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import PageHeader from "@/components/layout/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import CollapsibleFilters from "@/components/ui/collapsible-filters";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 20;

const deviceIcons = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Globe,
};

function HistorySkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] sm:h-[100px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}

function ClickRowMeta({ click }) {
  const DeviceIcon = deviceIcons[click.device_type] || Globe;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="h-8 w-8 rounded-lg bg-secondary/60 border border-border flex items-center justify-center shrink-0">
        <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium font-mono text-primary truncate">/{click.slug}</p>
        <p className="text-xs text-muted-foreground truncate">
          {[click.country, click.browser, click.platform].filter(Boolean).join(" · ") || "Unknown"}
        </p>
      </div>
    </div>
  );
}

export default function ClickHistory() {
  const [clicks, setClicks] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [conversionFilter, setConversionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const linkMap = useMemo(() => {
    const map = {};
    links.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [links]);

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const todayClicks = clicks.filter(
      (c) => new Date(c.created_date) >= todayStart
    ).length;
    const conversions = clicks.filter((c) => c.is_converted).length;
    const uniqueVisitors = clicks.filter((c) => c.is_unique).length;

    return { total: clicks.length, todayClicks, conversions, uniqueVisitors };
  }, [clicks]);

  const allDevices = useMemo(
    () => [...new Set(clicks.map((c) => c.device_type).filter(Boolean))],
    [clicks]
  );

  const hasActiveFilters = Boolean(
    search || deviceFilter || conversionFilter || dateFrom || dateTo
  );

  const filtered = useMemo(() => {
    return clicks.filter((c) => {
      if (deviceFilter && c.device_type !== deviceFilter) return false;
      if (conversionFilter === "converted" && !c.is_converted) return false;
      if (conversionFilter === "pending" && c.is_converted) return false;
      if (dateFrom && new Date(c.created_date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(c.created_date) > new Date(`${dateTo}T23:59:59`)) return false;

      if (!search) return true;
      const s = search.toLowerCase();
      const link = linkMap[c.link_id];
      return (
        c.slug?.toLowerCase().includes(s) ||
        link?.title?.toLowerCase().includes(s) ||
        c.country?.toLowerCase().includes(s) ||
        c.browser?.toLowerCase().includes(s) ||
        c.platform?.toLowerCase().includes(s) ||
        c.referrer_source?.toLowerCase().includes(s) ||
        c.ip_address?.includes(s)
      );
    });
  }, [clicks, search, deviceFilter, conversionFilter, dateFrom, dateTo, linkMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, filtered.length);

  function resetFilters() {
    setSearch("");
    setDeviceFilter("");
    setConversionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  async function markConverted(clickId) {
    await db.entities.ClickLog.update(clickId, { is_converted: true });
    setClicks((prev) =>
      prev.map((c) => (c.id === clickId ? { ...c, is_converted: true } : c))
    );
    toast({ title: "Marked as converted" });
  }

  function exportCSV() {
    const headers = [
      "Date",
      "Slug",
      "IP",
      "Country",
      "Browser",
      "Platform",
      "Device",
      "Referrer",
      "Converted",
    ];
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
    return <HistorySkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Click History"
        description="Browse and export every click across your links"
        action={
          <Button
            variant="outline"
            className="gap-2 h-10 w-full sm:w-auto sm:h-9"
            onClick={exportCSV}
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={MousePointerClick}
          label="Total Clicks"
          value={stats.total.toLocaleString()}
          subtitle={`${filtered.length.toLocaleString()} shown`}
          accent="primary"
          index={0}
        />
        <StatCard
          icon={TrendingUp}
          label="Today"
          value={stats.todayClicks.toLocaleString()}
          subtitle="Since midnight"
          accent="info"
          index={1}
        />
        <StatCard
          icon={CheckCircle}
          label="Conversions"
          value={stats.conversions.toLocaleString()}
          subtitle={
            stats.total > 0
              ? `${Math.round((stats.conversions / stats.total) * 100)}% rate`
              : "No clicks yet"
          }
          accent="success"
          index={2}
        />
        <StatCard
          icon={Users}
          label="Unique"
          value={stats.uniqueVisitors.toLocaleString()}
          subtitle="First-time visitors"
          accent="warning"
          index={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-card rounded-2xl border border-border p-4 shadow-sm"
      >
        <CollapsibleFilters
          contentClassName="space-y-0 pt-3"
          actions={
            hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={resetFilters}
              >
                <X className="h-3 w-3" /> Clear
              </Button>
            ) : null
          }
        >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search slug, country, browser, IP..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>

          <select
            value={deviceFilter}
            onChange={(e) => {
              setDeviceFilter(e.target.value);
              setPage(0);
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All devices</option>
            {allDevices.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={conversionFilter}
            onChange={(e) => {
              setConversionFilter(e.target.value);
              setPage(0);
            }}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All conversions</option>
            <option value="converted">Converted</option>
            <option value="pending">Not converted</option>
          </select>

          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            aria-label="From date"
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            aria-label="To date"
          />
        </div>
        </CollapsibleFilters>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        {paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <History className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-sm font-medium">No clicks found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms."
                : "Clicks will appear here once your links start getting traffic."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border">
              {paged.map((click) => {
                const clickDate = new Date(click.created_date);
                const link = linkMap[click.link_id];

                return (
                  <div key={click.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <ClickRowMeta click={click} />
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium tabular-nums">
                          {format(clickDate, "MMM d, HH:mm")}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isToday(clickDate)
                            ? formatDistanceToNow(clickDate, { addSuffix: true })
                            : format(clickDate, "yyyy")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-normal">
                        {click.referrer_source || "Direct"}
                      </Badge>
                      {click.device_type && (
                        <Badge variant="outline" className="font-normal">
                          {click.device_type}
                        </Badge>
                      )}
                      {link?.title && (
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {link.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {click.ip_address && (
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          {click.ip_address}
                        </span>
                      )}
                      {click.is_converted ? (
                        <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10 shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Converted
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs shrink-0"
                          onClick={() => markConverted(click.id)}
                        >
                          Mark converted
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Date & Time</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="hidden lg:table-cell">Location</TableHead>
                    <TableHead className="hidden xl:table-cell">Browser</TableHead>
                    <TableHead className="hidden lg:table-cell">Referrer</TableHead>
                    <TableHead className="hidden xl:table-cell">IP</TableHead>
                    <TableHead className="text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((click) => {
                    const clickDate = new Date(click.created_date);
                    const link = linkMap[click.link_id];

                    return (
                      <TableRow key={click.id}>
                        <TableCell className="pl-6 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium tabular-nums">
                              {format(clickDate, "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(clickDate, "HH:mm:ss")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ClickRowMeta click={click} />
                          {link?.title && (
                            <p className="text-xs text-muted-foreground truncate max-w-[220px] mt-1 ml-10">
                              {link.title}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div>
                            <p className="text-sm">{click.country || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {click.platform || click.device_type || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div>
                            <p className="text-sm">{click.browser || "—"}</p>
                            {click.browser_version && (
                              <p className="text-xs text-muted-foreground">
                                v{click.browser_version}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="font-normal max-w-[140px] truncate">
                            {click.referrer_source || "Direct"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                          {click.ip_address || "—"}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {click.is_converted ? (
                            <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Converted
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markConverted(click.id)}
                            >
                              Mark
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 sm:px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">
                {rangeStart}–{rangeEnd}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground tabular-nums">
                {filtered.length.toLocaleString()}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums min-w-[80px] text-center">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
