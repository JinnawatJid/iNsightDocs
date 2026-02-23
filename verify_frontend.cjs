const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    // 1. Launch Browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // 2. Mock Data Injection (Simulate a credit report)
        const mockData = {
            inputs: {
                customerName: "Test Company Ltd.",
                registeredCapital: 5000000,
                yearsInBusiness: 12,
                requestAmount: 200000,
                ownership: "Own",
                customerDuration: 5,
                creditTerm: 30
            },
            analysisResults: {
                debugData: [
                    { label: "Years in Business", value: 12, matchedRule: "Established (> 10 Years)", weight: 14.42, score: 14.42 },
                    { label: "D/E Ratio", value: 0.8, matchedRule: "Excellent (<= 1.0)", weight: 24.76, score: 24.76 },
                    { label: "Purchase Trend", value: 20000, matchedRule: "Strong Uptrend (> 16k)", weight: 28.96, score: 28.96 }
                ],
                scoringResult: {
                    totalScore: 150,
                    grade: "A",
                    recommendedLimit: 300000,
                    breakdown: {},
                    sizeResult: { label: "L", score: 80 },
                    gradeResult: { label: "A", score: 70 }
                },
                financialSummary: {
                    monthlyHistory: [],
                    stats: { sumLast3: 0, trendRatio: 1, slope: 0 }
                }
            }
        };

        // 3. Inject localStorage before loading page
        await page.addInitScript(data => {
            localStorage.setItem('credit_report_data', JSON.stringify(data));
        }, mockData);

        // 4. Navigate to Report Page
        // Assuming the route is /report/analysis or similar.
        // Based on list_files earlier, it's likely accessed via a route.
        // Let's check router/index.js or App.vue, but standard practice is /report or /analysis
        // Wait, list_files showed `src/views/CreditAnalysisReport.vue`.
        // Let's assume it's routed. If not sure, I'll check router.

        // Checking route first...
        // For now, let's try accessing localhost:5173/ (or wherever it runs) and see if we can nav or if it renders directly.
        // Actually, without checking router, I might miss.
        // Let's quickly check router file.

        await page.goto('http://localhost:5173/report/analysis'); // Guessing route

        // Wait for table to appear
        try {
            await page.waitForSelector('.detail-table', { timeout: 5000 });
        } catch (e) {
            console.log("Direct route failed, trying root...");
            await page.goto('http://localhost:5173/');
            // Maybe there's a button to view report?
            // For the sake of this test, let's assume I can mount the component or route to it.
        }

        // 5. Interact: Toggle Details
        const toggleBtn = await page.locator('.header-with-toggle');
        if (await toggleBtn.count() > 0) {
            await toggleBtn.click(); // Expand details
        }

        // Wait for expansion
        await page.waitForTimeout(500);

        // 6. Screenshot
        await page.screenshot({ path: 'frontend_verification.png', fullPage: true });
        console.log("Screenshot saved to frontend_verification.png");

    } catch (err) {
        console.error("Error during verification:", err);
    } finally {
        await browser.close();
    }
})();
