# Spiriteal

A web application where people look after their spiritual wellbeing and, as the product grows, book sessions with practitioners. It stores sensitive personal data, so security and privacy rules apply to every change (see `CLAUDE.md`).

**Status:** early development. The authentication and account module is complete across web and API:

- email and password, emailed codes, and Google (once configured);
- authenticator-app MFA;
- consent and an 18+ check at sign-up;
- session timeouts and re-authentication;
- admin role management;
- English and Hindi.

Booking, payments and the other modules are not built yet.

## Repository layout

| Path              | Contents                                                                  |
| ----------------- | ------------------------------------------------------------------------- |
| `apps/web`        | Next.js app (App Router): pages, Server Actions, the only Supabase client |
| `apps/api`        | NestJS REST API (`/api/v1`), the only security boundary                   |
| `packages/domain` | Pure business rules (permissions, session limits, re-auth, policies, MFA) |
| `packages/shared` | Zod schemas shared by web and API (request/response contracts)            |
| `packages/db`     | Drizzle schema, SQL migrations, role bootstrap, database client           |
| `supabase`        | Local Supabase stack config and the email templates                       |

## Prerequisites

- **Node.js 26** (see `.nvmrc`). Node 26 no longer bundles Corepack.
- **pnpm 10.34.9** (pinned in `package.json`): `npm install -g pnpm@10.34.9`
- **Docker**, for the local Supabase stack and the integration tests.
- **Google Chrome**, for the end-to-end tests.

## Setup

```sh
pnpm install --frozen-lockfile
pnpm supabase:start                 # Supabase in Docker, on ports 55320-55324
cp packages/db/.env.example packages/db/.env   # set APP_RUNTIME_PASSWORD
pnpm db:setup:local                 # roles + migrations on the local database
cp apps/api/.env.example apps/api/.env         # fill in from `pnpm exec supabase status -o env`
cp apps/web/.env.example apps/web/.env
pnpm dev                            # API on :3001, web on http://localhost:3000
```

Emails sent locally (confirmation links, sign-in codes) appear in Mailpit at http://127.0.0.1:55324. The first admin is created with `docs/runbooks/grant-admin-role.md`.

Every environment needs a one-time database setup by an administrator: `packages/db/bootstrap/roles.sql`, run as Supabase's `postgres` role, followed by the migrations (ADR 0022).

## Common commands

| Purpose                                | Command                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Run API and web in watch mode          | `pnpm dev`                                                                |
| Lint                                   | `pnpm lint`                                                               |
| Format / check formatting              | `pnpm format` / `pnpm format:check`                                       |
| Type check                             | `pnpm typecheck`                                                          |
| Unit and component tests               | `pnpm test`                                                               |
| API integration tests (Docker)         | `pnpm test:integration`                                                   |
| End-to-end tests (local stack + build) | `pnpm build && pnpm test:e2e`                                             |
| Build                                  | `pnpm build`                                                              |
| Start / stop local Supabase            | `pnpm supabase:start` / `pnpm supabase:stop`                              |
| Prepare the local database             | `pnpm db:setup:local`                                                     |
| Generate a migration from schema       | `pnpm --filter @spiritualhealing/db db:generate --name=<name>`            |
| Create an empty SQL migration          | `pnpm --filter @spiritualhealing/db db:generate:custom --name=<name>`     |
| Apply migrations (as `postgres`)       | `MIGRATOR_DATABASE_URL=... pnpm --filter @spiritualhealing/db db:migrate` |
| Production dependency audit            | `pnpm audit:prod`                                                         |

## How authentication works (summary)

- **Server-side only:** the Next.js server runs every Supabase Auth flow. Session cookies are HttpOnly, SameSite=Lax and host-only, and the browser never holds a token or talks to Supabase or the API directly.
- **Every API request:** the API verifies the access token against Supabase's keys and checks the session is still live. It also enforces idle and absolute timeouts. Sign-out, revocation and timeouts therefore apply immediately.
- **Roles:** they come only from `app.user_roles`. Self-registered accounts become `client` at onboarding, after accepting the Terms and Privacy Notice and confirming they are 18 or older. Practitioners are granted by an admin.
- **MFA:** required for practitioners, admins and anyone who has set up an authenticator.
- **Sensitive changes** (password, email, MFA) need a sign-in within the last five minutes.

Details are in `docs/architecture.md`, `docs/api.md`, `docs/permissions.md` and ADR 0022.
