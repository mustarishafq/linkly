// Simple QR code generation using a public API
export function getQRCodeUrl(text, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=png&margin=8`;
}

function normalizeDomainBase(domainOrUrl) {
  const raw = String(domainOrUrl || "").trim();
  if (!raw) return null;

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(withScheme);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function getQRCodeSvgUrl(text, size = 300) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&format=svg&margin=8`;
}

// Build a QR URL from a QRDesign object
export function getQRCodeUrlFromDesign(design, format = "png") {
  const slug = design.link_slug || design.slug;
  const url = slug ? getShortUrl(slug, design.custom_domain || design.domain) : (design.content || "");
  const size = design.size || 300;
  const color = (design.fg_color || "#000000").replace("#", "");
  const bgcolor = (design.bg_color || "#ffffff").replace("#", "");
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&format=${format}&margin=8&color=${color}&bgcolor=${bgcolor}`;
}

export function generateSlug(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getShortUrl(slug, customDomain) {
  const base = normalizeDomainBase(customDomain) || window.location.origin;
  return `${base}/r/${slug}`;
}