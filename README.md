# Payday Loan POC

A proof-of-concept for employer-sponsored payday loans with automated affordability scoring via bank statement analysis.

## Features

### ✅ Completed

- **Company Onboarding** - Admin interface to register companies with email domain and payday configuration
- **User Signup** - Email domain-based company matching with verification tokens
- **Email Verification** - 24-hour TTL tokens with single-use enforcement
- **Mono Bank Integration** - Account linking via OAuth code exchange and statement retrieval
- **Affordability Engine** - Heuristic salary detection and loan limit calculation (33% of avg salary)
- **Financial API** - Endpoints for bank linking and retrieving calculated loan limits
- **Audit Logging** - All user-facing actions logged for compliance

### 🚧 In Progress

- **User Dashboard** - Mono Connect widget integration for bank account linking
- **E2E Financial Flow Tests** - Playwriter scripts for automated testing

## Architecture

**Monorepo** using npm workspaces:

| Package       | Description                | Port |
| ------------- | -------------------------- | ---- |
| `apps/api`    | NestJS REST API            | 3001 |
| `apps/web`    | Next.js App Router         | 3000 |
| `packages/db` | Prisma schema & migrations | -    |

**Data Flow**: Next.js → API (`/api/*`) → Prisma → PostgreSQL

## Requirements

- Node.js 18+
- Docker (for Postgres + Redis)

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your MONO_SECRET_KEY

# 3. Start databases
docker-compose up -d

# 4. Setup Prisma
npm run prisma:generate
npm run prisma:migrate

# 5. Start development servers
npm run dev:api   # API at http://localhost:3001
npm run dev:web   # Web at http://localhost:3000
```

## Commands

| Command                   | Description                     |
| ------------------------- | ------------------------------- |
| `npm run dev:api`         | Start API dev server            |
| `npm run dev:web`         | Start web dev server            |
| `npm run prisma:generate` | Generate Prisma client          |
| `npm run prisma:migrate`  | Run database migrations         |
| `npm run test`            | Run Vitest tests (API)          |
| `npm run typecheck`       | TypeScript check all workspaces |
| `npm run format`          | Prettier format all files       |

## API Endpoints

| Method | Endpoint                       | Description             |
| ------ | ------------------------------ | ----------------------- |
| GET    | `/api/health`                  | Health check            |
| POST   | `/api/companies`               | Create company (admin)  |
| POST   | `/api/auth/signup`             | User signup by email    |
| GET    | `/api/auth/verify?token=`      | Verify email token      |
| POST   | `/api/financial/mono/exchange` | Exchange Mono auth code |
| GET    | `/api/financial/limit?email=`  | Get user's loan limit   |

## Project Structure

```
apps/
├── api/src/
│   ├── auth/           # Signup & verification
│   ├── companies/      # Company onboarding
│   ├── financial/      # Bank linking & limits
│   ├── mono/           # Mono API integration
│   ├── scoring/        # Affordability engine
│   └── audit/          # Audit logging
└── web/app/
    ├── admin/onboarding/  # Company registration UI
    ├── signup/            # User signup UI
    └── dashboard/         # (WIP) Bank connect UI

packages/db/prisma/
└── schema.prisma      # Database models
```

## Environment Variables

| Variable          | Description                    |
| ----------------- | ------------------------------ |
| `DATABASE_URL`    | PostgreSQL connection string   |
| `MONO_SECRET_KEY` | Mono API secret key            |
| `MONO_PUBLIC_KEY` | Mono API public key (frontend) |

## Testing

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -w apps/api -- affordability
```

See [playwriter-skills/](playwriter-skills/) for E2E browser automation tests.

## Documentation

- [Development Guide](.github/copilot-instructions.md) - AI coding conventions
- [Feedback Loops](docs/feedback-loops.md) - Development workflow patterns
- [Feature Progress](feature.json) - Implementation status tracking

## Pre-commit Hooks

Husky runs on every commit:

1. `lint-staged` - Format changed files
2. `typecheck` - TypeScript validation
3. `test` - Run test suite

## Local URLs

- **API Health**: http://localhost:3001/api/health
- **Web App**: http://localhost:3000
- **Admin Onboarding**: http://localhost:3000/admin/onboarding
- **User Signup**: http://localhost:3000/signup
