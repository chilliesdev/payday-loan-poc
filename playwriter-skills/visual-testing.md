# Skill: Visual Testing & Accessibility Validation

## Description

Captures visual screenshots and accessibility snapshots to validate UI rendering and detect regressions.

## Execution Steps

### Step 1: Capture Homepage Baseline

```javascript
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

state.screenshots = [];
state.a11ySnapshots = [];

// Take visual screenshot with accessibility labels
await screenshotWithAccessibilityLabels({ page });
console.log('✅ Homepage screenshot captured');

// Store accessibility structure
state.a11ySnapshots.push({
  page: 'homepage',
  timestamp: new Date().toISOString(),
  snapshot: await accessibilitySnapshot({ page })
});
```

### Step 2: Validate Signup Page UI

```javascript
await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

await screenshotWithAccessibilityLabels({ page });
console.log('✅ Signup page screenshot captured');

const signupSnapshot = await accessibilitySnapshot({ page });
state.a11ySnapshots.push({
  page: 'signup',
  timestamp: new Date().toISOString(),
  snapshot: signupSnapshot
});

// Validate required form elements
const hasEmailInput = signupSnapshot.includes('email');
const hasSubmitButton =
  signupSnapshot.toLowerCase().includes('button') &&
  signupSnapshot.toLowerCase().includes('submit');

console.log('\n=== Signup Page Validation ===');
console.log('Has Email Input:', hasEmailInput);
console.log('Has Submit Button:', hasSubmitButton);
```

### Step 3: Test Form Error States

```javascript
// Submit empty form to trigger validation
await page.locator('button[type="submit"]').click();
await page.waitForTimeout(1000);

await screenshotWithAccessibilityLabels({ page });
console.log('✅ Error state screenshot captured');

const errorSnapshot = await accessibilitySnapshot({ page, search: /error|required/i });
console.log('\nError state elements:', errorSnapshot);
```

### Step 4: Validate Admin Onboarding Page

```javascript
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

await screenshotWithAccessibilityLabels({ page });
console.log('✅ Admin onboarding screenshot captured');

const adminSnapshot = await accessibilitySnapshot({ page });
state.a11ySnapshots.push({
  page: 'admin-onboarding',
  timestamp: new Date().toISOString(),
  snapshot: adminSnapshot
});

// Validate all required fields present
const hasNameField = adminSnapshot.toLowerCase().includes('company name');
const hasDomainField = adminSnapshot.toLowerCase().includes('email domain');
const hasPaydayField = adminSnapshot.toLowerCase().includes('payday');

console.log('\n=== Admin Page Validation ===');
console.log('Has Company Name Field:', hasNameField);
console.log('Has Email Domain Field:', hasDomainField);
console.log('Has Payday Field:', hasPaydayField);
console.log('All Fields Present:', hasNameField && hasDomainField && hasPaydayField);
```

### Step 5: Generate Accessibility Report

```javascript
console.log('\n=== ACCESSIBILITY REPORT ===');
state.a11ySnapshots.forEach((snap) => {
  console.log(`\n[${snap.page.toUpperCase()}]`);

  // Count interactive elements
  const buttons = (snap.snapshot.match(/button/gi) || []).length;
  const links = (snap.snapshot.match(/link/gi) || []).length;
  const inputs = (snap.snapshot.match(/textbox|input/gi) || []).length;

  console.log(`  Buttons: ${buttons}`);
  console.log(`  Links: ${links}`);
  console.log(`  Inputs: ${inputs}`);

  // Check for accessibility issues
  const hasHeadings = snap.snapshot.toLowerCase().includes('heading');
  const hasLabels = snap.snapshot.toLowerCase().includes('label');

  console.log(`  Has Semantic Headings: ${hasHeadings}`);
  console.log(`  Has Form Labels: ${hasLabels}`);
});

console.log('\n✅ Visual testing complete. Check screenshots above.');
```

## Use Cases

- Visual regression testing
- Accessibility compliance validation
- UI component verification
- Cross-page consistency checks
- Error state validation

## Expected Outcomes

- Screenshots captured for all key pages
- Accessibility tree validated for semantic structure
- Interactive elements properly labeled
- Form fields have associated labels
- No missing semantic landmarks
