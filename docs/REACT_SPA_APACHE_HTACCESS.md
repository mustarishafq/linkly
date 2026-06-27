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
[ ] npm run build completed successfully
[ ] dist/ or build/ contains .htaccess alongside index.html
[ ] Uploaded deploy folder includes hidden files (.htaccess)
[ ] Direct URL test: /login loads (not 404)
[ ] Refresh test: open /dashboard, press F5 — still loads
[ ] Static assets load: check Network tab for 200 on *.js and *.css
```

---

## Verify after deploy

1. Open the home page — should load.
2. Open `https://your-domain.com/login` directly — should show the login page, not Apache 404.
3. Log in, go to an inner route, **refresh** — should stay on that route.
4. In DevTools → Network, confirm JS/CSS requests return **200** (rewrite rules must not swallow asset paths).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 404 on `/login` but `/` works | Missing or not deployed `.htaccess` | Rebuild (`npm run build`), confirm `dist/.htaccess` exists, redeploy including hidden files |
| 404 on all routes including `/` | Wrong document root | Point vhost to `dist/` / `build/` folder |
| Blank page, assets 404 | Wrong `base` path or assets uploaded to wrong folder | Align Vite `base` with URL path; deploy full `dist/` |
| 500 Internal Server Error | `mod_rewrite` off or bad `.htaccess` syntax | Check Apache error log; confirm `RewriteEngine On` |
| Still 404 after adding file | `AllowOverride None` | Ask host to enable `.htaccess` or add rules in vhost config |

---

## Linkly reference

This repo ships the file at:

- Template (version controlled): `frontend/.htaccess`
- After build (deploy this): `frontend/dist/.htaccess`
- Build step: `vite build && cp .htaccess dist/.htaccess` in `frontend/package.json`

Production URL example: `https://linkly.emzinexus.com/login` — requires this file on the server.
