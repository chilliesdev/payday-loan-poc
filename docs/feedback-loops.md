# Feedback Loops for AI Coding

When working with AI coding agents, you need feedback loops so the AI can verify its own work. Feedback loops are especially important when you're doing AFK coding.

## 1) Set Up TypeScript and Type Checking

TypeScript is essentially free feedback for your AI. Use it over JavaScript.

Add a typecheck script to package.json:

```json
{
  "scripts": {
    "typecheck": "tsc"
  }
}
```

## 2) Add Automated Tests

Use a test framework like Vitest for logical errors:

```json
{
  "scripts": {
    "test": "vitest"
  }
}
```

## 3) Install Husky for Pre-commit Hooks

Husky enforces feedback loops before every commit.

Install and initialize Husky:

```bash
pnpm install --save-dev husky
pnpm exec husky init
```

Create a .husky/pre-commit file that runs all checks:

```bash
npx lint-staged
npm run typecheck
npm run test
```

## 4) Set Up Automatic Code Formatting

Use lint-staged with Prettier to auto-format code before commits.

Install lint-staged:

```bash
pnpm install --save-dev lint-staged
```

Configure .lintstagedrc:

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

This runs Prettier on all staged files and automatically restages them.
