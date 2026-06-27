import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";

const API_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_API_BASE_URL) || "/api";

const DEFAULT_DESIGN = {
  fg_color: "#000000",
  bg_color: "#ffffff",
  eye_color: "#000000",
  style: "square",
  logo_url: "",
  logo_size: 20,
  size: 400,
};

function getCandidateLogoUrls(rawUrl) {
  if (!rawUrl) return [];

  const candidates = [rawUrl];

  if (rawUrl.startsWith("/")) {
    const absolute = typeof window !== "undefined" ? `${window.location.origin}${rawUrl}` : rawUrl;
    if (!candidates.includes(absolute)) {
      candidates.unshift(absolute);
    }
  }

  try {
    const parsed = new URL(rawUrl);
    const proxiedUrl = parsed.searchParams.get("url");

    if (proxiedUrl) {
      let decoded = proxiedUrl;
      try {
        decoded = decodeURIComponent(proxiedUrl);
      } catch {
        decoded = proxiedUrl;
      }

      if (decoded && !candidates.includes(decoded)) {
        candidates.unshift(decoded);
      }
    }
  } catch {
    // Ignore invalid URLs and use raw input.
  }

  return candidates;
}

function isDirectLogoUrl(url) {
  return url.startsWith("blob:") || url.startsWith("data:");
}

function needsCorsProxy(url) {
  if (isDirectLogoUrl(url) || typeof window === "undefined") {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

async function tryLoadLogoCandidate(url) {
  const loadUrl = needsCorsProxy(url) ? toProxyImageUrl(url) : url;
  await loadImage(loadUrl);
  return loadUrl;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(url);
    img.onerror = reject;
    img.src = url;
  });
}

function toProxyImageUrl(url) {
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
}

export async function resolveLogoUrl(logoUrl) {
  if (!logoUrl) return "";

  const candidates = getCandidateLogoUrls(logoUrl);

  for (const candidate of candidates) {
    try {
      return await tryLoadLogoCandidate(candidate);
    } catch {
      // Try next candidate URL.
    }
  }

  return "";
}

export async function prepareQRDesign(activeDesign) {
  const design = { ...DEFAULT_DESIGN, ...(activeDesign ?? {}) };
  const resolvedLogoUrl = await resolveLogoUrl(design.logo_url);
  return { design, resolvedLogoUrl };
}

export default function QRCodePreview({
  value,
  design,
  size = 200,
  displaySize,
  className = "",
  containerRef,
  preloadedLogoUrl,
  onReady,
}) {
  const fgColor = design?.fg_color || "#000000";
  const bgColor = design?.bg_color || "#ffffff";
  const eyeColor = design?.eye_color || "#000000";
  const style = design?.style || "square";
  const logoUrl = design?.logo_url || "";
  const internalRef = useRef(null);
  const mountRef = containerRef || internalRef;
  const qrInstanceRef = useRef(null);
  const readyCalledRef = useRef(false);
  const [logoState, setLogoState] = useState(() =>
    preloadedLogoUrl !== undefined
      ? { ready: true, url: preloadedLogoUrl }
      : { ready: !logoUrl, url: "" }
  );

  useEffect(() => {
    if (preloadedLogoUrl !== undefined) {
      setLogoState({ ready: true, url: preloadedLogoUrl });
      return;
    }

    if (!logoUrl) {
      setLogoState({ ready: true, url: "" });
      return;
    }

    let cancelled = false;
    setLogoState({ ready: false, url: "" });

    const run = async () => {
      const resolved = await resolveLogoUrl(logoUrl);
      if (!cancelled) {
        setLogoState({ ready: true, url: resolved });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [logoUrl, preloadedLogoUrl]);

  const renderSize = Number(size) || 200;
  const logoSizeRatio = Math.min(0.5, Math.max(0.05, (Number(design?.logo_size ?? 20) || 20) / 100));
  const dotType = style === "dots" ? "dots" : style === "rounded" ? "rounded" : "square";

  useEffect(() => {
    if (!mountRef.current || !logoState.ready) {
      return;
    }

    let cancelled = false;
    const options = {
      width: renderSize,
      height: renderSize,
      type: "canvas",
      data: value || "https://linkly.app",
      margin: 0,
      qrOptions: {
        errorCorrectionLevel: "H",
      },
      dotsOptions: {
        color: fgColor,
        type: dotType,
      },
      cornersSquareOptions: {
        color: eyeColor,
        type: style === "rounded" ? "extra-rounded" : "square",
      },
      cornersDotOptions: {
        color: eyeColor,
        type: style === "dots" ? "dot" : "square",
      },
      backgroundOptions: {
        color: bgColor,
      },
      image: logoState.url || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 2,
        hideBackgroundDots: true,
        imageSize: logoSizeRatio,
      },
    };

    async function render() {
      const isFirstRender = !qrInstanceRef.current;

      if (isFirstRender) {
        qrInstanceRef.current = new QRCodeStyling(options);
        mountRef.current.innerHTML = "";
        qrInstanceRef.current.append(mountRef.current);
      } else {
        qrInstanceRef.current.update(options);
      }

      if (onReady) {
        try {
          await qrInstanceRef.current.getRawData("png");
        } catch {
          // Fall through — still attempt to reveal the preview.
        }
      }

      if (cancelled || !mountRef.current) return;

      const canvas = mountRef.current.querySelector("canvas");
      if (canvas) {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
      }

      if (onReady && isFirstRender && !readyCalledRef.current) {
        readyCalledRef.current = true;
        onReady();
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [
    mountRef,
    logoState.ready,
    logoState.url,
    renderSize,
    value,
    fgColor,
    bgColor,
    eyeColor,
    style,
    logoSizeRatio,
    dotType,
    onReady,
  ]);

  useEffect(() => {
    const node = mountRef.current;
    return () => {
      qrInstanceRef.current = null;
      readyCalledRef.current = false;
      if (node) node.innerHTML = "";
    };
  }, [mountRef]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: displaySize ? `${displaySize}px` : `${renderSize}px`,
        height: displaySize ? `${displaySize}px` : `${renderSize}px`,
        borderRadius: style === "rounded" ? 8 : 0,
        overflow: "hidden",
      }}
    />
  );
}
