# Linkly

Monorepo with a Vite + React frontend and a Laravel API backend backed by MySQL.

## Project structure

```
linkly/
├── frontend/     # React dashboard (Vite)
├── backend/      # Laravel API
└── docs/         # Project documentation
```

## Run locally

### Prerequisites

- Node.js 18+
- PHP 8.2+ (Laravel Herd works well)
- Composer
- MySQL 8+

### 1) Install dependencies

```bash
npm run install:all
```

### 2) Configure environment

**Backend** — copy and edit `backend/.env`:

```bash
cp backend/.env.example backend/.env
php artisan key:generate --ansi
```

Key variables:

```bash
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=linkly
DB_USERNAME=root
DB_PASSWORD=your_password

JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=admin@linkly.dev
ADMIN_PASSWORD=admin12345
APP_BASE_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
APP_TIMEZONE=UTC
```

**Frontend** — copy and edit `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

```bash
VITE_API_BASE_URL=/api
VITE_DEV_API_TARGET=http://127.0.0.1:8787
VITE_APP_TIMEZONE=UTC
```

Create the database once:

```sql
CREATE DATABASE IF NOT EXISTS linkly;
```

### 3) Migrate and seed

```bash
npm run migrate
npm run seed
```

### 4) Start frontend + API

```bash
npm run dev
```

This starts:

- Vite frontend on `http://localhost:5173`
- Laravel API on `http://localhost:8787`

Default admin credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`.

### Individual services

```bash
npm run dev:frontend   # frontend only
npm run dev:api        # Laravel API only
```

## Production

### Split domains (SPA + API on different hosts)

Example: frontend `linkly.emzinexus.com`, API `linklyapi.emzinexus.com`.

**Do not** use `VITE_API_BASE_URL=/api` in production when the frontend and API are on different domains — the SPA `.htaccess` will return `index.html` for `/api/*` and login will fail with HTML instead of JSON.

**Frontend** — before building:

```bash
cp frontend/.env.production.example frontend/.env.production
# edit VITE_API_BASE_URL if your API host differs
npm run build
```

`frontend/.env.production` must include:

```bash
VITE_API_BASE_URL=https://linklyapi.emzinexus.com/api
```

**Backend** — in `backend/.env`:

```bash
APP_URL=https://linklyapi.emzinexus.com
APP_BASE_URL=https://linkly.emzinexus.com
FRONTEND_URL=https://linkly.emzinexus.com
```

`FRONTEND_URL` is used for CORS; the browser must be allowed to call the API from the SPA origin.

### Deploy

- Build frontend: `npm run build` (output in `frontend/dist`)
- Deploy **`frontend/dist/`** to the frontend web root, including **`.htaccess`** (see [docs/REACT_SPA_APACHE_HTACCESS.md](docs/REACT_SPA_APACHE_HTACCESS.md) for `.htaccess` and split-domain API setup)
- Deploy Laravel `backend/` with document root `backend/public` on the API host

## API

The React app talks to the Laravel API through `frontend/src/api/openClient.js`. All existing `/api/*` routes are preserved:

- Auth (`register`, `login`, `forgot-password`, `reset-password`, `me`)
- Entity CRUD (`/api/entities/{entity}/*`)
- Admin users and audit logs
- Nexus SSO verify
- Settings, domain verification, image proxy

## Herd

Because this project lives under `~/Herd/linkly`, you can also serve the Laravel backend through [Laravel Herd](https://herd.laravel.com) at `http://linkly.test` and set `VITE_DEV_API_TARGET=http://linkly.test` in `frontend/.env`.
