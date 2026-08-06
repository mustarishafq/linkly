import {
  Instagram,
  Twitter,
  Music2,
  Youtube,
  Linkedin,
  Facebook,
  Github,
  Globe,
  Mail,
  Phone,
  ExternalLink,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DEFAULT_THEME,
  getAvatarShapeClass,
  getBackgroundPreset,
  getFontClass,
  getMusicEmbedUrl,
  getVideoEmbedUrl,
  isDarkTheme,
  linkButtonClass,
  resolveBlockHref,
  treeSurfaceClasses,
} from "@/lib/linkTreeTheme";

const SOCIAL_ICONS = {
  instagram: Instagram,
  x: Twitter,
  tiktok: Music2,
  youtube: Youtube,
  linkedin: Linkedin,
  facebook: Facebook,
  github: Github,
  website: Globe,
};

function BlockButton({ theme, href, children, compact, icon: Icon }) {
  const btn = linkButtonClass(theme, { compact });
  const content = (
    <span className="inline-flex items-center justify-center gap-2">
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" /> : null}
      <span className="truncate">{children}</span>
    </span>
  );

  if (!href) {
    return (
      <div className={btn.className} style={btn.style}>
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") || href.startsWith("tel:") ? undefined : "noopener noreferrer"}
      className={btn.className}
      style={btn.style}
    >
      {content}
    </a>
  );
}

function VideoBlock({ link, theme, compact }) {
  const surface = treeSurfaceClasses(theme);
  const embed = getVideoEmbedUrl(link.url);
  if (!embed) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm",
          surface.videoFallback
        )}
      >
        <Play className="h-4 w-4" />
        <span className="truncate">{link.title || "Watch video"}</span>
      </a>
    );
  }

  return (
    <div className="space-y-2">
      {link.title ? (
        <p className={cn("text-center font-medium", surface.title, compact ? "text-xs" : "text-sm")}>
          {link.title}
        </p>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-xl border shadow-md aspect-video bg-black",
          surface.embedFrame
        )}
      >
        <iframe
          src={embed}
          title={link.title || "Video"}
          className="h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}

function MusicBlock({ link, theme, compact }) {
  const surface = treeSurfaceClasses(theme);
  const embed = getMusicEmbedUrl(link.url);
  if (embed) {
    return (
      <div className="space-y-2">
        {link.title ? (
          <p className={cn("text-center font-medium", surface.title, compact ? "text-xs" : "text-sm")}>
            {link.title}
          </p>
        ) : null}
        <iframe
          src={embed}
          title={link.title || "Music"}
          className="w-full rounded-xl border-0"
          style={{ height: compact ? 80 : 152 }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      </div>
    );
  }

  return (
    <BlockButton theme={theme} href={resolveBlockHref(link)} compact={compact} icon={Music2}>
      {link.title || "Listen"}
    </BlockButton>
  );
}

function ImageBlock({ link, theme, compact }) {
  const surface = treeSurfaceClasses(theme);
  const src = link.image_url || link.url;
  if (!src) return null;
  const href = link.image_url && link.url ? resolveBlockHref({ ...link, type: "link" }) : null;
  const img = (
    <img
      src={src}
      alt={link.title || ""}
      className={cn(
        "w-full object-cover shadow-md",
        compact ? "rounded-lg max-h-40" : "rounded-2xl max-h-72"
      )}
      loading="lazy"
    />
  );

  return (
    <div className="space-y-2">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block overflow-hidden">
          {img}
        </a>
      ) : (
        <div className="overflow-hidden">{img}</div>
      )}
      {link.title ? (
        <p className={cn("text-center font-medium", surface.title, compact ? "text-xs" : "text-sm")}>
          {link.title}
        </p>
      ) : null}
      {link.description ? (
        <p className={cn("text-center", surface.muted, compact ? "text-[10px]" : "text-xs")}>
          {link.description}
        </p>
      ) : null}
    </div>
  );
}

export function LinkTreeBlock({ link, theme, compact = false }) {
  const type = link.type || "link";
  const surface = treeSurfaceClasses(theme);

  if (type === "divider") {
    return (
      <div className="py-1">
        <div className={cn("mx-auto h-px w-16", surface.divider)} aria-hidden />
      </div>
    );
  }

  if (type === "header") {
    return (
      <h3
        className={cn(
          "pt-2 text-center font-semibold tracking-wide uppercase",
          compact ? "text-[10px]" : "text-xs",
          surface.subtle
        )}
      >
        {link.title}
      </h3>
    );
  }

  if (type === "text") {
    return (
      <p
        className={cn(
          "text-center leading-relaxed whitespace-pre-wrap",
          compact ? "text-xs" : "text-sm",
          surface.muted
        )}
      >
        {link.title}
      </p>
    );
  }

  if (type === "video") return <VideoBlock link={link} theme={theme} compact={compact} />;
  if (type === "music") return <MusicBlock link={link} theme={theme} compact={compact} />;
  if (type === "image") return <ImageBlock link={link} theme={theme} compact={compact} />;

  if (type === "email") {
    return (
      <BlockButton theme={theme} href={resolveBlockHref(link)} compact={compact} icon={Mail}>
        {link.title}
      </BlockButton>
    );
  }

  if (type === "phone") {
    return (
      <BlockButton theme={theme} href={resolveBlockHref(link)} compact={compact} icon={Phone}>
        {link.title}
      </BlockButton>
    );
  }

  return (
    <BlockButton theme={theme} href={resolveBlockHref(link)} compact={compact} icon={ExternalLink}>
      {link.title}
    </BlockButton>
  );
}

export function LinkTreeSocialRow({ socials, theme, compact = false }) {
  const surface = treeSurfaceClasses(theme);
  const items = (socials || []).filter((s) => s?.platform && s?.url);
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-3" : "mt-5")}>
      {items.map((social) => {
        const Icon = SOCIAL_ICONS[social.platform] || Globe;
        return (
          <a
            key={`${social.platform}-${social.url}`}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.platform}
            className={cn(
              "inline-flex items-center justify-center rounded-full transition-transform hover:scale-110",
              compact ? "h-8 w-8" : "h-10 w-10",
              surface.social
            )}
          >
            <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </a>
        );
      })}
    </div>
  );
}

export function LinkTreeProfile({
  title,
  bio,
  avatarUrl,
  theme,
  socials,
  compact = false,
  className,
}) {
  const merged = { ...DEFAULT_THEME, ...(theme || {}) };
  const surface = treeSurfaceClasses(merged);
  const avatarShape = getAvatarShapeClass(merged.avatar_shape);

  return (
    <div className={cn("flex flex-col items-center w-full", className)}>
      <Avatar
        className={cn(
          avatarShape,
          "border-2 shadow-lg",
          surface.avatarBorder,
          compact ? "h-16 w-16" : "h-24 w-24"
        )}
      >
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={title} className={avatarShape} /> : null}
        <AvatarFallback
          className={cn(
            "font-semibold",
            surface.avatarFallback,
            avatarShape,
            compact ? "text-lg" : "text-2xl"
          )}
        >
          {(title || "?").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <h1
        className={cn(
          "mt-4 font-bold text-center",
          surface.title,
          compact ? "text-base leading-snug" : "text-2xl tracking-tight"
        )}
      >
        {title || "Untitled"}
      </h1>
      {bio ? (
        <p
          className={cn(
            "mt-2 text-center leading-relaxed max-w-sm",
            surface.muted,
            compact ? "text-xs max-w-[220px]" : "text-sm"
          )}
        >
          {bio}
        </p>
      ) : null}
      <LinkTreeSocialRow socials={socials} theme={merged} compact={compact} />
    </div>
  );
}

export function LinkTreeContent({
  title,
  bio,
  avatarUrl,
  theme,
  links,
  socials,
  compact = false,
  className,
  footer,
}) {
  const merged = { ...DEFAULT_THEME, ...(theme || {}) };
  const preset = getBackgroundPreset(merged.background_preset);
  const fontClass = getFontClass(merged.font_style);
  const surface = treeSurfaceClasses(merged);
  const dark = isDarkTheme(merged);
  const visibleLinks = (links || []).filter((l) => {
    // Public API omits `enabled` (only returns published/enabled blocks). Treat missing as on.
    if (l?.enabled === false) return false;
    const type = l.type || "link";
    if (type === "divider") return true;
    if (type === "header" || type === "text") return Boolean(l.title?.trim());
    if (type === "image") return Boolean((l.image_url || l.url || "").trim());
    if (type === "video" || type === "music") return Boolean(l.url?.trim());
    return Boolean((l.title || "").trim() && (l.url || "").trim());
  });

  return (
    <div
      className={cn(
        "min-h-full flex flex-col link-tree-surface",
        preset.className,
        fontClass,
        className
      )}
      data-tree-theme={dark ? "dark" : "light"}
      style={{ colorScheme: dark ? "dark" : "light" }}
    >
      <div className={cn("flex-1 flex flex-col items-center", compact ? "px-4 pt-4 pb-10" : "px-4 py-12 sm:py-16")}>
        <div className={cn("w-full flex flex-col items-center", compact ? "max-w-none" : "max-w-md")}>
          <LinkTreeProfile
            title={title}
            bio={bio}
            avatarUrl={avatarUrl}
            theme={merged}
            socials={socials}
            compact={compact}
          />
          <div className={cn("w-full", compact ? "mt-5 space-y-2.5" : "mt-8 space-y-3")}>
            {visibleLinks.length === 0 ? (
              <p
                className={cn(
                  "text-center",
                  surface.subtle,
                  compact ? "text-xs py-6" : "text-sm py-8"
                )}
              >
                No blocks yet
              </p>
            ) : (
              visibleLinks.map((link) => (
                <LinkTreeBlock
                  key={link.id || `${link.type}-${link.title}`}
                  link={link}
                  theme={merged}
                  compact={compact}
                />
              ))
            )}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}
