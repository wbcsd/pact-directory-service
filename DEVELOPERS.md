# PACT Network Services — Developer Setup Guide

This guide walks through setting up a local development environment for the PACT Network Services platform. For a high-level overview of what the platform does, see [README.md](README.md).

## Project structure

This is an npm workspaces monorepo with two applications and two supporting packages:

```
apps/
  api/                  Express.js + PostgreSQL backend serving the platform
                        (Conformance proxy, organizations, nodes, footprints,
                         PCF requests, internal node virtual PACT v3 API,
                         activity logs)
  directory-portal/     React + Vite frontend — the PACT Network Services
                        portal UI

packages/
  pact-api-client/      HTTP client for PACT-conformant APIs. Used by the API
                        to talk to internal and external nodes (OAuth2 client-
                        credentials, footprints, events).
  pact-data-model/      TypeScript types and JSON schemas for PACT data model
                        versions v2.0, v2.1, v2.2, v2.3 and v3.0.

docs/                   Design notes, integration guide, diagrams.
```

`packages/*` are consumed by `apps/api` via npm workspace references (`"pact-api-client": "*"`, `"pact-data-model": "*"`).

## Prerequisites

- **Node.js** ≥ 20.9.0 — [nodejs.org](https://nodejs.org/)
- **npm** ≥ 9.0.0
- **Docker** ≥ 20.0.0 with **Docker Compose** ≥ 2.0.0 — [docker.com](https://www.docker.com/get-started)
- **Git**

Verify:

```bash
node --version
npm --version
docker --version
docker compose version
```

## Setup

### 1. Clone and install

```bash
git clone https://github.com/wbcsd/pact-directory.git
cd pact-directory
npm i
```

`npm i` at the root installs dependencies for all workspaces (`apps/*` and `packages/*`) and links the local packages into `apps/api`.

### 2. Start PostgreSQL

The API uses PostgreSQL. A `docker-compose.yml` is provided in `apps/api/`:

```bash
cd apps/api
docker compose up -d
docker compose ps          # verify the container is healthy
```

This starts a `postgres:15.2-alpine` container on `localhost:5432` with database `pact_directory_local`, user `postgres`, password `postgres`.

### 3. Configure the API

The API loads its configuration from `apps/api/.env`. Copy the example and edit if needed:

```bash
cd apps/api
cp .env.example .env
```

The default values in `.env.example` are sufficient for local development. Notable variables:

- `NODE_ENV` — `development` / `test` / `production`
- `PORT` — API port (default `3010`)
- `DB_CONNECTION_STRING` — Postgres connection string
- `JWT_SECRET`, `COOKIE_SECRET` — set to non-empty values
- `CONFORMANCE_API`, `CONFORMANCE_API_INTERNAL` — URL of the external [pact-conformance-test-service](https://github.com/wbcsd/pact-conformance-test-service); only needed if you want to drive conformance test runs locally
- `DIRECTORY_API` — public base URL of this API (used when generating PACT v3 URLs for internal nodes)
- `MAIL_API_KEY`, `MAIL_API_SECRET`, `MAIL_FROM_*` — Mailjet credentials for outbound email (optional locally; emails are no-ops without a key)
- `DEV_REQUEST_DELAY` — artificial delay (ms) on every request, useful for testing UI loading states
- `ENABLE_OPENAPI_VALIDATION` — when `true`, requests/responses are validated against `apps/api/openapi.yaml`

### 4. Run migrations

```bash
cd apps/api
npm run db:migrate                # migrate to latest

# Other migration commands:
npm run db:migrate:up             # one step up
npm run db:migrate:down           # one step down
npm run db:migrate:list           # list migrations and their status
```

### 5. Create a test user

The `db:add-user` script creates an organization (if it doesn't exist) and a user inside it:

```bash
npm run db:add-user -- \
  test@example.com "Test User" testpassword administrator \
  test-company "Test Company"
```

Argument order: `<email> <fullName> <password> <role> <organizationIdentifier> <organizationName>`. Roles are `administrator` or `user`.

### 6. Configure the portal

```bash
cd apps/directory-portal
cp .env.example .env
```

Default values:

```bash
VITE_DIRECTORY_API=http://localhost:3010/api
VITE_ENABLE_IM=true                # Identity Management features (legacy)
VITE_ENABLE_OM=true                # Organization Management features
VITE_ENABLE_NM=true                # Node Management (Data Exchange Sandbox)
```

The three flags are read in [src/utils/feature-flags.ts](apps/directory-portal/src/utils/feature-flags.ts) and gate routes/components in the portal.

### 7. Run everything

From the project root:

```bash
npm run dev
```

This runs `npm run dev` in each workspace that defines it (the API in watch mode via `tsx watch`, the portal via `vite`). You can also run them individually from `apps/api` or `apps/directory-portal`.

- API: <http://localhost:3010>
- Portal: <http://localhost:5173>
- Health check: <http://localhost:3010/health-check>

## Common scripts

From the repo root:

| Command          | Effect                                                            |
| ---------------- | ----------------------------------------------------------------- |
| `npm run dev`    | Run all workspaces' dev scripts (API + portal in parallel)        |
| `npm run build`  | Build every workspace that defines a `build` script               |
| `npm test`       | Run every workspace's tests                                       |
| `npm run clean`  | Remove `dist/` from every workspace                               |
| `npm run pristine` | `clean` + delete every `node_modules`                           |

From `apps/api`:

| Command                  | Effect                                            |
| ------------------------ | ------------------------------------------------- |
| `npm run dev`            | `tsx watch ./src` — hot-reloading API server     |
| `npm run build`          | Compile TypeScript to `dist/`                    |
| `npm start`              | Run the production build (must build first)     |
| `npm test`               | Run Jest unit tests (`NODE_ENV=test`)            |
| `npm run lint`           | ESLint over `./src`                              |
| `npm run db:migrate*`    | Kysely migrations (see above)                    |
| `npm run db:add-user`    | Add a user (see above)                           |

From `apps/directory-portal`:

| Command          | Effect                                    |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Vite dev server                           |
| `npm run build`  | Type-check + Vite production build        |
| `npm run preview`| Preview the built portal                  |
| `npm test`       | Vitest                                    |
| `npm run lint`   | ESLint                                    |

## Database

### Schema

Migrations live in [apps/api/src/database/migrations/](apps/api/src/database/migrations/) and are managed with [Kysely](https://kysely.dev/). Current core tables include:

- `organizations` (renamed from `companies`) — registered organizations on the platform
- `users` — user accounts with role and status
- `password_reset_tokens` — password reset and email verification tokens
- `connections`, `connection_requests` — organization-to-organization links
- `nodes` — Data Exchange Sandbox nodes (PACT-conformant hosts inside the platform)
- `product_footprints` — PCFs published on a node
- `pcf_requests` — outgoing/incoming PCF data requests between nodes
- `activity_logs` — request-level audit log for traffic flowing through internal nodes

Run `npm run db:migrate:list` to see the authoritative list and migration status.

### Connecting to the DB

```bash
docker exec -it api-pact-directory-local-db-1 \
  psql -U postgres -d pact_directory_local

# Inside psql:
\dt                         # list tables
\d organizations            # describe a table
SELECT id, email FROM users;
```

### Seeding sample footprints

To populate a node with the PACT v3 mock footprints (laptop, steel beam, bioplastic container) used by the virtual PACT API:

```bash
cd apps/api
npx tsx src/scripts/seed-footprints.ts <nodeId>
```

## API surface

The API is mounted under `/api`. The OpenAPI spec is at [apps/api/openapi.yaml](apps/api/openapi.yaml) and full route wiring is in [apps/api/src/routes/index.ts](apps/api/src/routes/index.ts). Highlights:

### Auth & users

- `POST /api/directory/users/signup`
- `POST /api/directory/users/login`
- `POST /api/directory/users/forgot-password`
- `POST /api/directory/users/set-password`
- `POST /api/directory/users/reset-password`
- `GET  /api/directory/users/verify-reset-token/:token`
- `POST /api/directory/users/verify-email`
- `POST /api/directory/users/resend-verification`
- `GET  /api/directory/users/me`

### Organizations

- `GET  /api/directory/organizations` — list/search
- `GET  /api/directory/organizations/:id`
- `POST /api/directory/organizations/:id` — update
- `GET|POST /api/directory/organizations/:id/users`
- `GET|POST /api/directory/organizations/:oid/users/:uid`
- `GET  /api/directory/organizations/:id/connections`
- `GET  /api/directory/organizations/:id/connection-requests`
- `POST /api/directory/organizations/create-connection-request`
- `POST /api/directory/organizations/connection-request-action`

### Nodes (Data Exchange Sandbox)

- `POST /api/directory/organizations/:id/nodes`
- `GET  /api/directory/organizations/:id/nodes`
- `GET|PUT|DELETE /api/directory/nodes/:id`
- `GET  /api/directory/nodes/:id/connections`
- `POST /api/directory/nodes/:id/invitations`
- `GET  /api/directory/nodes/:id/invitations`
- `POST /api/directory/node-invitations/:id/accept`
- `POST /api/directory/node-invitations/:id/reject`
- `DELETE /api/directory/node-invitations/:id`
- `POST /api/directory/node-connections/:id/credentials/rotate`

### Footprints & PCF requests

- `POST /api/directory/nodes/:id/footprints`
- `POST /api/directory/nodes/:id/footprints/import`
- `GET  /api/directory/nodes/:id/footprints`
- `GET|DELETE /api/directory/footprints/:id`
- `POST /api/directory/nodes/:id/pcf-requests`
- `GET  /api/directory/nodes/:id/pcf-requests`
- `POST /api/directory/nodes/:id/pcf-requests/:requestId/fulfill`
- `POST /api/directory/nodes/:id/pcf-requests/:requestId/reject`

### Internal node virtual PACT v3 API

These endpoints make every internal node look like an externally hosted PACT-conformant solution. Implementation: [docs/internal-node-virtual-pact-api.md](docs/internal-node-virtual-pact-api.md), [docs/pact-v3-conformance-implementation.md](docs/pact-v3-conformance-implementation.md).

- `POST /api/nodes/:nodeId/auth/token` — OAuth2 client-credentials
- `GET  /api/nodes/:nodeId/3/footprints`
- `GET  /api/nodes/:nodeId/3/footprints/:id`
- `POST /api/nodes/:nodeId/3/events` — CloudEvents 1.0

### Conformance Service proxy

Forwards authenticated requests to the external [pact-conformance-test-service](https://github.com/wbcsd/pact-conformance-test-service):

- `POST /api/proxy/test`
- `GET  /api/proxy/test-runs`
- `GET  /api/proxy/test-results?testRunId=<id>`

### Activity logs

- `GET    /api/directory/activity-logs`
- `GET    /api/directory/activity-logs/path?path=...`
- `GET    /api/directory/activity-logs/nodes/:nodeId`
- `DELETE /api/directory/activity-logs?olderThanDays=<n>`

## Working on the packages

### `packages/pact-api-client`

A unified HTTP client for any PACT v3 node (internal or external). The API uses it to send PCF requests, fetch footprints from connected nodes, and emit CloudEvents. Tests:

```bash
cd packages/pact-api-client
npm test
```

There is also a runnable script for ad-hoc calls:

```bash
npm run run-client
```

### `packages/pact-data-model`

Generated TypeScript types and JSON schemas, exported per PACT spec version (`v2_0`, `v2_1`, `v2_2`, `v2_3`, `v3_0`) plus a top-level convenience export aliased to v3. Useful scripts:

```bash
cd packages/pact-data-model
npm run generate-schemas
npm run generate-types
npm run validate                # validate a PCF document against the schemas
```

After editing either package, rebuild it before the API picks up the changes:

```bash
npm run build -w packages/pact-api-client
npm run build -w packages/pact-data-model
```

(Or run `npm run build` from the repo root to rebuild everything.)

## Troubleshooting

### Database connection errors

```bash
cd apps/api
docker compose ps
docker compose logs pact-directory-local-db
docker compose restart pact-directory-local-db
```

### Port already in use

```bash
lsof -i :3010                     # API
lsof -i :5173                     # portal
kill -9 <PID>
```

### bcrypt build issues on macOS

```bash
cd apps/api
npm rebuild bcrypt --build-from-source
```

### Reset the local database

This wipes all data:

```bash
cd apps/api
docker compose down -v
docker compose up -d
npm run db:migrate
npm run db:add-user -- test@example.com "Test User" testpassword administrator test-company "Test Company"
```

## Related repositories

- [wbcsd/pact-conformance-test-service](https://github.com/wbcsd/pact-conformance-test-service) — the external conformance test service this API proxies to.
- [PACT Technical Specifications](https://docs.carbon-transparency.org/) — the spec the platform implements and tests against.
