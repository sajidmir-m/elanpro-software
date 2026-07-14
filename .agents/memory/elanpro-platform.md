---
name: Elanpro Service Command Center
description: Architecture decisions, field mappings, and conventions for the Elanpro service ticket reporting platform
---

## Architecture
- Frontend: `artifacts/service-dashboard` (react-vite, wouter routing, tanstack-query, recharts, framer-motion, radix-ui)
- API: `artifacts/api-server` (Express, port from $PORT, cookie-based sessions, multer for file uploads)
- DB: `lib/db` (Drizzle ORM, PostgreSQL). Schema: users, sessions, uploads, active_tickets, closed_tickets, mrf_data, schedules

## Auth
- Cookie-based sessions stored in `sessions` table (NOT express-session)
- Cookie name: `session`, httpOnly, sameSite: lax, 7-day expiry
- Middleware: `artifacts/api-server/src/lib/auth.ts` → `requireAuth`, attaches `req.currentUser`
- Seed admin: `admin@elanpro.net / Admin@1234` (role: admin)
- Seed ASH: `vijay.kumar@elanpro.net / Manager@1234`

## Field Mappings (Excel → DB)
- `Reporting Manager` column → `rsh` field (Elanpro internal regional manager)
- `Representative` column → `ash` field (Area Service Head, often same as SP name in sample data)
- `Service Partner Name` column → `servicePartnerName` / `service_partner_name`
- `State` → geographic area

## Excel Upload Flow
- multer memoryStorage + xlsx package on API server
- Supported fileTypes: `active_tickets`, `closed_tickets`, `mrf_data`
- Parser: `artifacts/api-server/src/lib/excel-parser.ts`
- Returns 201 immediately, processes asynchronously; poll uploads list for status
- Batch insert: 500 rows per chunk to avoid PG limits

## Date Format
- Excel dates stored as raw text: "DD-MM-YYYY, HH24:MI:SS" (e.g. "14-07-2026, 15:15:40")
- Date filtering in SQL uses: `substring(created_on from 7 for 4) || '-' || substring(created_on from 4 for 2) || '-' || substring(created_on from 1 for 2))::date`
- Helper utility: `artifacts/api-server/src/lib/filters.ts`

## CSS / Fonts
- Google Fonts (Plus Jakarta Sans + JetBrains Mono) must be in `index.html` as `<link>` tags, NOT in `index.css` via @import (PostCSS throws @import ordering error)
- Design: navy `slate-900` primary, amber accents, light mode default

## Permissions System
- Users have a `permissions` text[] column listing which sections they can access
- Roles: admin, manager, ash, rsh, service_partner
- Manager controls which sections each employee sees via `PATCH /api/users/:id/permissions`

**Why:** Cookie-based sessions chosen over express-session to avoid in-memory store limitations in production and allow custom expiry control without extra deps.
