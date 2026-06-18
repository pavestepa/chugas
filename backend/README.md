# chugas API

NestJS + Fastify backend with PostgreSQL (PostGIS) and Redis for the chugas mobile app.

## Stack

- **Runtime:** Node.js
- **Framework:** NestJS 11 + Fastify
- **ORM:** Prisma + PostgreSQL 16 + PostGIS
- **Cache:** Redis (auth sessions, refresh tokens, rate limits, live locations)
- **Auth:** JWT access tokens + opaque refresh tokens

## Setup

```bash
cp .env.example .env
npm install
npm run docker:up
npm run prisma:deploy
npm run seed:default-user
npm run dev
```

From monorepo root:

```bash
npm run setup
npm run dev:backend
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | API with hot reload (`nest start --watch`) |
| `build` | Compile to `dist/` |
| `start` | Run compiled API |
| `docker:up` / `docker:down` | PostgreSQL + PostGIS + Redis + nginx |
| `prisma:migrate` | Create/apply dev migrations |
| `prisma:deploy` | Apply migrations (CI/production) |
| `seed:default-user` | Create local dev user |
| `test:e2e` | End-to-end tests |
| `typecheck` | TypeScript check |

## API

- http://localhost:3000
- Swagger: http://localhost:3000/swagger
- WebSocket: `ws://localhost:3000/ws?token=JWT`

Postman collection: `../docs/postman/`

## Environment

See [`.env.example`](.env.example). Required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — access token signing secret
