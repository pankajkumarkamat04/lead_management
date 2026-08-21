# Lead Desk

Multi-site lead management dashboard built with **Next.js** (App Router) and **MongoDB**.

Collect enquiries from every marketing website into one place, assign them to agents, and track status from new → won/lost.

## Features

- **Admin / Agent roles** — admins manage sites, team, and assignments; agents only see their own leads
- **Multi-site intake** — each website gets an API key; all post to `/api/v1/leads`
- **Lead workspace** — search, filters, bulk assign, notes, activity timeline
- **Overview stats** — pipeline by stage, 14-day trend, leads by site
- **In-app + Markdown integration docs**

## Stack

- Next.js 16 (Route Handlers + `proxy.ts` auth gate)
- MongoDB via Mongoose
- JWT sessions (httpOnly cookie) with `jose`
- Tailwind CSS 4
- Zod validation

## Quick start

### 1. Environment

```bash
cd dashboard
cp .env.example .env.local
```

Edit `.env.local`:

```
MONGODB_URI=mongodb://127.0.0.1:27017/lead-desk
AUTH_SECRET=paste-a-long-random-string-at-least-32-chars
APP_URL=http://localhost:3000
```

`APP_URL` (or `DOMAIN`) is the public host of this dashboard. It builds the lead
API URL as `{APP_URL}/api/v1/leads` for the Integration page and site wiring.
In production set e.g. `APP_URL=https://leads.yourdomain.com` or
`DOMAIN=leads.yourdomain.com`.

### 2. Install & seed admin

```bash
npm install
npm run seed
```

Default seed (override with `SEED_ADMIN_*` in `.env.local`):

- Email: `admin@example.com`
- Password: `ChangeMeNow1!`

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in → add a **Website** → copy its API key → wire forms using [docs/INTEGRATION.md](./docs/INTEGRATION.md).

## Project layout

```
app/
  api/auth/          Login, logout, current user
  api/leads/         Dashboard lead CRUD + notes + bulk assign
  api/sites/         Website + API key management
  api/users/         Team management
  api/v1/leads/      Public intake endpoint (API key)
  dashboard/         UI (overview, leads, sites, team, integration)
  login/
components/          Client UI pieces
lib/                 DB, auth, models, serializers
docs/INTEGRATION.md  Site wiring guide
scripts/seed-admin.ts
proxy.ts             Protects /dashboard and /login
```

## Production

```bash
npm run build
npm start
```

Set `MONGODB_URI` and a strong `AUTH_SECRET` on the host. Use HTTPS so the session cookie is marked `Secure`.

## Connecting your sites

See **[docs/INTEGRATION.md](./docs/INTEGRATION.md)** or the **Integration** page in the dashboard after login.
