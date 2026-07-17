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

1. Deploy to Vercel (see below) and note your app URL.
2. Set `VITE_API_URL` in `.env` to your Vercel URL (e.g. `https://your-app.vercel.app`).
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

## Deploy on Vercel (frontend + API together)

Everything runs on **one Vercel project** — React UI and Express API on the same domain.

```
https://your-app.vercel.app          → React dashboard
https://your-app.vercel.app/api/*    → Express API (serverless)
                              ↓
                      Supabase PostgreSQL
```

No Render or Railway needed.

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

Do **not** commit `.env` (secrets stay in Vercel dashboard only).

### Step 2 — Import project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. **Import** your GitHub repository
3. Vercel reads root `vercel.json` automatically — leave defaults:
   - **Framework:** Vite
   - **Build Command:** `pnpm --filter @workspace/service-dashboard run build`
   - **Output Directory:** `public` (auto-synced from the Vite build)
   - **Install Command:** `pnpm install`

### Step 3 — Add environment variables

In Vercel → Project → **Settings → Environment Variables**, add:

| Variable | Value | Environments |
|----------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase **anon** key | Production, Preview, Development |
| `SUPABASE_URL` | Same Supabase project URL | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase **service_role** key | Production, Preview, Development |
| `NODE_ENV` | `production` | Production |

You do **not** need `VITE_API_URL` or `API_ORIGIN` on Vercel — the frontend calls `/api/*` on the same domain.

### Step 4 — Deploy

Click **Deploy**. When it finishes, open:

```text
https://your-app.vercel.app/api/healthz
```

You should see a healthy response. Then open `https://your-app.vercel.app` and log in.

### Step 5 — Supabase auth URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

| Field | Value |
|-------|-------|
| Site URL | `https://your-app.vercel.app` |
| Redirect URLs | `https://your-app.vercel.app/**` |

### Deploy via CLI (optional)

```bash
npm i -g vercel
vercel login
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
pnpm run deploy:vercel
```

### Vercel limits to know

| Topic | Limit |
|-------|-------|
| Excel file uploads | **4 MB max** on Vercel serverless |
| Function timeout | **10s** (Hobby) / **60s** (Pro) — large uploads may need Pro |
| Cold starts | First request after idle can take a few seconds on Hobby |

For very large Excel files or always-on API, use Render (`render.yaml`) as an alternative.

---

## Alternative: split hosting (Render + Vercel)

If you prefer a separate API server, deploy API to Render using `render.yaml` and set `VITE_API_URL` on Vercel to your Render URL. See `render.yaml` for details.

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
api/                      Vercel serverless entry (Express API)
scripts/                  Seed scripts
vercel.json               Vercel config (frontend + API)
render.yaml               Optional split API hosting
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
