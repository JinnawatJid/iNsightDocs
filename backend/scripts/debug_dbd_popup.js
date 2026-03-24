const logger = require('../utils/logger');
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: true, // Set to true for CI/Sandbox
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a realistic User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        logger.info('[Verify] Navigating to DBD DataWarehouse...');
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        logger.info('[Verify] Checking for popups...');

        // 1. Handle Initial Announcement Popup
        // Try pressing Escape first (often closes modals)
        try {
            await page.keyboard.press('Escape');
            logger.info('[Verify] Pressed Escape.');
            await new Promise(r => setTimeout(r, 1000));
        } catch (e) { logger.info('[Verify] Escape error:', e.message); }

        // Try to click "Close" button if it exists
        const closeClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, div, span, a'));
            const closeBtn = buttons.find(el =>
                el.innerText && (el.innerText.includes('Close') || el.innerText.includes('ปิด') || el.innerText.includes('X'))
            );
            if (closeBtn && closeBtn.offsetParent !== null) { // Check visibility
                closeBtn.click();
                return true;
            }
            return false;
        });
        if (closeClicked) logger.info('[Verify] Clicked a "Close/ปิด" button.');


        // 2. Handle Cookie Consent
        // Wait a moment for cookie banner to animate in
        await new Promise(r => setTimeout(r, 2000));

        const cookieClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const acceptBtn = buttons.find(el =>
                el.innerText && (el.innerText.includes('ยอมรับทั้งหมด') || el.innerText.includes('Accept All'))
            );
            if (acceptBtn) {
                acceptBtn.click();
                return true;
            }
            return false;
        });

        if (cookieClicked) {
            logger.info('[Verify] Clicked "ยอมรับทั้งหมด".');
            // Wait for banner to disappear
            await new Promise(r => setTimeout(r, 2000));
        } else {
            logger.info('[Verify] Cookie button not found (might already be accepted or not present).');
        }

        logger.info('[Verify] Interacting with Search Input...');

        // Use the specific placeholder to target the correct input
        const searchSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';
        await page.waitForSelector(searchSelector, { visible: true, timeout: 10000 });

        // Type a dummy value
        await page.type(searchSelector, '0105550024505'); // PTT Global Chemical
        logger.info('[Verify] Typed search query.');

        // Press Enter
        await page.keyboard.press('Enter');
        logger.info('[Verify] Pressed Enter.');

        // Wait for navigation or results
        // Just waiting a bit to see if page reacts (snapshot)
        await new Promise(r => setTimeout(r, 5000));

        await page.screenshot({ path: 'verify_success.png' });
        logger.info('[Verify] Success screenshot saved.');

    } catch (error) {
        logger.error('[Verify] Error:', error);
        await page.screenshot({ path: 'verify_error_debug.png' });
    } finally {
        await browser.close();
    }
})();
