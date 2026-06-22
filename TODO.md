# Webhook City — TODO & Ideas

A dashboard that ingests webhooks & logs from services (Netlify, CircleCI, etc.),
organizes them into **Projects**, and streams them in **real-time**.

---

## ✅ Locked Stack

| Layer | Choice |
|---|---|
| Frontend | **Next.js + React** |
| Backend | **C# ASP.NET Core Web API** |
| Database | **PostgreSQL** (payloads in `jsonb`) |
| ORM | **EF Core** (Npgsql provider) |
| Real-time | **SignalR** (one group per Project) |
| Storage upgrade path | TimescaleDB later if volume grows — no migration needed |

> Decision: own the backend in C#. Skipped BaaS (Convex/Supabase/Firebase) —
> those replace the backend rather than complement it.

---

## 🎯 Core Concept

- **Projects** = a workspace. Each project has its own webhook URLs and a live log feed.
- **Endpoints** = unique ingest URLs you paste into Netlify/CircleCI/your-own-service.
- **Events** = every webhook/log that arrives, stored and streamed live to the dashboard.

---

## 🧱 Foundation (MVP)

- [x] Decide backend stack → **ASP.NET Core Web API**
- [x] Decide frontend → **Next.js + React**
- [x] Decide database → **PostgreSQL + EF Core**
- [x] Data model (see below) — UUID PKs · single-user v1 (no auth yet)
- [x] Scaffold C# Web API + EF Core entities + DbContext + InitialCreate migration
- [x] docker-compose (web + API + Postgres, all containerized), auto-migrate on startup — verified working
- [x] `POST /ingest/:projectSlug/:endpointSlug` — accepts any JSON payload (non-JSON wrapped)
- [x] Secret-token validation per endpoint (header or query)
- [x] Persist events to Postgres (jsonb body/headers, parsed status)
- [x] Projects/Endpoints/Events REST API + status parser
- [x] Dashboard: project list → project detail with event log view
- [x] "Copy webhook URL" + "Copy secret" button per endpoint
- [~] Live-tail stream — **polling (3s) for MVP**; SignalR upgrade pending ("pipes")
- [ ] Retention policy (default 30-day TTL) — column stamped, cleanup job pending

- [x] **Project capability decision point** — choose Webhooks / Log storage / Both at creation; gates UI panels per choice
- [x] **Webhook vs Log distinction** — each endpoint has a kind; events stamped + badged (🪝/📜); feed filterable by kind
- [x] **Capability is not a lock-in** — any project can add either kind anytime; adding the other kind auto-grows the project to Both (panels/filters appear live)
- [x] **Delete endpoints** (inline confirm) and **delete projects** (are-you-sure modal); both cascade their children. Shared `ConfirmModal`; shared `UniqueSlugAsync` helper (DRY)
- [x] **Groups** — flat folders of projects (one group per project, nullable). Create/rename/delete groups; assign at creation or move from project detail. Deleting a group orphans its projects (SetNull), never deletes them. Home page renders per-group sections + Ungrouped.

### MVP status: ✅ end-to-end verified
Create project → add endpoint → POST webhook (200 valid / 401 bad secret) →
event stored with parsed status → live feed shows it with body/headers + status badge.
Deferred by design: SignalR real-time push, external service wiring, retention job, auth.

---

## 🗄️ Data Model (v1)

> **UUID** primary keys everywhere. **Single-user v1** — no users/auth table yet
> (add an `organizations`/`users` layer later; `projects` will hang off it).

```
projects
  id            uuid (pk)
  name          text
  slug          text (unique)          -- used in the ingest URL
  created_at    timestamptz

endpoints
  id            uuid (pk)
  project_id    uuid (fk -> projects)
  slug          text                   -- used in the ingest URL
  source        text                   -- netlify | circleci | github | custom
  secret_token  text                   -- validates inbound POSTs
  created_at    timestamptz

events                                 -- the log entries (heavy table)
  id                    uuid (pk)
  endpoint_id           uuid (fk -> endpoints)
  project_id            uuid (fk -> projects)   -- denormalized for fast feed queries
  received_at           timestamptz
  source                text
  status                text           -- parsed: success | error | pending
  method                text           -- POST, etc.
  headers               jsonb
  body                  jsonb          -- raw payload
  retention_expires_at  timestamptz    -- drives cleanup job
```

**Design notes**
- `project_id` denormalized onto `events` — live feed queries by project constantly; avoids a join on the hot path.
- `jsonb` for `headers`/`body` — store any payload shape, still query inside (`body->>'state'`).
- `status` extracted at ingest time so the UI filters/colors without re-parsing JSON.
- `retention_expires_at` stamped on insert; background job deletes expired rows.

**Indexes (likely):** `events(project_id, received_at desc)`, `endpoints(project_id)`, unique `projects(slug)`.

---

## ✨ Cool Ideas (the fun stuff)

### Real-time & UX
- [ ] **Live tail mode** — terminal-style auto-scrolling feed (think `tail -f`)
- [ ] **Pause / resume** the stream without losing buffered events
- [ ] **Sound/desktop notification** on matching events (e.g. a failed deploy)
- [ ] **"Connection heartbeat"** indicator — green dot pulses when stream is live

### Filtering & Search
- [ ] Filter by source, status, HTTP method, time range
- [ ] Full-text search across payload bodies (Postgres `tsvector` or Meilisearch)
- [ ] **Saved filters** ("Show me only CircleCI failures")
- [ ] JSONPath/query bar — drill into payload fields (`$.deploy.state == "error"`)

### Service Integrations (pre-built parsers)
- [ ] **Netlify** — pretty-render deploy events (site, branch, deploy state, URL)
- [ ] **CircleCI** — build status, job name, branch, pass/fail badge
- [ ] **GitHub** — push/PR/issue events
- [ ] **Stripe** — payment events
- [ ] Generic fallback — raw JSON viewer with collapsible tree

### Status & Health
- [x] **Status board** — a wall of health tiles (green/red/amber/idle) per project, polled every 5s
- [x] **Uptime/last-seen** — "ci last reported 3m ago" via `timeAgo` helper
- [x] Aggregate **failure rate** + recent-events strip (last 20, colored) per source
  - Backend: `GET /api/projects/{slug}/health` — per-endpoint aggregates + `HealthEvaluator`

### Developer Tools
- [ ] **Replay** an event — re-send a captured webhook to a target URL (great for local dev)
- [ ] **Forward / relay** — pipe incoming webhooks to localhost (ngrok-style) or another URL
- [ ] **cURL / code snippet** generator for each endpoint
- [ ] **Mock sender** — fire test events from the UI to see how they render

### Power Features
- [ ] **Alerts/Rules engine** — "if status == error, ping Slack/Discord/email"
- [ ] **API keys** for programmatic log ingestion (your own services pipe logs in)
- [ ] **Webhook signature verification** presets (Stripe, GitHub HMAC, etc.)
- [ ] **Multi-tenant / teams** — invite members to a project
- [ ] **Export** events as JSON/CSV

### Storage & Scale (the "storage heavy" concern)
- [ ] Per-project retention config + body truncation (cap at ~64KB)
- [ ] Cold archival to S3/R2 for events older than X days
- [ ] Cursor-based pagination (never load it all)
- [ ] Optional payload compression at rest

---

## 🌶️ Stretch / Wild Ideas

- [ ] **AI summarizer** — "What happened in this project in the last hour?"
- [ ] **Timeline view** — visual chronological map of events across all services
- [ ] **Diff view** — compare two webhook payloads side by side
- [ ] **Shareable public log links** (read-only, expiring)
- [ ] **CLI** — `webhook-city tail my-project` from your terminal
- [ ] **Embeddable status widget** — drop a live status badge into a README/site

---

## 📌 Open Questions

- [ ] Self-hosted only, or hosted SaaS later?
- [ ] Expected event volume? (drives storage + DB choices)
- [ ] Auth: single-user to start, or teams from day one?

---

_Add your ideas below — let's keep building this list._
