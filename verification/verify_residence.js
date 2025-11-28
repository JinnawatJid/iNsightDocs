
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Mock API
  await page.route('**/api/customers/search*', async route => {
    console.log('Intercepted search request:', route.request().url());
    const json = [
      {
        customer: {
          id: "CUST-001",
          name: "Test Company",
          contact_person: "John Doe",
          phone: "081-123-4567",
          tax_id: "1234567890123",
          type: "Company",
          address_residential: "123 Test St District Province 10110",
          address_company: "123 Test St District Province 10110",
          company_name: "Test Company",
          "No_": "CUST-001",
          "Name": "Test Company",
          "Contact": "John Doe",
          "Phone No_": "081-123-4567",
          "VAT Registration No_": "1234567890123",
          "Address": "123 Test St",
          "City": "Test District",
          "County": "Test Province",
          "Post Code": "10110"
        },
        history: [],
        financial_summary: {},
        credit_score: {}
      }
    ];
    await route.fulfill({ json });
  });

  // Navigate
  await page.goto('http://localhost:5173/create-credit-request');

  // Search
  await page.fill('input[placeholder*="ค้นหาด้วย"]', 'Test');
  await page.click('button:has-text("ค้นหา")');

  // Wait for populate
  // Note: Using a timeout instead of a selector since the sidebars crash in my environment with mock data
  // But wait! I reverted the sidebar crash fix (uncommented them).
  // If the app crashes, this screenshot will be empty or show the error overlay.
  // I will wait a bit.
  await page.waitForTimeout(2000);

  // Navigate to Residence Tab
  try {
      await page.click('text=ที่อยู่อาศัย');
      await page.waitForTimeout(1000); // Wait for transition
  } catch (e) {
      console.log('Failed to click residence tab, possibly due to app crash');
  }

  // Screenshot
  await page.screenshot({ path: 'verification/residence_tab.png', fullPage: true });

  await browser.close();
})();
