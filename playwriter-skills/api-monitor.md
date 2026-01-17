# Skill: API Request Monitoring

## Description

Intercepts and analyzes all API requests and responses during user interactions, useful for debugging and validating backend behavior.

## Execution Steps

### Step 1: Setup Network Interception

```javascript
state.apiRequests = [];
state.apiResponses = [];

page.on('request', (req) => {
  if (req.url().includes('/api/')) {
    state.apiRequests.push({
      timestamp: new Date().toISOString(),
      method: req.method(),
      url: req.url(),
      headers: req.headers(),
      postData: req.postData()
    });
  }
});

page.on('response', async (res) => {
  if (res.url().includes('/api/')) {
    try {
      const body = await res.json().catch(() => res.text().catch(() => null));
      state.apiResponses.push({
        timestamp: new Date().toISOString(),
        url: res.url(),
        status: res.status(),
        headers: res.headers(),
        body: body
      });
    } catch (e) {
      console.log('Failed to capture response:', e.message);
    }
  }
});

console.log('✅ Network monitoring enabled');
```

### Step 2: Perform Actions (Example: Company Creation)

```javascript
await page.goto('http://localhost:3000/admin/onboarding', { waitUntil: 'domcontentloaded' });
await waitForPageLoad({ page, timeout: 5000 });

const timestamp = Date.now();
await page.locator('#name').fill(`Monitor Test ${timestamp}`);
await page.locator('#emailDomain').fill(`monitor${timestamp}.com`);
await page.locator('#paydayDay').fill('25');
await page.locator('button[type="submit"]').click();

await page.waitForLoadState('networkidle', { timeout: 5000 });
await page.waitForTimeout(1000); // Allow responses to complete
```

### Step 3: Analyze Captured Network Traffic

```javascript
console.log('\n=== API REQUESTS ===');
console.log(`Total requests: ${state.apiRequests.length}\n`);

state.apiRequests.forEach((req, idx) => {
  console.log(`[${idx + 1}] ${req.method} ${req.url}`);
  if (req.postData) {
    console.log(`   Body: ${req.postData}`);
  }
});

console.log('\n=== API RESPONSES ===');
console.log(`Total responses: ${state.apiResponses.length}\n`);

state.apiResponses.forEach((res, idx) => {
  console.log(`[${idx + 1}] ${res.status} ${res.url}`);
  console.log(`   Body: ${JSON.stringify(res.body, null, 2).slice(0, 500)}`);
  console.log('');
});
```

### Step 4: Validate API Behavior

```javascript
const companyCreationReq = state.apiRequests.find(
  (r) => r.url.includes('/api/companies') && r.method === 'POST'
);
const companyCreationRes = state.apiResponses.find((r) => r.url.includes('/api/companies'));

console.log('\n=== VALIDATION ===');
if (companyCreationReq) {
  console.log('✅ Company creation request sent');
  const body = JSON.parse(companyCreationReq.postData || '{}');
  console.log('   Payload:', body);
}

if (companyCreationRes) {
  console.log('✅ Company creation response received');
  console.log('   Status:', companyCreationRes.status);
  console.log('   Success:', companyCreationRes.status >= 200 && companyCreationRes.status < 300);
  console.log('   Response:', companyCreationRes.body);
}
```

### Step 5: Cleanup

```javascript
page.removeAllListeners('request');
page.removeAllListeners('response');
console.log('\n✅ Network monitoring disabled');
```

## Use Cases

- Debug API integration issues
- Validate request/response payloads
- Monitor error responses
- Analyze API performance
- Verify audit logging behavior

## Expected Output

- List of all API requests with method, URL, and payload
- List of all API responses with status and body
- Validation summary for key operations
