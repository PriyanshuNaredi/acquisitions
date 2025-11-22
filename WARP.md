# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Commands Overview

### Local Node (without Docker)

From the repo root:

- Install dependencies:
  - `npm install`
- Run the dev server with file watching (uses `src/index.js` → `src/server.js` → `src/app.js`):
  - `npm run dev`
- Run the server in normal (non-watch) mode:
  - `npm start`
- Lint and format:
  - Lint all files: `npm run lint`
  - Auto-fix lint issues: `npm run lint:fix`
  - Format with Prettier: `npm run format`
  - Check formatting only: `npm run format:check`
- Database / Drizzle tooling (uses `drizzle-kit` and the `drizzle/` directory):
  - Generate migrations from schema changes: `npm run db:generate`
  - Apply migrations: `npm run db:migrate`
  - Open Drizzle Studio: `npm run db:studio`

> Note: There is currently no `test` script defined in `package.json`. If you add a test runner, wire it through `npm test` / `npm run test` and update this file with how to run a single test.

### Docker / Compose / Make (preferred for DB + app)

Most day-to-day work (app + Neon Local Postgres) is done via the `Makefile` and Docker Compose.

Common development commands:

- Start dev stack (app + Neon Local): `make dev-up`
- Start in background: `make dev-up-d`
- View logs: `make dev-logs`
- Run DB migrations in dev: `make dev-migrate`
- Open shell in app container: `make dev-shell`
- Stop dev stack: `make dev-down`

Common production-like commands:

- Start prod stack: `make prod-up-d`
- View logs: `make prod-logs`
- Run DB migrations in prod: `make prod-migrate`
- Stop prod stack: `make prod-down`

Utilities:

- Show all available Make targets: `make help`
- Validate Docker/Neon setup: `make check`
- Build images: `make build` / `make build-dev` / `make build-prod`

If `make` is unavailable, use the equivalent `docker-compose -f docker-compose.dev.yml ...` / `docker-compose -f docker-compose.prod.yml ...` commands described in `COMMANDS.md`, `DOCKER_README.md`, and `DOCKER_SETUP_SUMMARY.md`.

### Environment & configuration

- Local development without Docker typically uses `.env` / `.env.local` (see `.env.example` for the keys).
- Docker-based development uses `.env.development` (and optionally a local override file) as configured in `docker-compose.dev.yml`.
- Production Docker uses `.env.production`, which is referenced by `docker-compose.prod.yml` and ignored by Git.
- For high-level setup and environment details, prefer:
  - `QUICKSTART.md` – minimal “3-step” dev/prod instructions.
  - `DOCKER_README.md` – full Neon + Docker architecture and troubleshooting.
  - `DOCKER_SETUP_SUMMARY.md` – overview of files and main workflows.

## High-level architecture

### Runtime, entrypoints, and process model

- This is a Node.js 18+ Express API, using ES modules (`"type": "module"` in `package.json`) and import aliases defined under `imports` in `package.json` (e.g. `#config/*`, `#controllers/*`, `#routes/*`, etc.).
- The process entrypoint for npm scripts is `src/index.js`:
  - Loads environment variables via `dotenv/config`.
  - Imports `src/server.js`.
- `src/server.js`:
  - Imports the configured Express app from `src/app.js`.
  - Listens on `process.env.PORT || 3000` and logs a simple startup message.

When you change startup behavior (ports, health checks, global middleware), work through `src/app.js` and `src/server.js` rather than creating new entrypoints.

### Express app and routing layer

`src/app.js` is the central composition point for HTTP concerns:

- Creates the Express app and wires core middleware:
  - `helmet()` for basic security headers.
  - `cors()` with default settings.
  - JSON and URL-encoded body parsers.
  - `cookie-parser` for cookie access.
  - `morgan` HTTP logging, whose output is routed into the shared Winston logger.
  - Custom `securityMiddleware` from `#middleware/security.middleware.js` (Arcjet-based bot and rate-limit protection), applied globally.
- Defines basic service endpoints:
  - `GET /` → simple “Hello, World!” text + log.
  - `GET /health` → JSON health response compatible with Docker health checks.
  - `GET /api` → basic API welcome payload.
- Mounts API routers:
  - `/api/auth` → `src/routes/auth.routes.js`.
  - `/api/users` → `src/routes/user.routes.js`.

Router files are intentionally thin and delegate to controllers.

### Layering: routes → controllers → services → database

The domain logic follows a consistent layering pattern:

- **Routes (`src/routes/`)**
  - `auth.routes.js` defines `POST /sign-up`, `POST /sign-in`, `POST /sign-out` and forwards to controller functions.
  - `user.routes.js` wires `GET /` to a controller and leaves other HTTP verbs as placeholders.
- **Controllers (`src/controllers/`)**
  - `auth.controller.js`:
    - Validates incoming payloads using Zod schemas from `#validations/auth.validation.js`.
    - Delegates user creation and authentication to `#services/auth.service.js`.
    - Issues JWTs via `#utils/jwt.js` and stores them in HTTP-only cookies via `#utils/cookies.js`.
    - Uses the shared Winston logger for audit-style messages (sign up / sign in / sign out).
  - `users.controllers.js`:
    - Fetches user data via `#services/users.services.js`.
    - Normalizes the JSON response (`message`, `users`, `count`).
- **Services (`src/services/`)**
  - `auth.service.js`:
    - Handles password hashing and verification via `bcrypt`.
    - Encapsulates Drizzle queries for user creation and lookup using `db` and the `users` table.
    - Returns password-stripped user objects to callers.
  - `users.services.js`:
    - Provides a higher-level `getAllUsers()` that selects a curated subset of columns from the `users` table.
- **Database access (`src/config/database.js`, `src/models/`, `drizzle/`)**
  - `src/config/database.js`:
    - Configures Neon client (`@neondatabase/serverless`) and Drizzle ORM (`drizzle-orm/neon-http`).
    - In development (`NODE_ENV` or `node_env` is `development`), routes traffic through the `neon-local` proxy inside Docker.
    - Exposes `db` for queries and `sql` for raw access.
  - `src/models/user.model.js` defines the `users` table via Drizzle’s `pgTable`, mapping directly onto the `drizzle/0000_*.sql` migration.
  - The `drizzle/` directory (SQL + JSON metadata) is the source of truth for DB migrations and schema history.

When adding new business behavior, prefer following this stack:

1. Define or extend a Drizzle model under `src/models/`.
2. Generate and apply a migration (`npm run db:generate` → `npm run db:migrate`).
3. Add service functions that wrap Drizzle operations.
4. Call services from controllers and expose them via routers.

### Validation, auth, and session handling

- **Validation (`src/validations/`)**
  - `auth.validation.js` uses Zod to define `signupSchema` and `signinSchema`.
  - `src/utils/format.js` provides a small helper to turn Zod error objects into a single error string.
- **JWT & cookies (`src/utils/`)**
  - `jwt.js` wraps `jsonwebtoken` and centralizes signing and verification with a configurable `JWT_SECRET` and a `1d` expiry.
  - `cookies.js` standardizes cookie options (HTTP-only, `SameSite=strict`, secure in production) and offers simple helpers to set, clear, and read cookies.
- **Auth flow**
  - Signup: validate → hash password → insert user via service → sign JWT → set cookie → respond with non-sensitive user fields.
  - Signin: validate → fetch user by email → compare password → sign JWT → set cookie → respond with non-sensitive user fields.
  - Signout: clear the `token` cookie.

There is currently no middleware that automatically decodes JWTs into `req.user`; `securityMiddleware` relies on `req.user?.role` when present, but will treat requests as `guest` otherwise.

### Security & rate limiting (Arcjet)

- `src/config/arcjet.js` sets up a base Arcjet client with:
  - A `shield` rule for common attack patterns.
  - A `detectBot` rule with allowlisted bot categories.
  - A default `slidingWindow` rate limit rule.
- `src/middleware/security.middleware.js` wraps this client and adds **role-aware rate limiting**:
  - Derives a `role` from `req.user?.role` (or `guest`).
  - Chooses rate limits per role (admin > user > guest).
  - Attaches a role-specific sliding-window rule per request.
  - Interprets Arcjet decisions and returns structured 403 responses for bots, shield violations, or rate-limited traffic.

If you introduce new security-relevant behavior (e.g., per-route rate limits), prefer enhancing this middleware or adding new Arcjet rules in `src/config/arcjet.js` rather than scattering security checks across controllers.

### Logging and observability

- `src/config/logger.js` configures a Winston logger with:
  - JSON logs and timestamps.
  - File transports writing to `logs/error.log` and `logs/combined.log`.
  - A console transport in non-production environments (colorized, simple formatting).
- `src/app.js` integrates `morgan` with this logger, so HTTP access logs are sent through the same logging pipeline.
- The `logs/` directory is bind-mounted into Docker containers (see Compose files) and ignored by Git.

Prefer using the shared `logger` from `#config/logger.js` instead of `console.log` for anything beyond the minimal startup message in `server.js`.

### Dockerized environments & Neon integration

The repo is built around running the app and Postgres via Docker and Neon:

- **Development (`docker-compose.dev.yml`)**
  - Runs two services: `neon-local` (Neon Local proxy) and `app` (Node container built from the `development` stage in `Dockerfile`).
  - `neon-local` creates ephemeral or branch-aware database branches backed by Neon Cloud.
  - `app` mounts the source tree and `logs/` for hot-reload-style development and persistent logs.
- **Production (`docker-compose.prod.yml`)**
  - Runs only the `app` container built from the `production` stage in `Dockerfile`.
  - Expects `DATABASE_URL` and other production settings from `.env.production`.
  - Adds resource limits and a health check that pings `GET /health`.

For deep operational behavior (branch lifecycles, connection strings, troubleshooting), use `DOCKER_README.md` and `DOCKER_SETUP_SUMMARY.md` as the canonical references.

## Repo-specific conventions for future changes

- Respect the existing layering: keep HTTP concerns in routes/controllers, business logic in services, and data access in Drizzle-based models.
- When adding new endpoints, colocate Zod validation schemas in `src/validations/` and re-use `formatValidationErrors` for consistent error payloads.
- Use the shared `logger` for application logs and preserve the `logs/` directory pattern so Docker-based logging continues to work.
- When expanding the data model, keep `src/models/` and `drizzle/` migrations in sync via `npm run db:generate` and `npm run db:migrate`.
- Prefer reusing the Arcjet configuration and `securityMiddleware` for new security and rate-limiting requirements instead of introducing ad hoc checks.
