const ENTITY_NAMES = [
  "ABVariant",
  "Campaign",
  "ClickLog",
  "CustomDomain",
  "QRDesign",
  "LinkNotificationRule",
  "LinkTree",
  "RedirectRule",
  "ShortLink",
];

const API_BASE_URL = (/** @type {any} */ (import.meta).env?.VITE_API_BASE_URL) || "/api";
const TOKEN_KEY = "linkly_access_token";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** @param {string | null | undefined} token */
function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

function buildApiUrl(path) {
  const base = String(API_BASE_URL).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${base}${normalizedPath}`;
}

function htmlApiMisconfigMessage(status, url) {
  const statusLabel = status ? ` (HTTP ${status})` : "";
  return (
    `API returned HTML instead of JSON${statusLabel} for ${url}. ` +
    "In production, set VITE_API_BASE_URL to your backend " +
    "(e.g. https://linklyapi.emzinexus.com/api) and rebuild the frontend — not /api on the SPA host. " +
    "If other settings work, deploy the latest backend and try again."
  );
}

/**
 * @param {Response} response
 * @param {string} url
 */
async function readJsonResponse(response, url) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
    throw new Error(htmlApiMisconfigMessage(response.status, url));
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from API (${response.status}) at ${url}`);
  }
}

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function request(path, options = {}) {
  const { anonymous = false, ...fetchOptions } = options;
  const token = getToken();
  const headers = new Headers(fetchOptions.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (token && !anonymous) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = buildApiUrl(path);
  const response = await fetch(url, {
    headers,
    ...fetchOptions,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await readJsonResponse(response, url);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API returned HTML instead of JSON")) {
        throw error;
      }
      payload = null;
    }
    const error = new Error(payload?.message || `Request failed: ${response.status}`);
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.code = payload?.code;
    // @ts-ignore
    error.receiverStatus = payload?.receiver_status;
    // @ts-ignore
    error.receiverBody = payload?.receiver_body;
    throw error;
  }

  return readJsonResponse(response, url);
}

/**
 * @param {string} path
 * @param {FormData} formData
 */
async function uploadRequest(path, formData) {
  const token = getToken();
  const headers = new Headers();
  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = buildApiUrl(path);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await readJsonResponse(response, url);
    } catch (error) {
      if (error instanceof Error && error.message.includes("API returned HTML instead of JSON")) {
        throw error;
      }
      payload = null;
    }
    const error = new Error(payload?.message || `Upload failed: ${response.status}`);
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.code = payload?.code;
    throw error;
  }

  return readJsonResponse(response, url);
}

/** @param {string} entityName @param {{ anonymous?: boolean }} [options] */
function createEntityApi(entityName, options = {}) {
  const anonymous = Boolean(options.anonymous);

  return {
    async list(sortBy = "-created_date", limit = 200) {
      return request(`/entities/${entityName}/list`, {
        method: "POST",
        anonymous,
        body: JSON.stringify({ sortBy, limit }),
      });
    },

    async filter(where = {}, sortBy = "-created_date", limit = 200) {
      return request(`/entities/${entityName}/filter`, {
        method: "POST",
        anonymous,
        body: JSON.stringify({ where, sortBy, limit }),
      });
    },

    /** @param {string} id */
    async get(id) {
      return request(`/entities/${entityName}/${id}`, { anonymous });
    },

    /** @param {Record<string, any>} data */
    async create(data) {
      return request(`/entities/${entityName}`, {
        method: "POST",
        anonymous,
        body: JSON.stringify(data || {}),
      });
    },

    /** @param {Record<string, any>[]} [items] */
    async bulkCreate(items = []) {
      return request(`/entities/${entityName}/bulk`, {
        method: "POST",
        anonymous,
        body: JSON.stringify({ items: Array.isArray(items) ? items : [] }),
      });
    },

    /** @param {string} id @param {Record<string, any>} patch */
    async update(id, patch) {
      return request(`/entities/${entityName}/${id}`, {
        method: "PATCH",
        anonymous,
        body: JSON.stringify(patch || {}),
      });
    },

    /** @param {string} id */
    async delete(id) {
      return request(`/entities/${entityName}/${id}`, {
        method: "DELETE",
        anonymous,
      });
    },
  };
}

function entityProxy(anonymous = false) {
  return new Proxy(
    {},
    {
      get: (_, entityName) => createEntityApi(String(entityName), { anonymous }),
    }
  );
}

const entities = entityProxy(false);

/** Public redirect traffic. Omits the logged-in token so another user's link can still resolve. */
const publicEntities = entityProxy(true);

const auth = {
  async isAuthenticated() {
    try {
      const user = await request("/auth/me");
      return Boolean(user?.id);
    } catch {
      return false;
    }
  },

  async me() {
    return request("/auth/me");
  },

  /** @param {string} email @param {string} password */
  async login(email, password) {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(result?.token || null);
    return result;
  },

  /** @param {{ full_name: string, email: string, password: string }} input */
  async register(input) {
    const { full_name, email, password } = input;
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ full_name, email, password }),
    });
  },

  /** @param {string} email */
  async forgotPassword(email) {
    return request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /** @param {string} token @param {string} password */
  async resetPassword(token, password) {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  },

  /** @param {string} [returnUrl] */
  logout(returnUrl) {
    setToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
      if (returnUrl) {
        window.location.assign(returnUrl);
      }
    }
  },

  /** @param {string} token @param {{ redirect_to?: string, return_to?: string }} [opts] */
  async verifyNexusSso(token, opts = {}) {
    const result = await request("/sso/nexus/verify", {
      method: "POST",
      body: JSON.stringify({
        token,
        redirect_to: opts.redirect_to,
        return_to: opts.return_to,
      }),
    });
    setToken(result?.token || null);
    return result;
  },

  /** @param {string} [returnUrl] */
  redirectToLogin(returnUrl) {
    if (typeof window !== "undefined" && returnUrl) {
      const encoded = encodeURIComponent(returnUrl);
      window.location.assign(`/login?next=${encoded}`);
    }
  },
};

const admin = {
  async listUsers() {
    return request("/admin/users");
  },

  async listAuditLogs({ limit = 100, action = "", search = "", from = "", to = "" } = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (action) params.set("action", action);
    if (search) params.set("search", search);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return request(`/admin/audit-logs?${params.toString()}`);
  },

  /** @param {string} id @param {boolean} is_approved */
  async setApproval(id, is_approved) {
    return request(`/admin/users/${id}/approval`, {
      method: "PATCH",
      body: JSON.stringify({ is_approved }),
    });
  },

  /** @param {string} id @param {"admin" | "user"} role */
  async setRole(id, role) {
    return request(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },
};

const domains = {
  /** @param {string} id */
  async verify(id) {
    return request(`/domains/${id}/verify`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};

const linkTrees = {
  async list(sortBy = "-created_date", limit = 200) {
    const params = new URLSearchParams();
    params.set("sortBy", sortBy);
    params.set("limit", String(limit));
    return request(`/link-trees?${params.toString()}`);
  },

  /** @param {string} id */
  async get(id) {
    return request(`/link-trees/${id}`);
  },

  /** @param {Record<string, any>} data */
  async create(data) {
    return request("/link-trees", {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  /** @param {string} id @param {Record<string, any>} patch */
  async update(id, patch) {
    return request(`/link-trees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch || {}),
    });
  },

  /** @param {string} id */
  async delete(id) {
    return request(`/link-trees/${id}`, {
      method: "DELETE",
    });
  },

  /** @param {string} slug */
  async getPublic(slug) {
    return request(`/link-trees/public/${encodeURIComponent(slug)}`);
  },

  /**
   * @param {string} slug
   * @param {Record<string, any>} payload
   */
  async track(slug, payload) {
    return request(`/link-trees/public/${encodeURIComponent(slug)}/events`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
};

const settings = {
  async get() {
    return request("/settings");
  },

  async getQrDefault() {
    return request("/settings/qr-default");
  },

  async getGeneralDefaults() {
    return request("/settings/general-defaults");
  },

  /** @param {{ general?: Record<string, unknown>, nexus_sso?: Record<string, unknown>, qr_default?: Record<string, unknown>, event_webhook?: Record<string, unknown>, mcp_api?: Record<string, unknown> }} patch */
  async update(patch) {
    return request("/settings", {
      method: "PATCH",
      body: JSON.stringify(patch || {}),
    });
  },

  /** @param {string} webhookId */
  async testEventWebhook(webhookId) {
    return request("/settings/notifications/test", {
      method: "POST",
      body: JSON.stringify({ webhook_id: webhookId }),
    });
  },
};

const uploads = {
  /** @param {File} file */
  async logo(file) {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest("/uploads/logo", formData);
  },
};

const integrations = {
  Core: {
    /** @param {File} file */
    async UploadFile(file) {
      if (!file || typeof window === "undefined") {
        return { file_url: "" };
      }

      return uploads.logo(file);
    },
  },
};

const notifications = {
  async list(limit = 50) {
    return request(`/notifications?limit=${limit}`);
  },

  async unreadCount() {
    return request("/notifications/unread-count");
  },

  async poll(since) {
    const params = since ? `?since=${encodeURIComponent(since)}` : "";
    return request(`/notifications/poll${params}`);
  },

  async markRead(id) {
    return request(`/notifications/${id}/read`, { method: "PATCH" });
  },

  async markAllRead() {
    return request("/notifications/read-all", { method: "PATCH" });
  },
};

const users = {
  async directory() {
    return request("/users/directory");
  },
};

const teams = {
  async list() {
    return request("/teams");
  },

  async memberOptions() {
    return request("/teams/member-options");
  },

  async get(id) {
    return request(`/teams/${id}`);
  },

  async create(name, memberIds = []) {
    return request("/teams", {
      method: "POST",
      body: JSON.stringify({ name, member_ids: memberIds }),
    });
  },

  async rename(id, name) {
    return request(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  },

  async remove(id) {
    return request(`/teams/${id}`, { method: "DELETE" });
  },

  async addMember(id, email) {
    return request(`/teams/${id}/members`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async removeMember(id, userId) {
    return request(`/teams/${id}/members/${userId}`, { method: "DELETE" });
  },
};

const db = { auth, entities, integrations, admin, domains, linkTrees, settings, uploads, users, teams, notifications };

export { db, publicEntities };
export default db;
