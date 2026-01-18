# Payday Loan POC - AI Development Guide

## Architecture Overview

**Monorepo** (npm workspaces): `apps/api` (NestJS, port 3001), `apps/web` (Next.js App Router, port 3000), `packages/db` (Prisma).

**Data Flow**: Next.js → API (`/api/*`) → Prisma → PostgreSQL. Redis container exists but is unused.

**Current Phase**: Company onboarding + user signup (email-only verification) + Mono bank integration for loan affordability scoring.

## Development Commands

**Always run from repo root** (uses `-w` flag internally):

```bash
docker-compose up -d        # Start Postgres + Redis
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run migrations
npm run dev:api             # API at localhost:3001
npm run dev:web             # Web at localhost:3000
npm run test                # Vitest (API only)
npm run typecheck           # TS check across workspaces
```

## Pre-commit Hooks (Husky)

Every commit runs: `lint-staged` → `typecheck` → `test`. Ensure tests pass locally before committing.

## Service Patterns

Services inject `PrismaService` and `AuditService`. **Every user-facing action must log an audit entry:**

```typescript
await this.audit.log({
  actor: email, // lowercase user email, or 'admin'/'system'
  action: 'UserSignedUp', // PascalCase action name
  userId: user.id,
  companyId: company.id,
  metadata: { email } // optional JSON context
});
```

See [apps/api/src/auth/auth.service.ts](apps/api/src/auth/auth.service.ts) and [apps/api/src/companies/companies.service.ts](apps/api/src/companies/companies.service.ts) for examples.

## Module Structure

NestJS modules follow this pattern (see [apps/api/src/mono/mono.module.ts](apps/api/src/mono/mono.module.ts)):

- Import `HttpModule` for external API calls
- Declare service providers with `AuditService` and `PrismaService`
- Export services for use by other modules

Register modules in [apps/api/src/app.module.ts](apps/api/src/app.module.ts).

## Domain Validation

Always use helpers from [apps/api/src/common/validation.ts](apps/api/src/common/validation.ts):

- `normalizeDomain(domain)` - lowercase + trim
- `isValidDomain(domain)` - format validation
- `getDomainFromEmail(email)` - extract domain part
- `isValidPaydayDay(day)` - must be 1-28

## External Integrations

**Mono API** ([apps/api/src/mono/mono.service.ts](apps/api/src/mono/mono.service.ts)): Bank account linking via `exchangeToken(code)` and statement retrieval via `getStatement(accountId)`. Requires `MONO_SECRET_KEY` env var.

**Affordability Scoring** ([apps/api/src/scoring/affordability.service.ts](apps/api/src/scoring/affordability.service.ts)):

- Filters transactions to last 3 months
- Detects salary via keywords: `SALARY`, `PAYROLL`, `WAGES`, `PAY`
- Calculates `maxLoanAmount = averageSalary × 0.33`
- Detects payday pattern (±2 days tolerance)

## Database Schema

Key entities in [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma):

- `Company`: `emailDomain` (unique), `paydayDay` (1-28)
- `User`: linked to Company by email domain, `monoAccountId`, `maxLoanAmount`
- `VerificationToken`: 24-hour TTL, single-use (`verifiedAt` marks used)
- `FinancialSnapshot`: stores affordability analysis results
- `AuditLog`: actor/action/metadata pattern

## Testing Conventions

Unit tests in `__tests__/` folders using Vitest. See [apps/api/src/scoring/**tests**/affordability.service.test.ts](apps/api/src/scoring/__tests__/affordability.service.test.ts) for comprehensive patterns:

- Helper factories for mock data (`createTransaction()`)
- Group tests by behavior (`describe` blocks)
- Test edge cases: empty input, boundary conditions, rounding

## DTOs and Validation

Use `class-validator` decorators in `dto/*.dto.ts`. NestJS `ValidationPipe` with `whitelist: true` strips unknown properties.

## E2E Testing with Playwriter

The [playwriter-skills/](playwriter-skills/) folder contains browser automation scripts for testing with AI agents:

- [test-onboarding.md](playwriter-skills/test-onboarding.md) - Full onboarding flow (company creation → user signup)
- [visual-testing.md](playwriter-skills/visual-testing.md) - Screenshot and accessibility snapshot capture
- [api-monitor.md](playwriter-skills/api-monitor.md) - Network interception for API validation

**Requires**: Both servers running (`npm run dev:api` + `npm run dev:web`) and Chrome with playwriter extension active.

## Progress Tracking

Check [feature.json](feature.json) for current implementation status. Features marked `"passes": false` are in progress.
