# Playwriter Skills for Payday Loan POC

AI-powered browser automation skills for testing and demonstrating the payday loan application.

## Available Skills

### 1. End-to-End Onboarding Test (`test-onboarding.md`)

Automates the complete user onboarding flow:

- Company creation by admin
- User signup with email verification
- Validates success messages and error handling

### 2. Visual Testing (`visual-testing.md`)

Captures screenshots and accessibility snapshots for UI validation.

### 3. API Monitoring (`api-monitor.md`)

Intercepts network requests to validate API responses and data flow.

## Usage

1. Ensure both API and web servers are running:

   ```bash
   npm run dev:api  # Port 3001
   npm run dev:web  # Port 3000
   ```

2. Open Chrome and activate the playwriter extension on the tab you want to control

3. Use GitHub Copilot to execute skills by referencing these files

## Architecture

These skills leverage playwriter's capabilities:

- `page` - Main browser page object
- `state` - Persistent storage across calls
- `accessibilitySnapshot()` - Get accessible UI structure
- Network interception for API validation
- Screenshot capture for visual regression testing
