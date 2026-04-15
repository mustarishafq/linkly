import QRCodeStyling from "qr-code-styling";
import { useEffect, useRef, useState } from "react";

const API_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_API_BASE_URL) || "/api";

function getCandidateLogoUrls(rawUrl) {
  if (!rawUrl) return [];

  const candidates = [rawUrl];

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

function loadImageDimensions(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || 1,
        height: img.naturalHeight || 1,
      });
    };
    img.onerror = reject;
    img.src = url;
  });
}

function toProxyImageUrl(url) {
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function QRCodePreview({ value, design, size = 200, displaySize, className = "", containerRef }) {
  const fgColor = design?.fg_color || "#000000";
  const bgColor = design?.bg_color || "#ffffff";
  const eyeColor = design?.eye_color || "#000000";
  const style = design?.style || "square";
  const logoUrl = design?.logo_url || "";
  const internalRef = useRef(null);
  const mountRef = containerRef || internalRef;
  const [logoDimensions, setLogoDimensions] = useState({ width: 1, height: 1 });
  const [resolvedLogoUrl, setResolvedLogoUrl] = useState("");

  useEffect(() => {
    if (!logoUrl) {
      setLogoDimensions({ width: 1, height: 1 });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const candidates = getCandidateLogoUrls(logoUrl);

      for (const candidate of candidates) {
        const proxied = toProxyImageUrl(candidate);
        try {
          const dims = await loadImageDimensions(proxied);
          if (!cancelled) {
            setLogoDimensions(dims);
            setResolvedLogoUrl(proxied);
          }
          return;
        } catch {
          // Try next candidate URL.
        }
      }

      if (!cancelled) {
        setLogoDimensions({ width: 1, height: 1 });
        setResolvedLogoUrl("");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  const renderSize = Number(size) || 200;
  const logoSizeRatio = Math.min(0.5, Math.max(0.05, (Number(design?.logo_size ?? 20) || 20) / 100));
  const aspectRatio = logoDimensions.height > 0 ? logoDimensions.width / logoDimensions.height : 1;
  const imageSize = logoSizeRatio;

  const dotType = style === "dots" ? "dots" : style === "rounded" ? "rounded" : "square";

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const qrInstance = new QRCodeStyling({
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
      image: resolvedLogoUrl || undefined,
      imageOptions: {
        crossOrigin: "anonymous",
        margin: 2,
        hideBackgroundDots: true,
        imageSize,
      },
    });

    mountRef.current.innerHTML = "";
    qrInstance.append(mountRef.current);

    const canvas = mountRef.current.querySelector("canvas");
    if (canvas) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
    }
  }, [mountRef, renderSize, value, fgColor, bgColor, eyeColor, style, resolvedLogoUrl, imageSize, dotType]);

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