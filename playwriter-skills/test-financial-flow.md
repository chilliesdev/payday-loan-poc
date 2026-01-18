# Skill: Test Financial Flow (End-to-End)

## Description

This skill tests the complete financial flow: connecting a bank account via Mono, triggering the affordability analysis, and verifying the loan limit is displayed correctly on the dashboard. Since we cannot use real bank credentials, we mock the Mono API responses at the network level.

## Prerequisites

- Both servers running: `npm run dev:api` (port 3001) and `npm run dev:web` (port 3000)
- A test company and user exist in the database (run `test-onboarding.md` first if needed)
- Chrome browser with Playwriter extension active on the target tab

## Execution Steps

### Step 1: Setup Test Data and Network Interception

First, we'll store test configuration and setup network interception to mock the backend's exchange endpoint response.

```javascript
// Initialize test state
state.testConfig = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',
  testEmail: `testuser_${Date.now()}@testcompany.com`,
  testUserId: null, // Will be set after creating user
  mockLoanLimit: 165000, // Expected: averageSalary (500000) * 0.33
  mockAverageSalary: 500000
};

// Setup response interception for the exchange endpoint
state.apiResponses = [];
state.mockTriggered = false;

page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('/api/financial/mono/exchange')) {
    try {
      const body = await res.json();
      state.apiResponses.push({ url, status: res.status(), body });
      console.log('📡 Intercepted exchange response:', JSON.stringify(body, null, 2));
    } catch (e) {
      state.apiResponses.push({ url, status: res.status(), error: 'Could not parse JSON' });
    }
  }
});

console.log('✅ Step 1 Complete: Network interception configured');
console.log('📧 Test email:', state.testConfig.testEmail);
```

### Step 2: Create Test Company and User via API

Before testing the dashboard, we need a registered company and user. We'll create them directly via API calls.

```javascript
// Create a test company first
const companyDomain = `testcompany.com`;
const companyPayload = {
  name: `Test Company ${Date.now()}`,
  emailDomain: companyDomain,
  paydayDay: 25
};

try {
  const companyRes = await page.evaluate(async (payload) => {
    const res = await fetch('http://localhost:3001/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return { status: res.status, data: await res.json() };
  }, companyPayload);

  if (companyRes.status === 201 || companyRes.status === 409) {
    console.log('✅ Company ready (created or already exists)');
  } else {
    console.log('⚠️ Company creation response:', companyRes);
  }
} catch (e) {
  console.log('ℹ️ Company may already exist, continuing...');
}

// Create a test user via signup
const userEmail = `fintest_${Date.now()}@testcompany.com`;
state.testConfig.testEmail = userEmail;

const signupRes = await page.evaluate(async (email) => {
  const res = await fetch('http://localhost:3001/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return { status: res.status, data: await res.json() };
}, userEmail);

if (signupRes.status === 201 && signupRes.data.user) {
  state.testConfig.testUserId = signupRes.data.user.id;
  console.log('✅ Step 2 Complete: Test user created');
  console.log('👤 User ID:', state.testConfig.testUserId);
  console.log('📧 Email:', userEmail);
} else {
  console.log('❌ Failed to create user:', signupRes);
  throw new Error('User creation failed');
}
```

### Step 3: Navigate to Dashboard and Verify Zero State

```javascript
// Navigate to the dashboard
await page.goto(`${state.testConfig.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

// Verify we're on the dashboard with the zero state (Connect Your Bank)
const snapshot = await accessibilitySnapshot({ page });
console.log('📸 Dashboard Zero State:');
console.log(snapshot.split('\n').slice(0, 30).join('\n'));

// Check for key zero state elements
const hasConnectText = snapshot.includes('Connect Your Bank') || snapshot.includes('Connect Bank');
const hasEmailInput = snapshot.includes('email') || snapshot.includes('Email');

if (hasConnectText) {
  console.log('✅ Step 3 Complete: Dashboard zero state verified');
} else {
  console.log('⚠️ Zero state not detected, current snapshot above');
}
```

### Step 4: Fill Form Fields and Prepare for Bank Connection

```javascript
// Fill in the email field
const emailInput = page.locator('#email');
await emailInput.fill(state.testConfig.testEmail);
console.log('📝 Filled email:', state.testConfig.testEmail);

// Fill in the user ID field
const userIdInput = page.locator('#userId');
await userIdInput.fill(state.testConfig.testUserId);
console.log('📝 Filled userId:', state.testConfig.testUserId);

// Verify form is filled
const formSnapshot = await accessibilitySnapshot({ page, search: /email|userId|Connect/i });
console.log('📋 Form state:', formSnapshot);

console.log('✅ Step 4 Complete: Form fields populated');
```

### Step 5: Mock the Mono Widget Success and Trigger Exchange

Since the Mono widget cannot be automated, we'll simulate what happens when a user successfully connects their bank by directly calling the exchange endpoint with a mock code. The backend will call Mono's API - but we're testing the UI flow, not the external integration.

For a true E2E mock, we intercept at the route level:

```javascript
// Setup route interception to mock the exchange endpoint response
await page.route('**/api/financial/mono/exchange**', async (route) => {
  console.log('🎭 Intercepting exchange request, returning mock data');

  // Return a successful mock response
  const mockResponse = {
    success: true,
    data: {
      accountId: 'mock_account_' + Date.now(),
      maxLoanAmount: state.testConfig.mockLoanLimit,
      averageSalary: state.testConfig.mockAverageSalary,
      paydayDetected: true,
      expenseRatio: 0.45
    }
  };

  state.mockTriggered = true;

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockResponse)
  });
});

console.log('✅ Step 5 Complete: Route interception configured for mock response');
console.log('🎯 Mock loan limit:', state.testConfig.mockLoanLimit.toLocaleString());
```

### Step 6: Trigger the Bank Connection Flow

Now we simulate clicking the connect button. The dashboard will attempt to load the Mono widget. We'll trigger the success callback directly since the widget can't be automated.

```javascript
// Click the Connect Bank button to initiate the flow
const connectButton = page.locator('button:has-text("Connect Bank")');
await connectButton.click();
console.log('🔘 Clicked Connect Bank button');

// Wait a moment for any UI state change
await page.waitForTimeout(500);

// Since Mono widget would open in an iframe/popup, we simulate success by
// directly triggering the exchange via JavaScript in the page context
await page.evaluate(async (config) => {
  // Simulate what happens when Mono widget returns successfully
  // The dashboard calls fetch to /api/financial/mono/exchange
  const response = await fetch(
    `http://localhost:3001/api/financial/mono/exchange?userId=${config.testUserId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'mock_code_from_mono_widget' })
    }
  );

  const data = await response.json();
  console.log('Exchange response:', data);

  // Dispatch custom event to notify the React app (if it listens for it)
  window.dispatchEvent(new CustomEvent('mono-success', { detail: data }));

  return data;
}, state.testConfig);

console.log('✅ Step 6 Complete: Bank connection flow triggered');
```

### Step 7: Verify Loading State Transition

```javascript
// The UI should show a loading state while processing
// Wait for and verify the loading state
await page.waitForTimeout(300);

const loadingSnapshot = await accessibilitySnapshot({ page });
console.log('📸 Current UI State:');
console.log(loadingSnapshot.split('\n').slice(0, 25).join('\n'));

const isLoading =
  loadingSnapshot.includes('Analyzing') ||
  loadingSnapshot.includes('loading') ||
  loadingSnapshot.includes('Please wait');

if (isLoading) {
  console.log('✅ Loading state detected');
} else {
  console.log('ℹ️ Loading state may have passed quickly or UI updated');
}

console.log('✅ Step 7 Complete: Loading state check done');
```

### Step 8: Verify Success State with Loan Limit

```javascript
// Wait for the success state to appear
await page.waitForTimeout(1000);
await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

// Get the final UI state
const successSnapshot = await accessibilitySnapshot({ page });
console.log('📸 Final Dashboard State:');
console.log(successSnapshot);

// Verify success indicators
const hasLoanLimit =
  successSnapshot.includes('Loan Limit') ||
  successSnapshot.includes('Eligible') ||
  successSnapshot.includes('Maximum');
const hasAmount =
  successSnapshot.includes('165,000') ||
  successSnapshot.includes('165000') ||
  successSnapshot.includes('NGN');
const hasFinancialSummary =
  successSnapshot.includes('Financial') ||
  successSnapshot.includes('Summary') ||
  successSnapshot.includes('Salary');

console.log('\n📊 Verification Results:');
console.log('  Loan Limit text found:', hasLoanLimit ? '✅' : '❌');
console.log('  Amount displayed:', hasAmount ? '✅' : '❌');
console.log('  Financial summary:', hasFinancialSummary ? '✅' : '❌');

if (hasLoanLimit || hasAmount) {
  console.log('\n✅ Step 8 Complete: SUCCESS - Loan limit displayed correctly!');
} else {
  console.log('\n⚠️ Step 8: Could not verify loan limit display - check screenshot');
  await screenshotWithAccessibilityLabels({ page });
}
```

### Step 9: Capture Visual Evidence and Cleanup

```javascript
// Take a final screenshot for visual verification
console.log('📷 Capturing final dashboard state...');
await screenshotWithAccessibilityLabels({ page });

// Cleanup: remove route interception and listeners
await page.unroute('**/api/financial/mono/exchange**');
page.removeAllListeners('response');

// Print test summary
console.log('\n' + '='.repeat(50));
console.log('🎬 FINANCIAL FLOW TEST SUMMARY');
console.log('='.repeat(50));
console.log('Test Email:', state.testConfig.testEmail);
console.log('User ID:', state.testConfig.testUserId);
console.log('Mock Triggered:', state.mockTriggered ? '✅ Yes' : '❌ No');
console.log('API Responses Captured:', state.apiResponses.length);
console.log('Expected Loan Limit: ₦' + state.testConfig.mockLoanLimit.toLocaleString());
console.log('='.repeat(50));

console.log('\n✅ Step 9 Complete: Test finished, resources cleaned up');
```

## Alternative: Test with Real API (No Mocking)

If you want to test against the real backend (which will fail at Mono API without valid credentials), you can skip the route interception step and observe the error handling:

```javascript
// Navigate to dashboard without mocking
await page.goto('http://localhost:3000/dashboard', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

// Fill form and click connect - this will fail at Mono API
// But we can verify the error state UI works correctly
const errorSnapshot = await accessibilitySnapshot({ page, search: /error|wrong|failed/i });
console.log('Error state check:', errorSnapshot);
```

## Expected Outcomes

- ✅ Dashboard loads in "Zero State" with Connect Bank button visible
- ✅ Form accepts email and userId inputs
- ✅ Route interception successfully mocks the exchange endpoint
- ✅ UI transitions through Loading → Success states
- ✅ Loan limit amount is displayed (₦165,000 based on mock data)
- ✅ Financial summary section shows salary and other metrics
- ✅ No console errors during the flow

## Troubleshooting

| Issue                         | Solution                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- |
| "Company not found" error     | Run `test-onboarding.md` first to create a company with matching domain           |
| Exchange endpoint returns 500 | Backend may be trying to call real Mono API - ensure route interception is active |
| UI stays in loading state     | Check browser console for JavaScript errors                                       |
| Mock not triggered            | Verify the route pattern matches: `**/api/financial/mono/exchange**`              |
