# Webhook City

A dashboard that ingests webhooks & logs from services (Netlify, CircleCI, GitHub,
custom services), organizes them into **Projects**, and streams them to the UI in
**real-time**.

See [TODO.md](TODO.md) for the full plan, data model, and idea backlog.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js + React (`apps/web`, _coming next_) |
| Backend | C# ASP.NET Core Web API, .NET 8 (`apps/api`) |
| Database | PostgreSQL 16 + EF Core (Npgsql), payloads in `jsonb` |
| Real-time | SignalR (one group per Project) |
| Local hosting | docker-compose (API + Postgres as containers) |

## Run the stack

```bash
docker compose up --build
```

This starts the **web frontend, API, and Postgres** together. The API
**auto-applies EF Core migrations on startup**, so the schema is created with no
manual steps.

- Web: http://localhost:3000
- API: http://localhost:5000
- Postgres: localhost:5432 (db `webhookcity`, user/pass `postgres`/`postgres`)

Stop with `docker compose down` (the `pgdata` volume persists your data).

## Develop the API on the host

Prefer to run only the database in Docker and the API on your machine for fast
iteration:

```bash
docker compose up db -d
cd apps/api
dotnet run
```

(The host connection string in `appsettings.json` points at `localhost:5432`.)

For the frontend, run only `db` + `api` in Docker and the Next.js dev server on
the host for hot reload:

```bash
docker compose up db api -d
cd apps/web
npm run dev   # http://localhost:3000 → calls the API at http://localhost:5000
```

## Xcode Cloud webhooks

Add an `xcode-cloud` webhook endpoint to a project. In App Store Connect, enter
the displayed HTTPS ingest URL as the payload URL and the displayed token as the
secret. The receiver verifies Apple's `X-Apple-Signature` HMAC-SHA256 signature,
accepts every Xcode Cloud build event, preserves the complete JSON payload, and
derives dashboard status from the nested build fields.

### Slack notifications

Each project can connect a channel-specific Slack Incoming Webhook from its
project page. New Apple/Xcode Cloud events are stored first, then queued for
Slack delivery with retry handling. The webhook URL stays server-side and is
never included in API responses.

### Migrations

```bash
cd apps/api
dotnet ef migrations add <Name>
```

Migrations are applied automatically on startup; no manual `database update` needed.

---

## Deployment

The backend runs on the Raspberry Pi; the frontend is hosted on Netlify.

### Backend → Raspberry Pi (CircleCI)

Auto-deploys on every push to `main`. CircleCI builds the project, then SSHes to
the Pi through a Cloudflare tunnel and has **the Pi build the image itself**
(avoiding ARM cross-compilation), streaming the build log back.

**One-time setup on the Pi**

```bash
git clone <this repo> ~/webhook-city
cd ~/webhook-city
cp .env.dist .env
nano .env            # fill in POSTGRES_PASSWORD, JWT_KEY, CORS_ORIGINS
docker compose -f docker-compose.prod.yml up -d --build
```

Generate the secrets with `openssl rand -base64 48`.

**One-time setup in CircleCI** — project environment variables:

| Variable | Meaning |
|---|---|
| `SSH_FINGERPRINT` | Fingerprint of the deploy key added to the project |
| `VPS_USER` | SSH user on the Pi |
| `VPS_PROJECT_PATH` | Path to the clone, e.g. `/home/pi/webhook-city` |

**Ports.** The API publishes host port `API_PORT` (default **5001**) — the
invoicer API already owns 5000. Postgres is deliberately **not** published: only
the API container reaches it, so it cannot collide with the existing 5432.

### Frontend → Netlify

`netlify.toml` builds from `apps/web`. Set one environment variable in the
Netlify UI:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Public URL of the API, no trailing slash |

It is baked into the client bundle at build time, so changing it needs a redeploy.

### Wiring the two together

Two settings must agree or sign-in will fail:

1. **`CORS_ORIGINS`** (Pi `.env`) must list the Netlify origin exactly — scheme
   included, no trailing slash.
2. **Cookie `SameSite`.** Give the Netlify site a custom domain on the same
   registrable domain as the API (e.g. `webhookcity.bmball.com` +
   `webhooks-api.bmball.com`). They are then *same-site*, so the refresh cookie
   can use `SameSite=Lax` — stricter, and immune to the third-party-cookie
   blocking that Safari and Chrome apply to `SameSite=None`.

   If the frontend stays on a raw `*.netlify.app` URL it is a *different* site,
   and you must set `JWT_COOKIE_SAMESITE=None`. That works today but degrades as
   browsers tighten third-party cookies — users appear randomly signed out.

   Either way the API must be served over **HTTPS**, since the cookie is `Secure`.

The ingest endpoints (`/ingest/...`) are public by design and need no CORS entry —
external services post to them server-side using the per-endpoint secret.
