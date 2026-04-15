import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dns from "node:dns/promises";
import { ensureSchema, query } from "./db.js";

const appTimezone = process.env.APP_TIMEZONE || "UTC";
process.env.TZ = appTimezone;

const app = express();
const port = Number(process.env.PORT || 8787);
const jwtSecret = process.env.JWT_SECRET || "change-me-in-production";
const adminEmail = process.env.ADMIN_EMAIL || "admin@linkly.dev";
const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
const appName = process.env.APP_NAME || "Linkly";
const brandPrimary = process.env.BRAND_PRIMARY || "#0f766e";
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "no-reply@linkly.dev";
const showResetTokenInResponse = String(process.env.DEV_SHOW_RESET_TOKEN || "false") === "true";
const domainVerifyPrefix = process.env.DOMAIN_VERIFY_PREFIX || "_linkly";

const ENTITY_NAMES = [
  "ABVariant",
  "Campaign",
  "ClickLog",
  "CustomDomain",
  "QRDesign",
  "RedirectRule",
  "ShortLink",
];

app.use(cors());
app.use(express.json({ limit: "2mb" }));

let mailer = null;
if (smtpHost && smtpUser && smtpPass) {
  mailer = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

function toSafeUser(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    is_approved: Boolean(row.is_approved),
    created_date: new Date(row.created_date).toISOString(),
    updated_date: new Date(row.updated_date).toISOString(),
  };
}

function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

function readBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}

async function authRequired(req, res, next) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return res.status(401).json({ code: "auth_required", message: "Authentication required" });
    }

    const payload = jwt.verify(token, jwtSecret);
    const rows = await query(
      "SELECT id, email, full_name, role, is_approved, created_date, updated_date FROM users WHERE id = ? LIMIT 1",
      [payload.sub]
    );

    if (!rows.length) {
      return res.status(401).json({ code: "auth_required", message: "Invalid token" });
    }

    const user = rows[0];
    if (!user.is_approved) {
      return res.status(403).json({ code: "pending_approval", message: "Account pending admin approval" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ code: "auth_required", message: "Invalid token" });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ code: "forbidden", message: "Admin access required" });
  }
  next();
}

async function writeAuditLog({ actor_user_id = null, action, target_user_id = null, details = null }) {
  await query(
    `INSERT INTO audit_logs (id, actor_user_id, action, target_user_id, details, created_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      generateId(),
      actor_user_id,
      action,
      target_user_id,
      details ? JSON.stringify(details) : null,
      nowSqlDate(),
    ]
  );
}

async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${appBaseUrl}/forgot-password?token=${encodeURIComponent(resetToken)}`;
  const html = `
  <div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:20px 24px;background:${brandPrimary};color:#ffffff;font-size:20px;font-weight:700;">
          ${appName}
        </td>
      </tr>
      <tr>
        <td style="padding:24px;">
          <h2 style="margin:0 0 12px;font-size:20px;color:#0f172a;">Reset your password</h2>
          <p style="margin:0 0 16px;line-height:1.5;color:#334155;">We received a request to reset your ${appName} password. This link expires in 1 hour.</p>
          <p style="margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:${brandPrimary};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">Reset Password</a>
          </p>
          <p style="margin:0 0 8px;line-height:1.5;color:#475569;">If the button does not work, copy this URL:</p>
          <p style="margin:0;word-break:break-all;color:#0f766e;">${resetUrl}</p>
        </td>
      </tr>
    </table>
  </div>`;

  if (!mailer) {
    console.log(`[reset-email] ${email} -> ${resetUrl}`);
    return;
  }

  await mailer.sendMail({
    from: smtpFrom,
    to: email,
    subject: `Reset your ${appName} password`,
    text: `Use this link to reset your ${appName} password: ${resetUrl}`,
    html,
  });
}

function toTable(entity) {
  if (!ENTITY_NAMES.includes(entity)) {
    return null;
  }
  return `entity_${entity.toLowerCase()}`;
}

function toSqlDateInTimezone(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = get("hour");
  const minute = get("minute");
  const second = get("second");
  const ms = String(date.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${ms}`;
}

function nowSqlDate() {
  return toSqlDateInTimezone(new Date());
}

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeHostname(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).hostname.toLowerCase();
  } catch {
    return raw.replace(/\/$/, "");
  }
}

function parsePayload(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function flattenTxtRecords(records = []) {
  return records
    .map((entry) => (Array.isArray(entry) ? entry.join("") : String(entry || "")))
    .filter(Boolean);
}

async function verifyDomainTxt(hostname, verificationValue) {
  const targets = [`${domainVerifyPrefix}.${hostname}`, hostname];
  let lastError = null;

  for (const target of targets) {
    try {
      const records = await dns.resolveTxt(target);
      const flattened = flattenTxtRecords(records);
      const matched = flattened.some((txt) => txt.trim() === verificationValue);

      if (matched) {
        return {
          verified: true,
          checked_host: target,
          records: flattened,
        };
      }
    } catch (error) {
      lastError = error;
    }
  }

  return {
    verified: false,
    checked_host: `${domainVerifyPrefix}.${hostname}`,
    error: lastError?.code || lastError?.message || "TXT record not found",
  };
}

function sortRecords(records, sortBy) {
  if (!sortBy) return records;

  const desc = sortBy.startsWith("-");
  const field = desc ? sortBy.slice(1) : sortBy;

  return [...records].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];

    if (av == null && bv == null) return 0;
    if (av == null) return desc ? 1 : -1;
    if (bv == null) return desc ? -1 : 1;

    if (typeof av === "number" && typeof bv === "number") {
      return desc ? bv - av : av - bv;
    }

    const cmp = String(av).localeCompare(String(bv));
    return desc ? -cmp : cmp;
  });
}

function applyLimit(records, limit) {
  const max = Number(limit || 0);
  if (!Number.isFinite(max) || max <= 0) return records;
  return records.slice(0, max);
}

function matchesWhere(row, where = {}) {
  return Object.entries(where).every(([key, expected]) => {
    const actual = row?.[key];
    if (Array.isArray(expected)) {
      return expected.includes(actual);
    }
    return actual === expected;
  });
}

async function fetchAll(table) {
  const rows = await query(`SELECT id, payload, created_date, updated_date FROM \`${table}\``);
  return rows.map((row) => {
    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    return {
      id: row.id,
      created_date: new Date(row.created_date).toISOString(),
      updated_date: new Date(row.updated_date).toISOString(),
      ...payload,
    };
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/image-proxy", async (req, res) => {
  try {
    const rawUrl = String(req.query.url || "").trim();
    if (!rawUrl) {
      return res.status(400).json({ code: "invalid_input", message: "url query parameter is required" });
    }

    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return res.status(400).json({ code: "invalid_url", message: "Invalid image URL" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ code: "invalid_url", message: "Only http/https URLs are allowed" });
    }

    const upstream = await fetch(parsed.toString(), { redirect: "follow" });
    if (!upstream.ok) {
      return res.status(502).json({ code: "upstream_error", message: `Image fetch failed: ${upstream.status}` });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const bytes = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(bytes);
  } catch (error) {
    console.error("Image proxy error:", error);
    return res.status(500).json({ code: "proxy_error", message: "Failed to proxy image" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const fullName = String(req.body?.full_name || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !fullName || password.length < 6) {
    return res.status(400).json({
      code: "invalid_input",
      message: "Name, email, and password (min 6 chars) are required",
    });
  }

  const existing = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existing.length) {
    return res.status(409).json({ code: "email_exists", message: "Email already registered" });
  }

  const id = generateId();
  const passwordHash = await bcrypt.hash(password, 10);
  const now = nowSqlDate();

  await query(
    `INSERT INTO users (id, email, full_name, password_hash, role, is_approved, created_date, updated_date)
     VALUES (?, ?, ?, ?, 'user', 0, ?, ?)`,
    [id, email, fullName, passwordHash, now, now]
  );

  await writeAuditLog({
    action: "user_registered",
    target_user_id: id,
    details: { email },
  });

  return res.status(201).json({
    message: "Registration successful. Please wait for admin approval before login.",
  });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ code: "invalid_input", message: "Email and password are required" });
  }

  const rows = await query(
    "SELECT id, email, full_name, password_hash, role, is_approved, created_date, updated_date FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (!rows.length) {
    return res.status(401).json({ code: "invalid_credentials", message: "Invalid email or password" });
  }

  const user = rows[0];
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ code: "invalid_credentials", message: "Invalid email or password" });
  }

  if (!user.is_approved) {
    return res.status(403).json({ code: "pending_approval", message: "Account pending admin approval" });
  }

  const safeUser = toSafeUser(user);
  const token = issueToken(safeUser);
  return res.json({ token, user: safeUser });
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ code: "invalid_input", message: "Email is required" });
  }

  const rows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (rows.length) {
    const resetToken = generateId();
    const userId = rows[0].id;
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await query("UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?", [
      resetToken,
      toSqlDateInTimezone(expires),
      userId,
    ]);

    await sendPasswordResetEmail(email, resetToken);
    await writeAuditLog({
      action: "password_reset_requested",
      target_user_id: userId,
      details: { email },
    });

    const payload = { message: "If account exists, reset instructions were generated" };
    if (showResetTokenInResponse) {
      payload.reset_token = resetToken;
    }
    return res.json(payload);
  }

  return res.json({ message: "If account exists, reset instructions were generated" });
});

app.post("/api/auth/reset-password", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");

  if (!token || password.length < 6) {
    return res.status(400).json({ code: "invalid_input", message: "Token and valid password are required" });
  }

  const rows = await query(
    "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires IS NOT NULL AND reset_token_expires > NOW() LIMIT 1",
    [token]
  );

  if (!rows.length) {
    return res.status(400).json({ code: "invalid_token", message: "Reset token is invalid or expired" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, updated_date = ? WHERE id = ?",
    [passwordHash, nowSqlDate(), rows[0].id]
  );

  await writeAuditLog({
    action: "password_reset_completed",
    target_user_id: rows[0].id,
  });

  return res.json({ message: "Password has been reset" });
});

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json(toSafeUser(req.user));
});

app.get("/api/admin/users", authRequired, adminRequired, async (_req, res) => {
  const users = await query(
    "SELECT id, email, full_name, role, is_approved, created_date, updated_date FROM users ORDER BY created_date DESC"
  );
  res.json(users.map((user) => toSafeUser(user)));
});

app.patch("/api/admin/users/:id/approval", authRequired, adminRequired, async (req, res) => {
  const isApproved = Boolean(req.body?.is_approved);
  await query("UPDATE users SET is_approved = ?, updated_date = ? WHERE id = ?", [
    isApproved ? 1 : 0,
    nowSqlDate(),
    req.params.id,
  ]);
  await writeAuditLog({
    actor_user_id: req.user.id,
    action: isApproved ? "user_approved" : "user_approval_revoked",
    target_user_id: req.params.id,
  });
  res.json({ ok: true });
});

app.patch("/api/admin/users/:id/role", authRequired, adminRequired, async (req, res) => {
  const role = req.body?.role === "admin" ? "admin" : "user";
  await query("UPDATE users SET role = ?, updated_date = ? WHERE id = ?", [role, nowSqlDate(), req.params.id]);
  await writeAuditLog({
    actor_user_id: req.user.id,
    action: "user_role_changed",
    target_user_id: req.params.id,
    details: { role },
  });
  res.json({ ok: true });
});

app.get("/api/admin/audit-logs", authRequired, adminRequired, async (req, res) => {
  try {
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(Math.floor(requestedLimit), 500))
      : 100;
    const action = String(req.query.action || "").trim();
    const search = String(req.query.search || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const conditions = [];
    const params = [];

    if (action) {
      conditions.push("action = ?");
      params.push(action);
    }

    if (from) {
      conditions.push("created_date >= ?");
      params.push(from);
    }

    if (to) {
      conditions.push("created_date <= ?");
      params.push(to);
    }

    if (search) {
      conditions.push(
        "(actor_user_id LIKE ? OR target_user_id LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(details, '$.email')) LIKE ?)"
      );
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await query(
      `SELECT id, actor_user_id, action, target_user_id, details, created_date
       FROM audit_logs
       ${whereClause}
       ORDER BY created_date DESC
       LIMIT ${limit}`,
      params
    );

    const userIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.actor_user_id, row.target_user_id])
          .filter(Boolean)
      ),
    ];

    let userMap = new Map();
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => "?").join(",");
      const users = await query(
        `SELECT id, full_name, email FROM users WHERE id IN (${placeholders})`,
        userIds
      );
      userMap = new Map(users.map((user) => [user.id, user]));
    }

    const normalized = rows.map((row) => ({
      ...row,
      details: typeof row.details === "string" ? JSON.parse(row.details) : row.details,
      created_date: new Date(row.created_date).toISOString(),
      actor_label: row.actor_user_id
        ? (userMap.get(row.actor_user_id)?.full_name || userMap.get(row.actor_user_id)?.email || row.actor_user_id)
        : "system",
      target_label: row.target_user_id
        ? (userMap.get(row.target_user_id)?.full_name || userMap.get(row.target_user_id)?.email || row.target_user_id)
        : "-",
    }));

    res.json({
      timezone: appTimezone,
      logs: normalized,
    });
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    res.status(500).json({ code: "audit_logs_error", message: "Failed to fetch audit logs" });
  }
});

app.post("/api/domains/:id/verify", authRequired, async (req, res) => {
  const domainId = String(req.params.id || "").trim();
  if (!domainId) {
    return res.status(400).json({ code: "invalid_input", message: "Domain ID is required" });
  }

  const rows = await query(
    "SELECT id, payload, created_date, updated_date FROM `entity_customdomain` WHERE id = ? LIMIT 1",
    [domainId]
  );

  if (!rows.length) {
    return res.status(404).json({ code: "not_found", message: "Domain not found" });
  }

  const row = rows[0];
  const payload = parsePayload(row.payload);

  if (
    req.user.role !== "admin" &&
    payload.owner_user_id &&
    String(payload.owner_user_id) !== String(req.user.id)
  ) {
    return res.status(403).json({ code: "forbidden", message: "You cannot verify this domain" });
  }

  const domain = normalizeHostname(payload.domain);
  if (!domain) {
    return res.status(400).json({ code: "invalid_input", message: "Invalid domain value" });
  }

  const token = String(payload.verification_token || generateId().replace(/[^a-zA-Z0-9]/g, "").slice(0, 24));
  const verificationName = `${domainVerifyPrefix}.${domain}`;
  const verificationValue = `linkly-verification=${token}`;

  const verification = await verifyDomainTxt(domain, verificationValue);

  const updatedPayload = {
    ...payload,
    domain,
    verification_token: token,
    verification_name: verificationName,
    verification_value: verificationValue,
    verification_status: verification.verified ? "verified" : "pending",
    verification_error: verification.verified ? null : verification.error,
    verification_checked_host: verification.checked_host,
    verification_last_checked_date: new Date().toISOString(),
    verification_verified_date: verification.verified
      ? (payload.verification_verified_date || new Date().toISOString())
      : payload.verification_verified_date || null,
  };

  await query("UPDATE `entity_customdomain` SET payload = ?, updated_date = ? WHERE id = ?", [
    JSON.stringify(updatedPayload),
    nowSqlDate(),
    domainId,
  ]);

  return res.json({
    id: row.id,
    created_date: new Date(row.created_date).toISOString(),
    updated_date: new Date().toISOString(),
    ...updatedPayload,
    verified: verification.verified,
  });
});

app.post("/api/entities/:entity/list", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const { sortBy = "-created_date", limit = 200 } = req.body || {};
  const all = await fetchAll(table);
  const rows = applyLimit(sortRecords(all, sortBy), limit);
  res.json(rows);
});

app.post("/api/entities/:entity/filter", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const { where = {}, sortBy = "-created_date", limit = 200 } = req.body || {};
  const all = await fetchAll(table);
  const rows = applyLimit(sortRecords(all.filter((r) => matchesWhere(r, where)), sortBy), limit);
  res.json(rows);
});

app.get("/api/entities/:entity/:id", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const rows = await query(`SELECT id, payload, created_date, updated_date FROM \`${table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
  if (!rows.length) return res.json(null);

  const row = rows[0];
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  res.json({
    id: row.id,
    created_date: new Date(row.created_date).toISOString(),
    updated_date: new Date(row.updated_date).toISOString(),
    ...payload,
  });
});

app.post("/api/entities/:entity", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const now = nowSqlDate();
  const record = {
    id: generateId(),
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
    ...(req.body || {}),
  };

  const payload = { ...record };
  delete payload.id;
  delete payload.created_date;
  delete payload.updated_date;

  await query(
    `INSERT INTO \`${table}\` (id, payload, created_date, updated_date) VALUES (?, ?, ?, ?)`,
    [record.id, JSON.stringify(payload), now, now]
  );

  res.json(record);
});

app.post("/api/entities/:entity/bulk", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const created = [];

  for (const item of items) {
    const now = nowSqlDate();
    const record = {
      id: generateId(),
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...item,
    };

    const payload = { ...record };
    delete payload.id;
    delete payload.created_date;
    delete payload.updated_date;

    await query(
      `INSERT INTO \`${table}\` (id, payload, created_date, updated_date) VALUES (?, ?, ?, ?)`,
      [record.id, JSON.stringify(payload), now, now]
    );

    created.push(record);
  }

  res.json(created);
});

app.patch("/api/entities/:entity/:id", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const rows = await query(`SELECT id, payload, created_date, updated_date FROM \`${table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
  if (!rows.length) return res.json(null);

  const row = rows[0];
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
  const updated = {
    id: row.id,
    created_date: new Date(row.created_date).toISOString(),
    updated_date: new Date().toISOString(),
    ...payload,
    ...(req.body || {}),
  };

  const nextPayload = { ...updated };
  delete nextPayload.id;
  delete nextPayload.created_date;
  delete nextPayload.updated_date;

  await query(`UPDATE \`${table}\` SET payload = ?, updated_date = ? WHERE id = ?`, [
    JSON.stringify(nextPayload),
    nowSqlDate(),
    req.params.id,
  ]);

  res.json(updated);
});

app.delete("/api/entities/:entity/:id", async (req, res) => {
  const table = toTable(req.params.entity);
  if (!table) return res.status(404).json({ message: "Unknown entity" });

  const rows = await query(`SELECT id, payload, created_date, updated_date FROM \`${table}\` WHERE id = ? LIMIT 1`, [req.params.id]);
  if (!rows.length) return res.json(null);

  const row = rows[0];
  const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;

  await query(`DELETE FROM \`${table}\` WHERE id = ?`, [req.params.id]);

  res.json({
    id: row.id,
    created_date: new Date(row.created_date).toISOString(),
    updated_date: new Date(row.updated_date).toISOString(),
    ...payload,
  });
});

async function start() {
  await query(
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      full_name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
      is_approved TINYINT(1) NOT NULL DEFAULT 0,
      reset_token VARCHAR(128) NULL,
      reset_token_expires DATETIME NULL,
      created_date DATETIME(3) NOT NULL,
      updated_date DATETIME(3) NOT NULL,
      INDEX idx_users_email (email),
      INDEX idx_users_approval (is_approved)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      actor_user_id VARCHAR(64) NULL,
      action VARCHAR(80) NOT NULL,
      target_user_id VARCHAR(64) NULL,
      details JSON NULL,
      created_date DATETIME(3) NOT NULL,
      INDEX idx_audit_created_date (created_date),
      INDEX idx_audit_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  const adminRows = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail.toLowerCase()]);
  if (!adminRows.length) {
    const now = nowSqlDate();
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await query(
      `INSERT INTO users (id, email, full_name, password_hash, role, is_approved, created_date, updated_date)
       VALUES (?, ?, ?, ?, 'admin', 1, ?, ?)`,
      [generateId(), adminEmail.toLowerCase(), "System Admin", passwordHash, now, now]
    );
    console.log(`Seeded admin user: ${adminEmail}`);
  }

  await ensureSchema(ENTITY_NAMES);
  app.listen(port, () => {
    console.log(`MySQL API running on http://localhost:${port}`);
    console.log(`Timezone: ${appTimezone}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
