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

- Build frontend: `npm run build` (output in `frontend/dist`)
- Deploy **`frontend/dist/`** to your web root, including **`.htaccess`** (required for React Router on Apache — see [docs/REACT_SPA_APACHE_HTACCESS.md](docs/REACT_SPA_APACHE_HTACCESS.md))
- Serve API: `cd backend && php artisan serve` or configure PHP-FPM/Nginx
- Point `VITE_API_BASE_URL` at your API `/api` path in production builds

## API

The React app talks to the Laravel API through `frontend/src/api/openClient.js`. All existing `/api/*` routes are preserved:

- Auth (`register`, `login`, `forgot-password`, `reset-password`, `me`)
- Entity CRUD (`/api/entities/{entity}/*`)
- Admin users and audit logs
- Nexus SSO verify
- Settings, domain verification, image proxy

## Herd

Because this project lives under `~/Herd/linkly`, you can also serve the Laravel backend through [Laravel Herd](https://herd.laravel.com) at `http://linkly.test` and set `VITE_DEV_API_TARGET=http://linkly.test` in `frontend/.env`.
