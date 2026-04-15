const ENTITY_NAMES = [
  "ABVariant",
  "Campaign",
  "ClickLog",
  "CustomDomain",
  "QRDesign",
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

/**
 * @param {string} path
 * @param {RequestInit} [options]
 */
async function request(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = new Error(payload?.message || `Request failed: ${response.status}`);
    // @ts-ignore
    error.status = response.status;
    // @ts-ignore
    error.code = payload?.code;
    throw error;
  }

  return response.json();
}

/** @param {string} entityName */
function createEntityApi(entityName) {
  return {
    async list(sortBy = "-created_date", limit = 200) {
      return request(`/entities/${entityName}/list`, {
        method: "POST",
        body: JSON.stringify({ sortBy, limit }),
      });
    },

    async filter(where = {}, sortBy = "-created_date", limit = 200) {
      return request(`/entities/${entityName}/filter`, {
        method: "POST",
        body: JSON.stringify({ where, sortBy, limit }),
      });
    },

    /** @param {string} id */
    async get(id) {
      return request(`/entities/${entityName}/${id}`);
    },

    /** @param {Record<string, any>} data */
    async create(data) {
      return request(`/entities/${entityName}`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      });
    },

    /** @param {Record<string, any>[]} [items] */
    async bulkCreate(items = []) {
      return request(`/entities/${entityName}/bulk`, {
        method: "POST",
        body: JSON.stringify({ items: Array.isArray(items) ? items : [] }),
      });
    },

    /** @param {string} id @param {Record<string, any>} patch */
    async update(id, patch) {
      return request(`/entities/${entityName}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch || {}),
      });
    },

    /** @param {string} id */
    async delete(id) {
      return request(`/entities/${entityName}/${id}`, {
        method: "DELETE",
      });
    },
  };
}

const entities = new Proxy(
  {},
  {
    get: (_, entityName) => {
      const normalizedName = String(entityName);
      if (!ENTITY_NAMES.includes(normalizedName)) {
        return createEntityApi(normalizedName);
      }
      return createEntityApi(normalizedName);
    },
  }
);

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

const integrations = {
  Core: {
    /** @param {File} file */
    async UploadFile(file) {
      if (!file || typeof window === "undefined") {
        return { file_url: "" };
      }

      const fileUrl = URL.createObjectURL(file);
      return { file_url: fileUrl };
    },
  },
};

const db = { auth, entities, integrations, admin, domains };

export { db };
export default db;
