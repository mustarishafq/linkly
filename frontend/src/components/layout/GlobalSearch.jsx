import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  Link2,
  Megaphone,
  LayoutDashboard,
} from "lucide-react";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGlobalSearchShortcut } from "@/hooks/useGlobalSearchShortcut";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { buildDesktopNavItems } from "./navItems";

const DEBOUNCE_MS = 250;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function isMacPlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function matchesQuery(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

export function GlobalSearchTrigger({ onClick, className }) {
  const isMobile = useIsMobile();
  const shortcutLabel = isMacPlatform() ? "⌘K" : "Ctrl+K";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open search"
      className={cn(
        "relative flex w-full items-center rounded-lg bg-muted/50 pl-9 pr-3 h-10",
        "text-sm text-left text-muted-foreground transition-colors",
        "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <span className="truncate">Search links, campaigns…</span>
      {!isMobile && (
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline-flex">
          {shortcutLabel}
        </kbd>
      )}
    </button>
  );
}

export default function GlobalSearch({ open, onOpenChange }) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ["globalSearch", "links"],
    queryFn: () => db.entities.ShortLink.list("-created_date", 500),
    enabled: open,
    staleTime: 60_000,
  });

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["globalSearch", "campaigns"],
    queryFn: () => db.entities.Campaign.list("-created_date", 200),
    enabled: open,
    staleTime: 60_000,
  });

  const navItems = useMemo(() => buildDesktopNavItems(user), [user]);

  const trimmedQuery = debouncedQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) {
      return { links: [], campaigns: [], pages: [] };
    }

    const matchedLinks = links
      .filter(
        (link) =>
          matchesQuery(link.slug, normalizedQuery) ||
          matchesQuery(link.title, normalizedQuery) ||
          matchesQuery(link.destination_url, normalizedQuery)
      )
      .slice(0, 8);

    const matchedCampaigns = campaigns
      .filter(
        (campaign) =>
          matchesQuery(campaign.name, normalizedQuery) ||
          matchesQuery(campaign.description, normalizedQuery)
      )
      .slice(0, 5);

    const matchedPages = navItems
      .filter(
        (item) =>
          matchesQuery(item.label, normalizedQuery) ||
          matchesQuery(item.path, normalizedQuery)
      )
      .slice(0, 5);

    return {
      links: matchedLinks,
      campaigns: matchedCampaigns,
      pages: matchedPages,
    };
  }, [normalizedQuery, links, campaigns, navItems]);

  const isSearching =
    trimmedQuery.length > 0 && (linksLoading || campaignsLoading);
  const hasResults =
    results.links.length + results.campaigns.length + results.pages.length > 0;

  const handleSelect = (path) => {
    onOpenChange(false);
    setQuery("");
    navigate(path);
  };

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      shouldFilter={false}
      contentClassName="w-[calc(100%-2rem)] max-w-lg rounded-xl"
    >
      <CommandInput
        placeholder="Search links, campaigns, pages…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[300px]">
        {!trimmedQuery && (
          <CommandEmpty>Type a link slug, title, or page name to search.</CommandEmpty>
        )}
        {trimmedQuery && isSearching && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        )}
        {trimmedQuery && !isSearching && !hasResults && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!isSearching && results.links.length > 0 && (
          <CommandGroup heading="Links">
            {results.links.map((link) => (
              <CommandItem
                key={link.id}
                value={`link-${link.id}`}
                onSelect={() => handleSelect(`/links/${link.id}`)}
                className="gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {link.title || link.slug}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.slug} · {link.destination_url}
                  </p>
                </div>
                {link.status && (
                  <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">
                    {link.status}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!isSearching && results.campaigns.length > 0 && (
          <CommandGroup heading="Campaigns">
            {results.campaigns.map((campaign) => (
              <CommandItem
                key={campaign.id}
                value={`campaign-${campaign.id}`}
                onSelect={() => handleSelect(`/campaigns/${campaign.id}`)}
                className="gap-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Megaphone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{campaign.name}</p>
                  {campaign.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {campaign.description}
                    </p>
                  )}
                </div>
                {campaign.status && (
                  <Badge variant="secondary" className="shrink-0 capitalize text-[10px]">
                    {campaign.status}
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!isSearching && results.pages.length > 0 && (
          <CommandGroup heading="Pages">
            {results.pages.map((item) => {
              const Icon = item.icon || LayoutDashboard;
              return (
                <CommandItem
                  key={item.path}
                  value={`page-${item.path}`}
                  onSelect={() => handleSelect(item.path)}
                  className="gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.path}</p>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useGlobalSearchShortcut(() => setOpen(true));

  return {
    open,
    setOpen,
    openSearch: () => setOpen(true),
  };
}
