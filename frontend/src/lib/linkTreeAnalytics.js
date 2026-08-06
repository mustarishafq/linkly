import db from "@/api/openClient";
import { buildClientClickContext } from "@/lib/clickContext";
import { isLinkPreviewMode } from "@/lib/linkPreview";

/**
 * Fire-and-forget Link Tree analytics event.
 * @param {string} slug
 * @param {{ event: 'page_view' | 'block_click', block_id?: string, block_title?: string, block_type?: string }} payload
 */
export async function trackLinkTreeEvent(slug, payload) {
  if (!slug || !payload?.event) return null;
  try {
    return await db.linkTrees.track(slug, {
      ...buildClientClickContext(),
      event: payload.event,
      block_id: payload.block_id || null,
      block_title: payload.block_title || null,
      block_type: payload.block_type || null,
      is_test: isLinkPreviewMode(),
    });
  } catch {
    return null;
  }
}

export function summarizeLinkTreeClicks(clicks = []) {
  const official = clicks.filter((c) => !c.is_test);
  const views = official.filter((c) => c.event === "page_view");
  const blockClicks = official.filter((c) => c.event === "block_click");
  const byBlock = {};

  for (const click of blockClicks) {
    const key = click.block_id || click.block_title || "unknown";
    if (!byBlock[key]) {
      byBlock[key] = {
        block_id: click.block_id || null,
        block_title: click.block_title || "Untitled",
        block_type: click.block_type || "link",
        clicks: 0,
      };
    }
    byBlock[key].clicks += 1;
    if (click.block_title) byBlock[key].block_title = click.block_title;
    if (click.block_type) byBlock[key].block_type = click.block_type;
  }

  return {
    views: views.length,
    clicks: blockClicks.length,
    uniqueDevices: new Set(official.map((c) => c.device_type).filter(Boolean)).size,
    byBlock: Object.values(byBlock).sort((a, b) => b.clicks - a.clicks),
  };
}
