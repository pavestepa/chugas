# chugas

Monorepo: **mobile app** (`app/`) + **API** (`backend/`) + **docs** (`docs/`).

## Structure

```
chugas/
├── app/          # Expo React Native client
├── backend/      # Elysia API (Bun + MongoDB + Redis)
├── docs/         # Postman collection & environment
└── package.json  # Root scripts for both projects
```

## Quick start

```bash
# 1. Infrastructure (MongoDB, Redis)
bun run setup

# 2. Backend API (terminal 1)
cp backend/.env.example backend/.env   # if needed
bun run dev:backend

# 3. Mobile app (terminal 2)
bun run dev:app
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/swagger
- Default user: `pavel@example.com` / `password123` (see `bun run seed:default-user`)

## Root scripts

| Script | Description |
|--------|-------------|
| `bun run dev:backend` | Start API with hot reload |
| `bun run dev:app` | Start Expo dev server (localhost API) |
| `bun run docker:up` | Start MongoDB + Redis |
| `bun run setup` | Docker up + seed default user |
| `bun run typecheck` | Typecheck backend + app |
| `bun run postman:types` | Regenerate Postman type docs |

## Environment

- **Backend:** `backend/.env` — copy from `backend/.env.example`
- **App:** `app/.env` — copy from `app/.env.example` (optional; dev script sets defaults)

For a **physical device**, set `EXPO_PUBLIC_API_URL` to your machine LAN IP (not `localhost`).

## Postman

Import from `docs/postman/`:
- `chugas.postman_collection.json`
- `chugas.postman_environment.json`

## MongoDB Compass

```
mongodb://root:password@localhost:27017/?authSource=admin
```

Database: `chugas`
