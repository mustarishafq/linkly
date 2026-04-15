# Linkly

Vite + React URL shortener dashboard backed by MySQL.

## Run Locally

### 1) Prerequisites

- Node.js 18+
- npm
- MySQL 8+

### 2) Install dependencies

```bash
npm install
```

### 3) Configure environment variables

Create `.env` in the project root:

```bash
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=linkly
PORT=8787
APP_TIMEZONE=UTC
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@linkly.dev
ADMIN_PASSWORD=admin12345
APP_BASE_URL=http://localhost:5173
APP_NAME=Linkly
BRAND_PRIMARY=#0f766e
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@linkly.dev
DEV_SHOW_RESET_TOKEN=false
VITE_APP_TIMEZONE=UTC
VITE_API_BASE_URL=/api
VITE_DEV_API_TARGET=http://localhost:8787
```

Set timezone values to your preferred IANA zone, for example `Asia/Kuala_Lumpur` or `America/New_York`.

Create the database once:

```sql
CREATE DATABASE IF NOT EXISTS linkly;
```

### 4) Start frontend + API in development

```bash
npm run dev:full
```

This starts:

- Vite frontend on `http://localhost:5173`
- Express + MySQL API on `http://localhost:8787`

Default seeded admin credentials are taken from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 5) Start only frontend (optional)

```bash
npm run dev
```

Use this if your API already runs separately.

### 6) Optional production preview

```bash
npm run build
npm run preview
```

## Run In Cloud

Deploy frontend + API where MySQL connectivity is available.

### Build settings

- Frontend build command: `npm run build`
- Frontend output directory: `dist`
- API start command: `npm run start`

### Deployment flow

1. Provision a MySQL database.
2. Set `MYSQL_*` and `PORT` environment variables.
3. Deploy API service with `npm run start`.
4. Deploy frontend static build (`dist`) and set `VITE_API_BASE_URL` to API URL with `/api` path.

## Data Layer

The app uses `src/api/openClient.js` and `server/index.js`.

- Entity CRUD (`list`, `filter`, `get`, `create`, `bulkCreate`, `update`, `delete`) is persisted in MySQL.
- Auth API is provided through the same `db.auth.*` interface used by the app.
- File upload API is provided via `db.integrations.Core.UploadFile` with object URLs.

## Custom Domains

Users can now register custom domains in the `Domains` page and select one per link when creating/editing links.

- Register domain in app: `Domains` page.
- Select domain in link form: `Short Domain` dropdown.
- Generated short URL format: `https://your-domain.com/r/slug`.

Important DNS and hosting requirements:

1. Your custom domain must point to the same frontend host serving this app.
2. Your hosting/reverse-proxy must accept that domain on HTTPS (certificate/SNI configured).
3. Keep `/r/:slug` route available on that domain.

Without DNS + TLS mapping, the domain can be saved in app but redirects will not work publicly.

### DNS TXT Verification

Custom domain verification now supports DNS TXT checks.

Steps:

1. Open `Domains` page.
2. Copy the generated TXT `Name` and `Value` for your domain.
3. Add that TXT record in your DNS provider.
4. Click `Verify DNS` in the app.

Default TXT name format:

- `_linkly.your-domain.com`

TXT value format:

- `linkly-verification=<token>`

Notes:

- DNS propagation can take several minutes (sometimes longer).
- If verification is pending, retry `Verify DNS` after propagation.

### Setting Up With Cloudflare

Cloudflare is the recommended DNS provider. Steps to configure your domain:

#### 1. Add site to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a Site** → enter your domain → choose Free plan.
2. Cloudflare scans existing DNS records, then provides 2 nameservers (e.g. `aria.ns.cloudflare.com`).
3. Go to your domain registrar and replace the existing nameservers with the ones Cloudflare provides.

#### 2. Add the TXT verification record

In Cloudflare → **DNS** → **Add record**:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_linkly` |
| Content | `linkly-verification=<your-token>` (copy from the Domains page) |
| TTL | Auto |

#### 3. Point the domain to your app server

Depending on where the app is hosted, add one of the following:

| Hosting | Type | Name | Value |
|---|---|---|---|
| VPS with static IP | `A` | `@` | your server IP |
| Vercel | `CNAME` | `@` | `cname.vercel-dns.com` |
| Netlify | `CNAME` | `@` | `<your-site>.netlify.app` |
| Subdomain only | `CNAME` | `links` (or your subdomain) | your host target |

**Note:** Cloudflare proxying (orange cloud) can be enabled for performance/DDoS protection, but TLS must be configured on the origin server first.

#### 4. Verify in app

After DNS propagation (typically 2–15 minutes):

1. Go back to the Linkly app → **Domains**.
2. Click **Verify DNS** next to your domain.
3. Status will change from **DNS Pending** to **DNS Verified**.

## Auth And Approval Flow

1. User registers from `/register`.
2. Account is created with `is_approved = false`.
3. User cannot login until admin approval.
4. Admin logs in and opens `/users`.
5. Admin approves user access.
6. Approved user can login from `/login`.

## Password Reset Email

- `POST /api/auth/forgot-password` now generates a reset token and sends a reset link by email.
- Configure SMTP variables (`SMTP_*`) to enable sending.
- Customize email branding with `APP_NAME` and `BRAND_PRIMARY`.
- Without SMTP config, reset links are logged on the API console for development.
- `DEV_SHOW_RESET_TOKEN=true` can expose token in API response for local testing only.

## Audit Logs

- User registration, approval/revocation, role changes, and password reset events are written to `audit_logs`.
- Admin can review recent logs in `/users`.
- Admin page supports filtering logs by action, actor/target/email search, and date range.

No proprietary SDK or vendor Vite plugin is required.
