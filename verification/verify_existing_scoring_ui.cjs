const { chromium } = require('playwright');

(async () => {
    console.log("Starting Verification for Existing Scoring Model UI...");
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Mock Data for Existing Customer (with WADL)
    const mockData = {
        analysisResults: {
            modelType: 'existing', // KEY: Triggers Existing Logic
            financialSummary: {
                wadlData: { score: 4.5, grade: 'A' }, // KEY: WADL Data
                monthlyHistory: [],
                stats: { sumLast3: 150000, trendRatio: 1.1, slope: 500 }
            },
            scoringResult: {
                totalScore: 160,
                grade: "A",
                recommendedLimit: 500000,
                breakdown: {
                    c1: { total: 40, items: [
                        { label: "Years", value: 10, weight: 14.42, score: 14.42 },
                        { label: "Leverage", value: 0.5, weight: 8.64, score: 8.64 },
                        { label: "Asset", value: "Own", weight: 25.94, score: 25.94 }
                    ]},
                    c2: { total: 55, items: [
                        { label: "D/E", value: 1.0, weight: 24.76, score: 24.76 },
                        { label: "Inv", value: 8, weight: 13.76, score: 13.76 },
                        { label: "DSCR", value: 1.5, weight: 16.50, score: 16.50 }
                    ]},
                    c3: { total: 65, items: [
                        // 6 Items for Existing Model
                        { label: "Rev/Cap", value: 2.0, weight: 10, score: 10 },
                        { label: "Capacity", value: 1.5, weight: 10, score: 10 },
                        { label: "Turnover", value: 1.0, weight: 10, score: 10 },
                        { label: "Trend", value: 1.1, weight: 10, score: 10 },
                        { label: "Duration", value: 5, weight: 10, score: 10 },
                        { label: "WADL", value: 4.5, weight: 18.6, score: 15 } // New WADL Item
                    ]}
                },
                sizeResult: { label: "L", score: 95 },
                gradeResult: { label: "A", score: 65 }
            },
            extractedData: {},
            calculations: { dscr: 1.5 }
        },
        inputs: {
            customerName: "Existing Customer Test Co.",
            registeredCapital: 1000000,
            yearsInBusiness: 10,
            requestAmount: 500000,
            ownership: "Own",
            customerDuration: 5,
            creditTerm: 30
        }
    };

    // Inject Data
    await page.addInitScript(data => {
        localStorage.setItem('credit_report_data', JSON.stringify(data));
    }, mockData);

    try {
        // Navigate
        await page.goto('http://localhost:5173/report/financial-analysis');

        // Verify WADL Display in Sheet
        await page.waitForSelector('.stat-box', { timeout: 5000 });
        const wadlText = await page.textContent('.stat-box:has-text("WADL")');

        if (wadlText && wadlText.includes('4.50')) {
            console.log("PASS: WADL Score (4.50) found in Purchase Behavior section.");
        } else {
            console.error(`FAIL: WADL Score not found or incorrect. Found: ${wadlText}`);
        }

        // Verify Grid Columns (C3 should have 6 columns)
        // We can check the computed style of the grid container
        const grid = await page.locator('.section-2-grid');
        const style = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);

        // Count distinct column widths (e.g. "124px 124px ...")
        const colCount = style.split(' ').length;
        // 6 items + arrow + 2 results = 9 columns total
        if (colCount >= 9) {
             console.log(`PASS: Grid has ${colCount} columns (Expected >= 9 for 6 items).`);
        } else {
             console.error(`FAIL: Grid has ${colCount} columns (Expected >= 9).`);
        }

        // Screenshot
        await page.screenshot({ path: 'verification/existing_model_verification.png', fullPage: true });
        console.log("Screenshot saved to verification/existing_model_verification.png");

    } catch (e) {
        console.error("Verification Failed:", e);
    } finally {
        await browser.close();
    }
})();
