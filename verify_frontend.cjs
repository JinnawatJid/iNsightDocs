const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Route to catch local requests if needed, though we are using localStorage mock
  await page.route('**/*', route => route.continue());

  page.on('console', msg => {
      if (msg.type() === 'error') console.error(`PAGE ERROR: ${msg.text()}`);
      else console.log(`PAGE LOG: ${msg.text()}`);
  });

  // Mock Data Setup
  const today = new Date();
  const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(today.getMonth() - 1);
  const twoMonthsAgo = new Date(today); twoMonthsAgo.setMonth(today.getMonth() - 2);
  const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(today.getMonth() - 6);

  const fmtDate = (d) => d.toISOString().split('T')[0];

  // 6 Invoices to test "Top 5" logic
  const mockInvoices = [
      { Invoice_No: "INV-1-BIG", Invoice_Date: fmtDate(oneMonthAgo), Amount: 100000, Late_Days: 30, Effective_Payment_Date: fmtDate(today) },
      { Invoice_No: "INV-2-MED", Invoice_Date: fmtDate(oneMonthAgo), Amount: 50000, Late_Days: 15, Effective_Payment_Date: fmtDate(today) },
      { Invoice_No: "INV-3-SML", Invoice_Date: fmtDate(twoMonthsAgo), Amount: 10000, Late_Days: 5, Effective_Payment_Date: fmtDate(today) },
      { Invoice_No: "INV-4-TINY", Invoice_Date: fmtDate(twoMonthsAgo), Amount: 1000, Late_Days: 60, Effective_Payment_Date: fmtDate(today) },
      { Invoice_No: "INV-5-AVG", Invoice_Date: fmtDate(oneMonthAgo), Amount: 25000, Late_Days: 10, Effective_Payment_Date: fmtDate(today) },
      { Invoice_No: "INV-6-LOW", Invoice_Date: fmtDate(oneMonthAgo), Amount: 5000, Late_Days: 2, Effective_Payment_Date: fmtDate(today) }, // Should be excluded from Top 5
      { Invoice_No: "INV-OLD", Invoice_Date: fmtDate(sixMonthsAgo), Amount: 50000, Late_Days: 20, Effective_Payment_Date: fmtDate(sixMonthsAgo) }, // Too old
  ];

  const mockData = {
    analysisResults: {
      financialSummary: {
        wadlData: { score: 12.5, grade: 'C' },
        latePaymentData: {
          invoices: mockInvoices
        }
      }
    }
  };

  try {
    // 1. Load Page (assuming local dev server is running on 5173)
    // Note: In real environment, you might need to serve the dist folder or run vite preview.
    // For this environment, we assume the user has run `npm run dev` or similar.
    // If not, this script might fail to connect.
    const targetUrl = 'http://localhost:5173/report/financial-analysis';
    console.log(`Navigating to ${targetUrl}...`);

    // Inject data before load if possible, or right after
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    console.log('Injecting mock data into localStorage...');
    await page.evaluate((data) => {
        localStorage.setItem('credit_report_data', JSON.stringify(data));
        // Force reload to pick up data
        window.location.reload();
    }, mockData);

    await page.waitForTimeout(2000); // Wait for reload

    // 2. Interact with WADL Summary
    console.log('Looking for WADL Summary toggle...');
    const wadlToggle = await page.waitForSelector('.wadl-summary.clickable', { timeout: 5000 });

    if (wadlToggle) {
        console.log('Found WADL toggle. Clicking...');
        await wadlToggle.click();

        // 3. Verify Breakdown Panel
        console.log('Waiting for Breakdown Panel...');
        await page.waitForSelector('.wadl-breakdown-panel');

        // 4. Verify Chart Presence
        console.log('Waiting for Top 5 Chart...');
        const chart = await page.waitForSelector('.top-contributors-chart');
        if (chart) {
            console.log('SUCCESS: Top 5 Contributors Chart found.');
        } else {
            console.error('FAILURE: Chart not found.');
        }

        // 5. Screenshot
        await page.waitForTimeout(500); // Animation buffer
        const screenshotPath = path.resolve('frontend_wadl_verification.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot saved to: ${screenshotPath}`);

    } else {
        console.error('FAILURE: WADL toggle not found.');
    }

  } catch (error) {
      console.error('Test Failed:', error);
  } finally {
      await browser.close();
  }
})();
