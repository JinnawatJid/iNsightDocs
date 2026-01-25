import { test, expect } from '@playwright/test';

test.describe('Customer Search Badge Verification', () => {

  test('should display Live API badge when source is api', async ({ page }) => {
    // Mock API Response: Success (Live API)
    await page.route('**/api/customers/search?q=*', async route => {
      const json = [{
        customer: { id: 'C1', name: 'Test Customer', phone: '0812345678' },
        history: [],
        financial_summary: {},
        credit_score: {},
        _source: 'api'
      }];
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:5173/create-credit-request');

    // Wait for page to be ready
    await expect(page.getByText('ประเภทคำขอเครดิต')).toBeVisible();

    // Type in search box
    // Note: The input has placeholder "ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
    await page.getByPlaceholder('ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท').fill('Test');

    // Click Search
    await page.getByRole('button', { name: 'ค้นหา' }).click();

    // Verify Badge
    const badge = page.locator('.badge-live');
    await expect(badge).toBeVisible({ timeout: 5000 });
    await expect(badge).toHaveText('Live API');

    // Take screenshot
    await page.screenshot({ path: 'test-results/live-api-badge.png' });
  });

  test('should display Offline Mode badge when source is database', async ({ page }) => {
    // Mock API Response: Fallback (Database)
    await page.route('**/api/customers/search?q=*', async route => {
      const json = [{
        customer: { id: 'C2', name: 'Fallback Customer', phone: '0899999999' },
        history: [],
        financial_summary: {},
        credit_score: {},
        _source: 'database'
      }];
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:5173/create-credit-request');

    // Wait for page to be ready
    await expect(page.getByText('ประเภทคำขอเครดิต')).toBeVisible();

    // Type in search box
    await page.getByPlaceholder('ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท').fill('Fallback');

    // Click Search
    await page.getByRole('button', { name: 'ค้นหา' }).click();

    // Verify Badge
    const badge = page.locator('.badge-offline');
    await expect(badge).toBeVisible({ timeout: 5000 });
    await expect(badge).toHaveText('Offline Mode');

    // Take screenshot
    await page.screenshot({ path: 'test-results/offline-mode-badge.png' });
  });

});
