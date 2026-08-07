/** Shared Link Tree theme presets, block types, and helpers. */

export const LINK_TREE_STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "paused", label: "Paused" },
];

export const BACKGROUND_PRESETS = [
  {
    id: "slate",
    label: "Slate",
    className: "bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900",
    dark: false,
  },
  {
    id: "ocean",
    label: "Ocean",
    className: "bg-gradient-to-b from-sky-200 via-cyan-50 to-white text-slate-900",
    dark: false,
  },
  {
    id: "forest",
    label: "Forest",
    className: "bg-gradient-to-b from-emerald-200 via-teal-50 to-white text-slate-900",
    dark: false,
  },
  {
    id: "sunset",
    label: "Sunset",
    className: "bg-gradient-to-b from-orange-200 via-amber-50 to-rose-50 text-slate-900",
    dark: false,
  },
  {
    id: "midnight",
    label: "Midnight",
    className: "bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-800 text-zinc-50",
    dark: true,
  },
  {
    id: "sand",
    label: "Sand",
    className: "bg-gradient-to-b from-stone-200 via-stone-100 to-amber-50 text-stone-900",
    dark: false,
  },
  {
    id: "bloom",
    label: "Bloom",
    className: "bg-gradient-to-br from-fuchsia-200 via-rose-50 to-violet-100 text-slate-900",
    dark: false,
  },
  {
    id: "aurora",
    label: "Aurora",
    className: "bg-gradient-to-b from-indigo-950 via-violet-900 to-teal-900 text-violet-50",
    dark: true,
  },
  {
    id: "paper",
    label: "Paper",
    className: "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-100 via-white to-neutral-50 text-neutral-900",
    dark: false,
  },
  {
    id: "ember",
    label: "Ember",
    className: "bg-gradient-to-b from-red-950 via-orange-950 to-stone-950 text-orange-50",
    dark: true,
  },
];

export const BUTTON_STYLES = [
  { id: "solid", label: "Solid" },
  { id: "outline", label: "Outline" },
  { id: "soft", label: "Soft" },
  { id: "glass", label: "Glass" },
];

export const BUTTON_RADII = [
  { id: "rounded", label: "Rounded", className: "rounded-xl" },
  { id: "pill", label: "Pill", className: "rounded-full" },
  { id: "square", label: "Square", className: "rounded-md" },
];

export const FONT_STYLES = [
  { id: "sans", label: "Sans", className: "font-sans" },
  { id: "display", label: "Display", className: "font-serif tracking-tight" },
  { id: "mono", label: "Mono", className: "font-mono" },
];

export const AVATAR_SHAPES = [
  { id: "circle", label: "Circle", className: "rounded-full" },
  { id: "rounded", label: "Rounded", className: "rounded-2xl" },
];

export const LINK_BLOCK_TYPES = [
  { id: "link", label: "Link", description: "Standard button link" },
  { id: "custom", label: "Custom", description: "Link with a chosen icon" },
  { id: "video", label: "Video", description: "YouTube or Vimeo embed" },
  { id: "music", label: "Music", description: "Spotify / Apple Music link" },
  { id: "image", label: "Image", description: "Image with optional link" },
  { id: "header", label: "Header", description: "Section title" },
  { id: "text", label: "Text", description: "Paragraph of copy" },
  { id: "email", label: "Email", description: "mailto: button" },
  { id: "phone", label: "Phone", description: "tel: button" },
  { id: "whatsapp", label: "WhatsApp", description: "Chat on WhatsApp" },
  { id: "maps", label: "Maps", description: "Directions / place pin" },
  { id: "divider", label: "Divider", description: "Visual separator" },
];

/** Default title when adding a contact-style block (keeps drafts savable). */
export const BLOCK_DEFAULT_TITLES = {
  custom: "Custom link",
  email: "Email",
  phone: "Call",
  whatsapp: "WhatsApp",
  maps: "Directions",
};

export const CONTACT_BLOCK_TYPES = ["email", "phone", "whatsapp", "maps"];

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { id: "x", label: "X / Twitter", placeholder: "https://x.com/…" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@…" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@…" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { id: "github", label: "GitHub", placeholder: "https://github.com/…" },
  { id: "website", label: "Website", placeholder: "https://…" },
];

export const BACKGROUND_FITS = [
  { id: "cover", label: "Cover", description: "Fill the frame, crop edges" },
  { id: "contain", label: "Fit", description: "Show full image" },
  { id: "fill", label: "Stretch", description: "Stretch to fill" },
];

export const BACKGROUND_POSITIONS = [
  { id: "top-left", label: "Top left", value: "left top" },
  { id: "top", label: "Top", value: "center top" },
  { id: "top-right", label: "Top right", value: "right top" },
  { id: "left", label: "Left", value: "left center" },
  { id: "center", label: "Center", value: "center center" },
  { id: "right", label: "Right", value: "right center" },
  { id: "bottom-left", label: "Bottom left", value: "left bottom" },
  { id: "bottom", label: "Bottom", value: "center bottom" },
  { id: "bottom-right", label: "Bottom right", value: "right bottom" },
];

export const DEFAULT_THEME = {
  background_preset: "slate",
  background_image_url: "",
  background_fit: "cover",
  background_position: "center",
  background_zoom: 100,
  overlay_opacity: 45,
  button_style: "solid",
  button_radius: "rounded",
  font_style: "sans",
  avatar_shape: "circle",
  accent_color: "#0f766e",
  show_branding: true,
};

export function getBackgroundPreset(id) {
  return BACKGROUND_PRESETS.find((p) => p.id === id) || BACKGROUND_PRESETS[0];
}

export function clampOverlayOpacity(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_THEME.overlay_opacity;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function clampBackgroundZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_THEME.background_zoom;
  return Math.min(200, Math.max(100, Math.round(n)));
}

export function getBackgroundFit(id) {
  return BACKGROUND_FITS.find((f) => f.id === id) || BACKGROUND_FITS[0];
}

export function getBackgroundPosition(id) {
  return BACKGROUND_POSITIONS.find((p) => p.id === id) || BACKGROUND_POSITIONS[4];
}

/** CSS for the tree background image layer (or null when no image). */
export function getBackgroundImageStyle(theme) {
  const url = String(theme?.background_image_url || "").trim();
  if (!url) return null;

  const fit = getBackgroundFit(theme?.background_fit);
  const position = getBackgroundPosition(theme?.background_position);
  const zoom = clampBackgroundZoom(theme?.background_zoom);

  let backgroundSize = "cover";
  if (fit.id === "contain") {
    backgroundSize = "contain";
  } else if (fit.id === "fill") {
    backgroundSize = "100% 100%";
  } else if (zoom > 100) {
    backgroundSize = `${zoom}%`;
  }

  return {
    backgroundImage: `url(${url})`,
    backgroundSize,
    backgroundPosition: position.value,
    backgroundRepeat: "no-repeat",
  };
}

export function hasBackgroundImage(theme) {
  return Boolean(String(theme?.background_image_url || "").trim());
}

export function isDarkTheme(theme) {
  const preset = getBackgroundPreset(theme?.background_preset);
  const hasImage = hasBackgroundImage(theme);
  const opacity = clampOverlayOpacity(theme?.overlay_opacity);

  if (hasImage) {
    // Strong preset overlay → follow preset contrast; bare photo → light text.
    if (opacity >= 20) return Boolean(preset.dark);
    return true;
  }

  return Boolean(preset.dark);
}

export function getFontClass(fontStyle) {
  return FONT_STYLES.find((f) => f.id === fontStyle)?.className || FONT_STYLES[0].className;
}

export function getRadiusClass(radius) {
  return BUTTON_RADII.find((r) => r.id === radius)?.className || BUTTON_RADII[0].className;
}

export function getAvatarShapeClass(shape) {
  return AVATAR_SHAPES.find((s) => s.id === shape)?.className || AVATAR_SHAPES[0].className;
}

export function getBlockType(id) {
  return LINK_BLOCK_TYPES.find((t) => t.id === id) || LINK_BLOCK_TYPES[0];
}

export function publicLinkTreeUrl(slug) {
  if (typeof window === "undefined") return `/t/${slug}`;
  return `${window.location.origin}/t/${slug}`;
}

export function statusBadgeClass(status) {
  if (status === "published") {
    return "bg-success/15 text-success border border-success/25";
  }
  if (status === "paused") {
    return "bg-warning/15 text-warning border border-warning/25";
  }
  return "bg-secondary text-muted-foreground border border-transparent";
}

/** Text / muted colors for content inside a tree theme (independent of app light/dark). */
export function treeSurfaceClasses(theme) {
  const dark = isDarkTheme(theme);
  return {
    dark,
    title: dark ? "text-white" : "text-slate-900",
    muted: dark ? "text-white/70" : "text-slate-700/80",
    subtle: dark ? "text-white/50" : "text-slate-500",
    divider: dark ? "bg-white/25" : "bg-slate-900/15",
    social: dark
      ? "border border-white/35 bg-white/15 text-white hover:bg-white/25 hover:border-white/50"
      : "border border-slate-900/15 bg-slate-900/5 text-slate-800 hover:bg-slate-900/10 hover:border-slate-900/25",
    avatarBorder: dark ? "border-white/35" : "border-white/70",
    avatarFallback: dark ? "bg-white/15 text-white" : "bg-white text-slate-800",
    videoFallback: dark
      ? "border-white/20 bg-black/45 text-white"
      : "border-slate-900/10 bg-slate-900/80 text-white",
    embedFrame: dark ? "border-white/10" : "border-slate-900/10",
  };
}

export function contrastTextOnAccent(hex) {
  const raw = String(hex || "#0f766e").replace("#", "");
  if (raw.length !== 6) return "#ffffff";
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0f172a" : "#ffffff";
}


export function newLinkItem(partial = {}) {
  const type = partial.type || "link";
  const defaultTitle = BLOCK_DEFAULT_TITLES[type] || "";
  return {
    id: crypto.randomUUID?.() || `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: defaultTitle,
    url: "",
    description: "",
    image_url: "",
    icon: type === "custom" ? "link" : "",
    enabled: true,
    sort_order: 0,
    ...partial,
    title: partial.title ?? defaultTitle,
    icon: partial.icon ?? (type === "custom" ? "link" : partial.icon || ""),
  };
}

export function blockNeedsUrl(type) {
  return ["link", "custom", "video", "music", "email", "phone", "whatsapp", "maps"].includes(type);
}

export function isContactBlockType(type) {
  return CONTACT_BLOCK_TYPES.includes(type);
}

export function blockIsVisibleInPreview(link) {
  if (link?.enabled === false) return false;
  const type = link.type || "link";
  if (type === "divider") return true;
  if (type === "header" || type === "text") return Boolean(link.title?.trim());
  if (type === "image") return Boolean(link.image_url?.trim() || link.url?.trim());
  if (type === "video" || type === "music") return Boolean(link.url?.trim());
  if (isContactBlockType(type)) {
    return Boolean(link.title?.trim() && link.url?.trim());
  }
  return Boolean(link.title?.trim() && link.url?.trim());
}

/** Parse YouTube / Vimeo into a safe embed URL, or null. */
export function getVideoEmbedUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname.startsWith("/embed/")) {
        const id = parsed.pathname.split("/")[2];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
      }
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
      const shorts = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shorts?.[1]) {
        return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(shorts[1])}`;
      }
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const id = host === "player.vimeo.com" ? parts[1] : parts[0];
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

/** Spotify / Apple Music embed when possible. */
export function getMusicEmbedUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "open.spotify.com") {
      const path = parsed.pathname.replace(/\/$/, "");
      if (/^\/(track|album|playlist|episode|show)\//.test(path)) {
        return `https://open.spotify.com/embed${path}`;
      }
    }

    if (host === "music.apple.com") {
      return null;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeHttpUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

/** Digits only (no +) for wa.me links. */
export function digitsOnlyPhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

export function resolveWhatsAppHref(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return normalizeHttpUrl(value) || null;
  const withoutTel = value.replace(/^tel:/i, "");
  const digits = digitsOnlyPhone(withoutTel);
  return digits ? `https://wa.me/${digits}` : null;
}

export function resolveMapsHref(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return normalizeHttpUrl(value) || null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
}

export function resolveBlockHref(link) {
  const type = link?.type || "link";
  const value = String(link?.url || "").trim();
  if (!value) return null;

  if (type === "email") {
    if (value.startsWith("mailto:")) return value;
    return `mailto:${value}`;
  }
  if (type === "phone") {
    const digits = value.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : null;
  }
  if (type === "whatsapp") {
    return resolveWhatsAppHref(value);
  }
  if (type === "maps") {
    return resolveMapsHref(value);
  }
  return normalizeHttpUrl(value) || null;
}


export function linkButtonClass(theme, { compact = false } = {}) {
  const buttonStyle = theme?.button_style || "solid";
  const accentColor = theme?.accent_color || DEFAULT_THEME.accent_color;
  const isDarkBg = isDarkTheme(theme);
  const radius = getRadiusClass(theme?.button_radius);
  const pad = compact ? "px-3 py-2.5 text-xs" : "px-4 py-3.5 text-sm";
  const base = `block w-full ${radius} ${pad} text-center font-semibold transition-transform hover:scale-[1.015] active:scale-[0.99]`;

  if (buttonStyle === "outline") {
    return {
      className: `${base} border-2 bg-transparent`,
      style: {
        borderColor: accentColor,
        color: isDarkBg ? "#f8fafc" : accentColor,
      },
    };
  }

  if (buttonStyle === "soft") {
    return {
      className: base,
      style: {
        backgroundColor: isDarkBg ? `${accentColor}33` : `${accentColor}1f`,
        color: isDarkBg ? "#f8fafc" : accentColor,
      },
    };
  }

  if (buttonStyle === "glass") {
    return {
      className: `${base} backdrop-blur-md shadow-sm`,
      style: {
        backgroundColor: isDarkBg ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.62)",
        border: isDarkBg ? "1px solid rgba(255,255,255,0.22)" : "1px solid rgba(15,23,42,0.08)",
        color: isDarkBg ? "#f8fafc" : "#0f172a",
      },
    };
  }

  return {
    className: `${base} shadow-md shadow-black/10`,
    style: {
      backgroundColor: accentColor,
      color: contrastTextOnAccent(accentColor),
    },
  };
}
