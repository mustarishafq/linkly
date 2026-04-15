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
  Filter,
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
          <h1 className="text-2xl font-bold tracking-tight">Links</h1>
          <p className="text-muted-foreground mt-1">{links.length} total links</p>
        </div>
        <button
          onClick={() => { setEditingLink(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> New Link
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search links..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {allTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm"
          >
            <option value="">All Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>

      {filteredLinks.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Link2Icon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="mt-4 text-lg font-medium">No links yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first short link to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLinks.map((link) => (
            <div
              key={link.id}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/links/${link.id}`}
                      className="font-semibold text-sm hover:text-primary transition-colors"
                    >
                      {link.title || `/${link.slug}`}
                    </Link>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                        link.status === "active"
                          ? "bg-emerald-50 text-emerald-600"
                          : link.status === "expired"
                          ? "bg-red-50 text-red-500"
                          : "bg-amber-50 text-amber-600"
                      )}
                    >
                      {link.status}
                    </span>
                    {link.is_ab_test && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 uppercase tracking-wider">
                        A/B Test
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary font-mono mt-1">{getShortUrl(link.slug, link.custom_domain)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{link.destination_url}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {link.tags?.map((tag) => (
                      <span key={tag} className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                    {link.custom_domain && (
                      <span className="text-[10px] text-muted-foreground">🌐 {link.custom_domain}</span>
                    )}
                    {link.campaign_id && (
                      <span className="text-[10px] text-muted-foreground">
                        📣 {getCampaignName(link.campaign_id)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-bold">{link.total_clicks || 0}</p>
                    <p className="text-[10px] text-muted-foreground">clicks</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyLink(link)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => setQrLink(link)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                      title="QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingLink(link); setShowForm(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={link.destination_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-2" /> Visit URL
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteLink(link.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          ))}
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

function Link2Icon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  );
}