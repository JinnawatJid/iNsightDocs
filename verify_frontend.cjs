const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', exception => console.log('PAGE EXCEPTION:', exception));

  // Mock Data
  // Create invoice dates relative to today to ensure "Last 6 Months" logic works predictably
  const today = new Date();
  const oneMonthAgo = new Date(today); oneMonthAgo.setMonth(today.getMonth() - 1);
  const twoMonthsAgo = new Date(today); twoMonthsAgo.setMonth(today.getMonth() - 2);
  const sixMonthsAgo = new Date(today); sixMonthsAgo.setMonth(today.getMonth() - 6);
  const sevenMonthsAgo = new Date(today); sevenMonthsAgo.setMonth(today.getMonth() - 7);

  const fmtDate = (d) => d.toISOString().split('T')[0];

  const mockData = {
    analysisResults: {
      financialSummary: {
        wadlData: { score: 5.00, grade: 'B' }, // Ensure wadlStats exists to trigger the section
        latePaymentData: {
          invoices: [
            {
              "Invoice_No": "INV-BIG-LATE",
              "Invoice_Date": fmtDate(oneMonthAgo),
              "Due Date": fmtDate(oneMonthAgo),
              "Amount": 100000,
              "Effective_Payment_Date": fmtDate(today),
              "Payment_Doc_No": "PAY-001",
              "payment_method": "Cheque",
              "Late_Days": 10
            },
            {
              "Invoice_No": "INV-SMALL-LATE",
              "Invoice_Date": fmtDate(twoMonthsAgo),
              "Due Date": fmtDate(twoMonthsAgo),
              "Amount": 10000,
              "Effective_Payment_Date": fmtDate(today),
              "Payment_Doc_No": "PAY-002",
              "payment_detail": { "payment_method": "Cash/Transfer" },
              "Late_Days": 5
            },
            {
              "Invoice_No": "INV-OLD-EXCLUDED",
              "Invoice_Date": fmtDate(sevenMonthsAgo),
              "Due Date": fmtDate(sevenMonthsAgo),
              "Amount": 50000,
              "Effective_Payment_Date": fmtDate(sixMonthsAgo), // Paid, but invoice date is old
              "Late_Days": 20
            },
            {
              "Invoice_No": "INV-OUTSTANDING-EXCLUDED",
              "Invoice_Date": fmtDate(oneMonthAgo),
              "Due Date": fmtDate(oneMonthAgo),
              "Amount": 30000,
              "Effective_Payment_Date": "", // Outstanding
              "Late_Days": 0
            }
          ]
        }
      }
    }
  };

  try {
    console.log('Navigating...');
    await page.goto('http://localhost:5173/report/financial-analysis');

    console.log('Setting localStorage...');
    await page.evaluate((data) => {
        localStorage.setItem('credit_report_data', JSON.stringify(data));
        console.log('localStorage set');
    }, mockData);

    console.log('Reloading...');
    await page.reload();

    console.log('Waiting for WADL section...');
    const wadlSummary = await page.waitForSelector('.wadl-summary.clickable', { timeout: 10000 }).catch(() => null);

    if (!wadlSummary) {
        console.log('WADL Summary not found! Taking debug screenshot.');
        await page.screenshot({ path: 'debug_no_wadl.png', fullPage: true });
    } else {
        console.log('WADL Summary found. Clicking to expand...');
        await wadlSummary.click();

        console.log('Waiting for breakdown panel...');
        await page.waitForSelector('.wadl-breakdown-panel', { timeout: 5000 });

        console.log('Breakdown panel visible!');
        // Wait a split second for animation
        await page.waitForTimeout(500);

        await page.screenshot({ path: 'frontend_wadl_verification.png', fullPage: true });
        console.log('Screenshot taken: frontend_wadl_verification.png');
    }

  } catch (e) {
      console.error('Error in script:', e);
  } finally {
      await browser.close();
  }
})();
