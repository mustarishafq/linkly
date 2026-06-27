import { X } from "lucide-react";
import CollapsibleFilters from "@/components/ui/collapsible-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_FILTERS = {
  campaign: "",
  tag: "",
  device: "",
  country: "",
  dateFrom: "",
  dateTo: "",
};

export default function AnalyticsFilters({
  filters,
  onChange,
  campaigns = [],
  tags = [],
  devices = [],
  countries = [],
}) {
  const activeCount = Object.values(filters).filter(Boolean).length;
  const hasFilters = activeCount > 0;

  function update(key, value) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange(EMPTY_FILTERS);
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm">
      <CollapsibleFilters
        className="rounded-2xl"
        headerClassName="p-4 sm:p-5 pb-3"
        contentClassName="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4"
        badge={
          hasFilters ? (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/15">
              {activeCount} active
            </span>
          ) : null
        }
      >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date-from" className="text-xs text-muted-foreground">
                  From
                </Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => update("dateFrom", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date-to" className="text-xs text-muted-foreground">
                  To
                </Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => update("dateTo", e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Campaign</Label>
                <Select
                  value={filters.campaign || "all"}
                  onValueChange={(v) => update("campaign", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All campaigns</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tag</Label>
                  <Select
                    value={filters.tag || "all"}
                    onValueChange={(v) => update("tag", v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tags</SelectItem>
                      {tags.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Device</Label>
                <Select
                  value={filters.device || "all"}
                  onValueChange={(v) => update("device", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All devices</SelectItem>
                    {devices.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {countries.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Select
                    value={filters.country || "all"}
                    onValueChange={(v) => update("country", v === "all" ? "" : v)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All countries</SelectItem>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {filters.dateFrom && (
                  <FilterChip
                    label={`From ${filters.dateFrom}`}
                    onRemove={() => update("dateFrom", "")}
                  />
                )}
                {filters.dateTo && (
                  <FilterChip
                    label={`To ${filters.dateTo}`}
                    onRemove={() => update("dateTo", "")}
                  />
                )}
                {filters.campaign && (
                  <FilterChip
                    label={campaigns.find((c) => c.id === filters.campaign)?.name || "Campaign"}
                    onRemove={() => update("campaign", "")}
                  />
                )}
                {filters.tag && (
                  <FilterChip label={filters.tag} onRemove={() => update("tag", "")} />
                )}
                {filters.device && (
                  <FilterChip label={filters.device} onRemove={() => update("device", "")} />
                )}
                {filters.country && (
                  <FilterChip label={filters.country} onRemove={() => update("country", "")} />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAll}
                >
                  Clear all
                </Button>
              </div>
            )}
      </CollapsibleFilters>
    </div>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground ring-1 ring-border/60">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-background/80 transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </span>
  );
}

export { EMPTY_FILTERS };
