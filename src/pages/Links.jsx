import db from "@/api/openClient";

import { useEffect, useState } from "react";

import { Link, useLocation } from "react-router-dom";
import {
  Plus,
  Search,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Edit,
  QrCode,
  Link2,
  MousePointerClick,
  TrendingUp,
  Globe,
  Tag,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { getShortUrl } from "@/lib/qrcode";
import { useAuth } from "@/lib/AuthContext";
import LinkFormDialog from "@/components/links/LinkFormDialog";
import QRDialog from "@/components/links/QRDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Links() {
  const [links, setLinks] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [qrLink, setQrLink] = useState(null);
  const [filterTag, setFilterTag] = useState("");
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "true") {
      setShowForm(true);
    }
  }, [location.search]);

  async function loadData() {
    const [linkData, campaignData, domainData] = await Promise.all([
      db.entities.ShortLink.list("-created_date", 200),
      db.entities.Campaign.list("-created_date", 100),
      db.entities.CustomDomain.list("-created_date", 200),
    ]);
    setLinks(linkData);
    setCampaigns(campaignData);
    setDomains(domainData);
    setLoading(false);
  }

  const filteredLinks = links.filter((link) => {
    const matchesSearch =
      !search ||
      link.slug?.toLowerCase().includes(search.toLowerCase()) ||
      link.title?.toLowerCase().includes(search.toLowerCase()) ||
      link.destination_url?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !filterTag || link.tags?.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(links.flatMap((l) => l.tags || []))];

  function copyLink(link) {
    navigator.clipboard.writeText(getShortUrl(link.slug, link.custom_domain));
    toast({ title: "Copied!", description: "Short URL copied to clipboard" });
  }

  async function deleteLink(id) {
    await db.entities.ShortLink.delete(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
    toast({ title: "Deleted", description: "Link has been removed" });
  }

  function getCampaignName(id) {
    return campaigns.find((c) => c.id === id)?.name || "";
  }

  const totalClicks = links.reduce((sum, l) => sum + (l.total_clicks || 0), 0);
  const activeLinks = links.filter((l) => l.status === "active").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Links</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track all your short links</p>
        </div>
        <button
          onClick={() => { setEditingLink(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> New Link
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold">{links.length}</p>
            <p className="text-[11px] text-muted-foreground">Total Links</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{activeLinks}</p>
            <p className="text-[11px] text-muted-foreground">Active</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <MousePointerClick className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Total Clicks</p>
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, slug, or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterTag("")}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                filterTag === "" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? "" : tag)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-medium border transition-colors",
                  filterTag === tag ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Links List */}
      {filteredLinks.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Link2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-base font-semibold">No links found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Create your first short link to get started"}
          </p>
          {!search && (
            <button
              onClick={() => { setEditingLink(null); setShowForm(true); }}
              className="mt-5 inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" /> Create Link
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLinks.map((link) => {
            const domain = link.destination_url ? (() => { try { return new URL(link.destination_url).hostname; } catch { return ""; } })() : "";
            const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32` : null;

            return (
              <div
                key={link.id}
                className="group bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Favicon */}
                  <div className="shrink-0">
                    {faviconUrl ? (
                      <div className="w-9 h-9 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="w-5 h-5"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl border border-border bg-muted flex items-center justify-center">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Main Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/links/${link.id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors"
                      >
                        {link.title || `/${link.slug}`}
                      </Link>
                      <StatusBadge status={link.status} />
                      {link.is_ab_test && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 uppercase tracking-wider">
                          A/B Test
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <a
                        href={getShortUrl(link.slug, link.custom_domain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary font-mono hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getShortUrl(link.slug, link.custom_domain)}
                      </a>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">{link.destination_url}</p>
                    {(link.tags?.length > 0 || link.campaign_id) && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {link.tags?.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                        {link.campaign_id && (
                          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                            📣 {getCampaignName(link.campaign_id)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Click Count */}
                  <div className="hidden sm:flex flex-col items-center justify-center min-w-[56px] bg-muted/50 rounded-xl px-3 py-2">
                    <span className="text-lg font-bold leading-none">{(link.total_clicks || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">clicks</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyLink(link)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors opacity-60 hover:opacity-100"
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setQrLink(link)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors opacity-60 hover:opacity-100"
                      title="QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-secondary transition-colors opacity-60 hover:opacity-100">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => { setEditingLink(link); setShowForm(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/links/${link.id}`}>
                            <ChevronRight className="h-3.5 w-3.5 mr-2" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={link.destination_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-2" /> Visit URL
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => deleteLink(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <LinkFormDialog
          link={editingLink}
          campaigns={campaigns}
          domains={domains.filter((d) => (user?.role === "admin" || d.owner_user_id === user?.id) && d.is_active !== false)}
          onClose={() => { setShowForm(false); setEditingLink(null); }}
          onSaved={loadData}
        />
      )}

      {qrLink && (
        <QRDialog link={qrLink} onClose={() => setQrLink(null)} />
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700" },
    expired: { label: "Expired", dot: "bg-red-500", cls: "bg-red-50 text-red-600" },
    inactive: { label: "Inactive", dot: "bg-amber-500", cls: "bg-amber-50 text-amber-600" },
  };
  const s = map[status] || { label: status, dot: "bg-gray-400", cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function Link2Icon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}