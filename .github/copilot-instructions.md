# Payday Loan POC - AI Development Guide

## Architecture Overview

**Monorepo Structure (npm workspaces)**

- `apps/api`: NestJS REST API (port 3001, `/api` prefix)
- `apps/web`: Next.js frontend (port 3000, App Router)
- `packages/db`: Shared Prisma schema and client

**Data Flow**: Next.js → API (`/api/*`) → Prisma → PostgreSQL. Redis container exists but is not yet integrated.

**Phase 1 Scope**: Company onboarding (admin creates company with email domain) + user signup (email-only verification, no passwords yet).

## Database Schema (packages/db/prisma/schema.prisma)

Key entities: `Company` (with `emailDomain` unique constraint), `User`, `VerificationToken`, `AuditLog`. Every significant action logs to `AuditLog` with actor/action/metadata pattern (see [apps/api/src/audit/audit.service.ts](apps/api/src/audit/audit.service.ts)).

**Domain Validation Pattern**: Use helper functions in [apps/api/src/common/validation.ts](apps/api/src/common/validation.ts) (`normalizeDomain`, `isValidDomain`, `getDomainFromEmail`) for consistent email domain handling.

## Development Workflow

**Setup Commands** (from repo root):

```bash
docker-compose up -d           # Start Postgres + Redis
npm install                    # Install all workspace deps
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations (packages/db)
npm run dev:api                # Start API (apps/api)
npm run dev:web                # Start Web (apps/web)
```

**Critical**: Always use root-level scripts (defined in [package.json](package.json)) which properly target workspaces with `-w` flag.

## Pre-commit Feedback Loops

Husky runs these checks on every commit ([.husky/pre-commit](.husky/pre-commit)):

1. `lint-staged` (Prettier on all files via [.lintstagedrc](.lintstagedrc))
2. `npm run typecheck` (TypeScript across API + web)
3. `npm run test` (Vitest in API only)

**Before committing code**: Ensure tests exist for business logic (see [apps/api/src/common/**tests**/validation.test.ts](apps/api/src/common/__tests__/validation.test.ts) pattern) and pass locally.

## Key Conventions

**DTOs**: Use `class-validator` decorators in `dto/*.dto.ts` files (e.g., [apps/api/src/auth/dto/signup.dto.ts](apps/api/src/auth/dto/signup.dto.ts)). NestJS global `ValidationPipe` with `whitelist: true` strips unknown properties.

**Service Patterns**: Services must inject `PrismaService` and `AuditService`. Every user-facing action logs an audit entry with lowercase actor (user email) and PascalCase action (e.g., "UserSignedUp").

**Verification Flow**: Signup creates 24-hour `VerificationToken` (hex string). Token verification updates `User.emailVerifiedAt` and `VerificationToken.verifiedAt` (single-use enforcement).

**API Config**: Frontend fetches API base URL from `NEXT_PUBLIC_API_BASE_URL` or defaults to `http://localhost:3001` ([apps/web/app/lib/api.ts](apps/web/app/lib/api.ts)).

## Testing Philosophy

Per [docs/feedback-loops.md](docs/feedback-loops.md): TypeScript + tests + pre-commit hooks enable "AFK coding" by giving AI instant feedback. Prioritize unit tests for reusable logic (`common/validation.ts`) over integration tests.
