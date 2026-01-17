# Skill: Quick Demo - Show Application Flow

## Description

A fast demonstration of the application's core functionality, useful for showcasing the POC to stakeholders.

## Quick Start (One Command)

```javascript
// Navigate and capture all pages in one flow
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('=== HOMEPAGE ===');
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 20).join('\n'))
);
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('\n=== ADMIN ONBOARDING ===');
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 25).join('\n'))
);
await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('\n=== USER SIGNUP ===');
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 25).join('\n'))
);
```

## Full Demo with Screenshots

```javascript
console.log('🎬 Starting Payday Loan POC Demo...\n');

// 1. Homepage
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
await screenshotWithAccessibilityLabels({ page });
console.log('✅ Homepage displayed\n');

// 2. Admin creates company
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
await screenshotWithAccessibilityLabels({ page });
console.log('✅ Admin onboarding page ready\n');

const timestamp = Date.now();
await page.locator('#name').fill(`Demo Corp ${timestamp}`);
await page.locator('#emailDomain').fill(`demo${timestamp}.com`);
await page.locator('#paydayDay').fill('25');
console.log(`📝 Creating company: Demo Corp ${timestamp}`);

await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle', { timeout: 3000 });
await screenshotWithAccessibilityLabels({ page });
console.log('✅ Company created\n');

// 3. User signs up
await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
await screenshotWithAccessibilityLabels({ page });

await page.locator('#email').fill(`employee@demo${timestamp}.com`);
console.log(`📝 Signing up user: employee@demo${timestamp}.com`);

await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle', { timeout: 3000 });
await screenshotWithAccessibilityLabels({ page });
console.log('✅ User signed up\n');

console.log('🎉 Demo complete! Review screenshots above.');
```

## Narrated Demo (Step-by-step with explanations)

```javascript
state.demoTimestamp = Date.now();

console.log('🎬 PAYDAY LOAN POC DEMONSTRATION');
console.log('================================\n');

console.log('📍 Step 1: Homepage Overview');
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('The application provides a simple landing page with navigation.');
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 15).join('\n'))
);
await page.waitForTimeout(1500);

console.log('\n📍 Step 2: Admin Onboards Company');
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('Admins can onboard new companies by specifying:');
console.log('- Company name');
console.log('- Email domain (for user verification)');
console.log('- Payday day-of-month\n');

await page.locator('#name').fill(`Acme Corp`);
await page.locator('#emailDomain').fill(`demo${state.demoTimestamp}.com`);
console.log('Filling form with: Acme Corp, demo' + state.demoTimestamp + '.com, payday: 25th');
await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle', { timeout: 3000 });
await page.waitForTimeout(1500);

console.log('\n📍 Step 3: Employee Signs Up');
await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('Employees can create accounts using their company email.');
console.log('The system validates that the email domain matches an onboarded company.\n');

await page.locator('#email').fill(`john.doe@demo${state.demoTimestamp}.com`);
console.log('Employee enters: john.doe@demo' + state.demoTimestamp + '.com');
await page.locator('button[type="submit"]').click();
await page.waitForLoadState('networkidle', { timeout: 3000 });

const result = await accessibilitySnapshot({ page, search: /success|token/i });
console.log('\n' + result);

console.log('\n📍 Step 4: Verification Flow');
console.log('In production, the employee would receive a verification email.');
console.log('In dev mode, the verification token is displayed for testing.');

console.log('\n✅ DEMONSTRATION COMPLETE');
console.log('\nKey Features Shown:');
console.log('- Company onboarding by admin');
console.log('- Domain-based user validation');
console.log('- Email verification token generation');
console.log('- Audit logging (backend)');
```

## Use Cases

- Stakeholder presentations
- Quick smoke testing
- Onboarding new developers
- Video tutorial recording
