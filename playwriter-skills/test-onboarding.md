# Skill: End-to-End Onboarding Test

## Description

Automates the complete onboarding flow for the payday loan application, testing both company creation and user signup.

## Prerequisites

- API running on http://localhost:3001
- Web running on http://localhost:3000
- Clean database (or unique company domain)

## Execution Steps

### Step 1: Navigate to Company Onboarding Page

```javascript
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log('url:', page.url());
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 30).join('\n'))
);
```

### Step 2: Create a Test Company

```javascript
const timestamp = Date.now();
state.companyName = `Test Company ${timestamp}`;
state.emailDomain = `test${timestamp}.com`;
state.paydayDay = 25;

await page.locator('#name').fill(state.companyName);
await page.locator('#emailDomain').fill(state.emailDomain);
await page.locator('#paydayDay').fill(state.paydayDay.toString());
await page.locator('button[type="submit"]').click();

await page.waitForLoadState('networkidle', { timeout: 3000 });
console.log(
  'Company creation response:',
  await accessibilitySnapshot({ page, search: /success|error/i })
);
```

### Step 3: Navigate to User Signup

```javascript
await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });
console.log(
  await accessibilitySnapshot({ page }).then((x) => x.split('\n').slice(0, 30).join('\n'))
);
```

### Step 4: Sign Up User with Company Email

```javascript
state.userEmail = `testuser@${state.emailDomain}`;

await page.locator('#email').fill(state.userEmail);
await page.locator('button[type="submit"]').click();

await page.waitForLoadState('networkidle', { timeout: 3000 });
const result = await accessibilitySnapshot({ page, search: /success|error|token/i });
console.log('Signup result:', result);

// Extract verification token if displayed (dev mode)
const tokenText = await page
  .locator('text=/Verification token/')
  .textContent()
  .catch(() => null);
if (tokenText) {
  const match = tokenText.match(/token.*?:\s*([a-f0-9]+)/i);
  if (match) {
    state.verificationToken = match[1];
    console.log('Captured verification token:', state.verificationToken);
  }
}
```

### Step 5: Validate Results

```javascript
const snapshot = await accessibilitySnapshot({ page });
const hasSuccess = snapshot.toLowerCase().includes('success');
const hasError =
  snapshot.toLowerCase().includes('error') && !snapshot.toLowerCase().includes('network error');

console.log('\n=== Test Summary ===');
console.log('Company:', state.companyName);
console.log('Domain:', state.emailDomain);
console.log('User Email:', state.userEmail);
console.log('Signup Success:', hasSuccess);
console.log('Has Errors:', hasError);
console.log('Verification Token:', state.verificationToken || 'Not captured');

if (hasSuccess && !hasError) {
  console.log('\n✅ END-TO-END TEST PASSED');
} else {
  console.log('\n❌ END-TO-END TEST FAILED');
}
```

## Expected Outcomes

- Company created successfully with unique email domain
- User signup succeeds with company domain email
- Verification token generated (displayed in dev mode)
- No error messages displayed

## Troubleshooting

- If company creation fails: Check if domain already exists in DB
- If signup fails: Verify API is running and company was created
- If network errors: Check API base URL in console output
