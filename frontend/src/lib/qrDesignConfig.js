export const QR_STYLES = ["square", "rounded", "dots"];
export const QR_SIZES = [200, 300, 400, 600, 800];

export const DEFAULT_QR_DESIGN = {
  name: "Organization Default",
  fg_color: "#000000",
  bg_color: "#ffffff",
  eye_color: "#000000",
  style: "square",
  size: 300,
  logo_size: 20,
  logo_url: "",
};

export function normalizeQrDesign(input = {}) {
  const style = QR_STYLES.includes(input.style) ? input.style : DEFAULT_QR_DESIGN.style;
  const size = QR_SIZES.includes(Number(input.size)) ? Number(input.size) : DEFAULT_QR_DESIGN.size;
  const logoSize = Number(input.logo_size);
  const normalizedLogoSize = logoSize >= 10 && logoSize <= 40 ? logoSize : DEFAULT_QR_DESIGN.logo_size;

  return {
    name: String(input.name || DEFAULT_QR_DESIGN.name).trim() || DEFAULT_QR_DESIGN.name,
    fg_color: input.fg_color || DEFAULT_QR_DESIGN.fg_color,
    bg_color: input.bg_color || DEFAULT_QR_DESIGN.bg_color,
    eye_color: input.eye_color || DEFAULT_QR_DESIGN.eye_color,
    style,
    size,
    logo_size: normalizedLogoSize,
    logo_url: String(input.logo_url || "").trim(),
  };
}

export function buildQrDesignSnapshot({ design, linkId, source = "custom" }) {
  const normalized = normalizeQrDesign(design);

  return {
    ...normalized,
    link_id: linkId,
    is_active: true,
    source,
  };
}
