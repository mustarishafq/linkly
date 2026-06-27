# React SPA on Apache — `.htaccess` checklist

Use this checklist whenever you deploy a **Vite** or **Create React App** project with **React Router** (`BrowserRouter`) to **Apache** (shared hosting, cPanel, or similar).

Direct visits and refreshes on routes like `/login`, `/settings`, or `/links/abc` will **404** unless the server serves `index.html` for paths that are not real files.

---

## Why this happens

React Router handles routes in the browser **after** `index.html` loads.

| Action | What Apache does without rewrite rules |
|--------|----------------------------------------|
| Open `https://app.example.com/` | Serves `index.html` — works |
| Click **Login** in the app | Client router changes URL — works |
| Refresh on `/login` or open `/login` in a new tab | Apache looks for a file/folder named `login` — **404** |

---

## Fix (Apache + `.htaccess`)

### 1. Add `.htaccess` for production (not in `public/`)

`.htaccess` is a **deployment-only** file. It belongs in the build output (`dist/`), not in Vite's `public/` folder (which is for static assets served in dev and copied as-is).

| Stack | Source template | Build output |
|-------|-----------------|--------------|
| **Vite (this repo)** | `frontend/.htaccess` | `frontend/dist/.htaccess` via post-build copy |
| **Vite (generic)** | `frontend/.htaccess` + `"build": "vite build && cp .htaccess dist/.htaccess"` | `frontend/dist/.htaccess` |
| **Create React App** | `public/.htaccess` (CRA copies `public/` to `build/`) | `build/.htaccess` |

**Standard `.htaccess` for a SPA at the domain root:**

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Serve existing files and directories as-is (JS, CSS, images, etc.)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # All other paths fall back to index.html for client-side routing
  RewriteRule ^ index.html [L]
</IfModule>
```

### 2. Deploy the **build output**, not the source folder

- Vite: upload contents of `frontend/dist/` (must include `.htaccess` and `index.html`)
- CRA: upload contents of `build/`

### 3. Confirm Apache allows overrides

`.htaccess` only works if the vhost allows `AllowOverride` (usually `All` or at least `FileInfo`). On most shared hosts this is already enabled for `public_html`.

Required modules (normally present):

- `mod_rewrite`

---

## Split domains (SPA + API on different hosts)

When the React app and Laravel API live on **different subdomains**, you must point the frontend build at the API host. Using the local dev default `VITE_API_BASE_URL=/api` in production will break auth and data loading.

### Why login returns HTML instead of JSON

With `.htaccess` in place, any request to the **frontend** host that is not a real file falls back to `index.html`:

| Request | Host | Result |
|---------|------|--------|
| `GET /login` | `linkly.emzinexus.com` | `index.html` — correct (React Router handles `/login`) |
| `POST /api/auth/login` | `linkly.emzinexus.com` | `index.html` — **wrong** (API expected JSON) |
| `POST /api/auth/login` | `linklyapi.emzinexus.com` | JSON — correct |

Symptoms after login: dashboard fails to load, Network tab shows `200` with `text/html` on `/api/*` requests, or errors like “API returned HTML instead of JSON”.

### Linkly production example

| Role | URL |
|------|-----|
| Frontend (SPA) | `https://linkly.emzinexus.com` |
| Backend (Laravel API) | `https://linklyapi.emzinexus.com` |

### Frontend — set API URL in `.env` before build

**Do not** deploy a build that still uses `/api` on the SPA domain.

Edit `frontend/.env` with production values, then build and deploy `frontend/dist/` to the **frontend** host only:

```bash
# frontend/.env
VITE_APP_TIMEZONE=UTC
VITE_API_BASE_URL=https://linklyapi.emzinexus.com/api
VITE_NEXUS_BRAIN_URL=https://emzinexus.com

npm run build
```

Vite bakes `VITE_*` values into the JS bundle at build time — changing server env after deploy does nothing until you rebuild.

For **local dev**, use `VITE_API_BASE_URL=/api` and `VITE_DEV_API_TARGET=http://127.0.0.1:8787` in the same file.

### Backend — CORS and app URLs

In `backend/.env` on the **API** server:

```bash
APP_URL=https://linklyapi.emzinexus.com
APP_BASE_URL=https://linkly.emzinexus.com
FRONTEND_URL=https://linkly.emzinexus.com
```

- `APP_URL` — public URL of the Laravel API
- `FRONTEND_URL` — allowed browser origin(s) for CORS on `/api/*` (comma-separated if multiple)
- `APP_BASE_URL` — used for links/emails pointing back to the SPA

After changing backend env:

```bash
php artisan config:clear
```

### Uploaded logos and `/storage/*` (split domains)

QR code logos are uploaded to the API and served from `https://your-api.example.com/storage/logos/...`. On split domains the SPA loads those images cross-origin (for canvas export), so the API host must expose CORS on static storage files — not only on `/api/*`.

**One-time on the API server** (after deploy or first clone):

```bash
cd backend
php artisan storage:link
```

This creates `public/storage` → `storage/app/public`. Without it, logo URLs return 404.

**Repo defaults (Apache):**

- `backend/public/.htaccess` — sets `Access-Control-Allow-Origin` for `/storage/*`
- `backend/storage/app/public/.htaccess` — same headers for files under the symlink target
- `backend/config/cors.php` — includes `storage/*` when requests are handled by Laravel

Ensure Apache **`mod_headers`** is enabled. After changing backend env or CORS config, run `php artisan config:clear`.

**Nginx** — add CORS on the storage location (example):

```nginx
location /storage/ {
    add_header Access-Control-Allow-Origin *;
    try_files $uri $uri/ =404;
}
```

The frontend also proxies cross-origin logo URLs through `GET /api/image-proxy` when needed (see `frontend/src/components/qr/QRCodePreview.jsx`). Rebuild the SPA after frontend changes: `npm run build`.

**Verify storage CORS:**

```bash
curl -sSI "https://linklyapi.emzinexus.com/storage/logos/example.png" | grep -i access-control
```

Expect `Access-Control-Allow-Origin: *` (or your SPA origin). A missing header causes browser errors like *No 'Access-Control-Allow-Origin' header* when editing QR designs with uploaded logos.

### Same-origin alternative (optional)

If you prefer `VITE_API_BASE_URL=/api` in production, serve **both** SPA and API from one domain (e.g. Nginx/Apache proxies `/api` to Laravel and everything else to `index.html`). That avoids cross-origin CORS but is a server config choice — not the default for split subdomains.

### Verify API URL after deploy

```bash
# Should return application/json (e.g. 401), not text/html
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" \
  -X POST https://linklyapi.emzinexus.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

In the browser DevTools → Network, login should call `https://linklyapi.emzinexus.com/api/auth/login`, not `https://linkly.emzinexus.com/api/...`.

---

## Subpath deployment (app not at domain root)

If the app lives at `https://example.com/myapp/` instead of the root:

1. Set Vite `base: '/myapp/'` in `vite.config.js`
2. Change `RewriteBase` and the fallback target:

```apache
RewriteBase /myapp/
RewriteRule ^ index.html [L]
```

---

## Nginx equivalent (if not using Apache)

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## Pre-deploy checklist

Copy this block into new project README or deployment notes:

```
[ ] React Router uses BrowserRouter (not HashRouter unless intentional)
[ ] .htaccess template at frontend/.htaccess (Vite) or public/.htaccess (CRA)
[ ] Vite build script copies .htaccess into dist/ after vite build
[ ] Split domains: frontend/.env sets VITE_API_BASE_URL to API host (not /api on SPA host)
[ ] Split domains: backend FRONTEND_URL matches SPA origin for CORS
[ ] API server: php artisan storage:link (logo uploads served from /storage/)
[ ] API server: Apache mod_headers enabled (CORS on /storage/* for QR logos)
[ ] npm run build completed successfully
[ ] dist/ or build/ contains .htaccess alongside index.html
[ ] Uploaded deploy folder includes hidden files (.htaccess)
[ ] Direct URL test: /login loads (not 404)
[ ] Refresh test: open /dashboard, press F5 — still loads
[ ] Login test: /api/* requests go to API subdomain and return JSON
[ ] Static assets load: check Network tab for 200 on *.js and *.css
```

---

## Verify after deploy

1. Open the home page — should load.
2. Open `https://your-domain.com/login` directly — should show the login page, not Apache 404.
3. Log in, go to an inner route, **refresh** — should stay on that route.
4. In DevTools → Network, confirm JS/CSS requests return **200** (rewrite rules must not swallow asset paths).
5. Log in and confirm API calls hit your **API host** (e.g. `linklyapi.emzinexus.com/api/...`) and return JSON.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 404 on `/login` but `/` works | Missing or not deployed `.htaccess` | Rebuild (`npm run build`), confirm `dist/.htaccess` exists, redeploy including hidden files |
| Login or API calls return HTML | `VITE_API_BASE_URL=/api` on split domains; SPA `.htaccess` serves `index.html` for `/api/*` | Set `VITE_API_BASE_URL=https://your-api.example.com/api` in `frontend/.env`, rebuild, redeploy |
| CORS error calling API | Backend `FRONTEND_URL` missing or wrong | Set `FRONTEND_URL=https://your-spa.example.com` in `backend/.env`, run `php artisan config:clear` |
| CORS error loading `/storage/logos/...` (QR logo) | Split domains: static files lack CORS headers, or `storage:link` missing | Run `php artisan storage:link`; confirm `backend/public/.htaccess` deployed; enable `mod_headers`; see [Uploaded logos and `/storage/*`](#uploaded-logos-and-storage-split-domains) |
| 404 on all routes including `/` | Wrong document root | Point vhost to `dist/` / `build/` folder |
| Blank page, assets 404 | Wrong `base` path or assets uploaded to wrong folder | Align Vite `base` with URL path; deploy full `dist/` |
| 500 Internal Server Error | `mod_rewrite` off or bad `.htaccess` syntax | Check Apache error log; confirm `RewriteEngine On` |
| Still 404 after adding file | `AllowOverride None` | Ask host to enable `.htaccess` or add rules in vhost config |

---

## Linkly reference

**`.htaccess`**

- Template (version controlled): `frontend/.htaccess`
- After build (deploy this): `frontend/dist/.htaccess`
- Build step: `vite build && cp .htaccess dist/.htaccess` in `frontend/package.json`

**Production URLs**

- Frontend: `https://linkly.emzinexus.com` — deploy `frontend/dist/`
- API: `https://linklyapi.emzinexus.com` — deploy Laravel with document root `backend/public`

**Env files**

- Frontend: `frontend/.env` — set `VITE_API_BASE_URL` before `npm run build` (see `frontend/.env.example`)
- Backend production vars: see `backend/.env.example` (`APP_URL`, `FRONTEND_URL`, `APP_BASE_URL`)
