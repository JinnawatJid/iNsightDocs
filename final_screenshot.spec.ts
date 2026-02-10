import { test, expect } from '@playwright/test';

test('verify side-by-side layout and take screenshot', async ({ page }) => {
  // Use MOCK DATA because the backend is not running or accessible in this env

  // Mock API Response for Search
  await page.route('**/api/customers/search**', async (route) => {
    console.log('MOCK HIT: Search');
    const json = [
      {
        customer: {
          id: '01013AY',
          name: 'Test Customer (Mocked)',
          address: '123 Test Street',
          current_credit_limit: 500000,
          payment_terms_code: '30',
          payment_method: 'Transfer',
          billing_requirement: 'Original',
          billing_method: 'Email',
          existing_credits: []
        },
        financial_summary: {},
        credit_score: { can_request_credit: true },
        history: [],
        _source: 'api'
      }
    ];
    await route.fulfill({ json });
  });

  // Mock Credit Request Creation (store calls this internally)
  await page.route('**/api/credit-requests', async (route) => {
      console.log('MOCK HIT: Credit Request Create');
      // It might be a POST
      await route.fulfill({ json: { data: { txId: 'REQ-001', status: 'Draft' } } });
  });

  // 1. Navigate to the page
  // Use a standard resolution
  await page.setViewportSize({ width: 1366, height: 768 });

  console.log('Navigating...');
  await page.goto('http://localhost:3000/create-credit-request');

  // 2. Wait for the search input and type the customer ID
  const searchInput = page.locator('input[placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"]');
  await searchInput.waitFor();
  await searchInput.fill('01013AY');

  // 3. Click the search button
  await page.click('button:has-text("ค้นหา")');
  console.log('Clicked search for 01013AY');

  // 4. Wait for the Action Bar to appear
  const actionBar = page.locator('.action-bar');
  try {
      await actionBar.waitFor({ state: 'visible', timeout: 10000 });
      console.log('Action Bar appeared!');
  } catch (e) {
      console.log('Action Bar did NOT appear. Taking fail screenshot.');
      await page.screenshot({ path: 'debug_fail.png', fullPage: true });
      throw e;
  }

  // 5. Final Screenshot
  await page.screenshot({ path: 'final_layout_screenshot_fixed.png', fullPage: true });
});
