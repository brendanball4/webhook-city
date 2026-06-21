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

This starts Postgres and the API together. The API **auto-applies EF Core
migrations on startup**, so the schema is created with no manual steps.

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

### Migrations

```bash
cd apps/api
dotnet ef migrations add <Name>
```

Migrations are applied automatically on startup; no manual `database update` needed.
