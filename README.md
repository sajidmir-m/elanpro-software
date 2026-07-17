# Report Automation Hub

Service Ticket Reporting Platform — a pnpm monorepo for uploading, analyzing, and reporting on service tickets.

Ships as a **native desktop application** (Electron) and deploys to **Vercel** for production hosting.

## Database & Auth: Supabase

| Component | Location |
|-----------|----------|
| Migrations | `supabase/migrations/` |
| Config | `supabase/config.toml` |
| Supabase client | `lib/supabase/` |
| Auth | Supabase Auth (JWT bearer tokens) |
| Profiles | `profiles` table linked to `auth.users` |

**Tables:** `profiles`, `uploads`, `active_tickets`, `closed_tickets`, `mrf_data`, `schedules`

## Stack

- pnpm workspaces, Node.js, TypeScript 5.9
- **Desktop:** Electron 35 + electron-builder (Windows/macOS/Linux installers)
- **Frontend:** React 19, Vite 7, Tailwind CSS 4, Supabase JS
- **API:** Express 5 (validates Supabase JWTs)
- **DB:** Supabase PostgreSQL
- **Validation:** Zod, OpenAPI codegen (Orval)

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Configure environment

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
# Also set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the frontend
```

### 3. Run migrations

```bash
supabase link --project-ref your-project-ref
pnpm run db:push
```

### 4. Seed admin user

```bash
pnpm run db:seed
```

Creates `admin@elanpro.net` / `Admin@1234` (admin).

### 5. Run locally

```bash
pnpm install

# API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Web UI (port 5173) — in another terminal
pnpm run dev:web
```

---

## Desktop Application

The desktop app wraps the same React UI in Electron with a native window, custom title bar, and installer packaging.

### Development

```bash
# Starts Vite + Electron together
pnpm run dev:desktop
```

### Production installer

1. Deploy the API (see below) and note the public URL.
2. Set `VITE_API_URL` in `.env` to your API origin (e.g. `https://report-automation-api.onrender.com`).
3. Build the installer:

```bash
pnpm run build:desktop
```

Output: `artifacts/desktop/release/` — Windows `.exe` (NSIS), macOS `.dmg`, Linux `.AppImage`.

| Variable | Required for desktop | Description |
|----------|---------------------|-------------|
| `VITE_API_URL` | Yes | Public API base URL (no trailing slash) |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `VITE_APP_TARGET` | Auto-set by build script | Set to `desktop` for Electron builds |

---

## Vercel Production Deployment

### Architecture

```
[Vercel — React SPA]  ──rewrite /api/*──▶  [Render/Railway — Express API]
         │                                           │
         └──────── Supabase Auth (browser) ──────────┘
                           │
                     [Supabase PostgreSQL]
```

The Express API runs as a long-lived Node process (Render, Railway, Fly.io). Vercel hosts the static frontend and proxies `/api/*` to your API host.

### Step 1 — Deploy API

**Option A — Render (recommended, `render.yaml` included):**

1. Connect repo to [Render](https://render.com).
2. Create a **Web Service** from `render.yaml`.
3. Set secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`.

**Option B — Railway / Fly.io:**

```bash
# Build & start
pnpm --filter @workspace/api-server run build
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Set env vars:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `PORT` | `8080` |
| `NODE_ENV` | `production` |

Health check: `GET /api/healthz`

### Step 2 — Deploy frontend to Vercel

1. Import the repo in [Vercel](https://vercel.com).
2. Framework preset: **Vite** (or use root `vercel.json`).
3. Set environment variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `API_ORIGIN` | Your API URL (e.g. `https://report-automation-api.onrender.com`) |
| `BASE_PATH` | `/` |

4. Deploy. The build runs `scripts/prepare-vercel.mjs` to inject `API_ORIGIN` into API rewrites.

**Alternative:** Set `VITE_API_URL` instead of using rewrites — the frontend will call the API directly (ensure `FRONTEND_URL` on the API includes your Vercel domain).

### Step 3 — Supabase auth

In **Supabase Dashboard → Authentication → URL Configuration**, add:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/**`

### Deploy via CLI

```bash
# Set API_ORIGIN in your shell or .env
export API_ORIGIN=https://your-api.onrender.com
pnpm run deploy:vercel
```

---

## Cloudflare Pages (alternative frontend)

| Setting | Value |
|---------|-------|
| Build command | `pnpm install && pnpm --filter @workspace/service-dashboard run build` |
| Output directory | `artifacts/service-dashboard/dist/public` |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `BASE_PATH=/` |

Proxy `/api/*` to your API origin. Or use `pnpm run deploy:pages`.

---

## Project structure

```
supabase/                 SQL migrations
artifacts/
  api-server/             Express REST API
  service-dashboard/      React UI
  desktop/                Electron desktop app + installers
lib/
  supabase/               Supabase clients + types
  api-spec/               OpenAPI spec
  api-zod/                Generated Zod types
  api-client-react/       Generated React Query hooks
scripts/                  Seed + Vercel prep scripts
vercel.json               Vercel production config
render.yaml               Render API deployment blueprint
.env.example              Environment template
```

## Useful commands

```bash
pnpm run typecheck                              # Full typecheck
pnpm run build                                  # Build all packages
pnpm run dev:web                                # Frontend dev server
pnpm run dev:desktop                            # Desktop app (dev)
pnpm run build:desktop                          # Desktop installer
pnpm run deploy:vercel                          # Deploy to Vercel
pnpm run deploy:pages                           # Deploy to Cloudflare Pages
pnpm run db:push                                # Apply Supabase migrations
pnpm run db:seed                                # Seed admin users
pnpm --filter @workspace/api-spec run codegen   # Regenerate API client
```
