# Payday Loan POC

Phase 1 implementation: company onboarding + user signup with email-only verification.

## Requirements

- Node.js 18+
- Docker (for Postgres + Redis)

## Setup

1. Copy .env.example to .env and update values.
2. Start Postgres and Redis using docker-compose.
3. Install dependencies at the repo root.
4. Generate Prisma client and run migrations.
5. Start API and web apps.

## Commands

- API dev server: npm run dev:api
- Web dev server: npm run dev:web
- Prisma generate: npm run prisma:generate
- Prisma migrate: npm run prisma:migrate

## Local URLs

- API: http://localhost:3001/api/health
- Web: http://localhost:3000

## Docs

- [docs/feedback-loops.md](docs/feedback-loops.md)
