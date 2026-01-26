const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

(async () => {
    console.log('Starting DBD Debug Script...');
    const query = '0205538007136'; // Target from user issue

    const browser = await puppeteer.launch({
        headless: true,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080',
            '--disable-gpu',
            '--ignore-certificate-errors'
        ]
    });

    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        console.log('Navigating to DBD DataWarehouse...');
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        // --- POPUP HANDLING ---
        console.log('Handling popups...');
        try {
            await new Promise(r => setTimeout(r, 2000));
            await page.keyboard.press('Escape');

            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, div, span, a'));
                const closeBtn = buttons.find(el =>
                    el.innerText && (el.innerText.includes('Close') || el.innerText.includes('ปิด') || el.innerText.includes('X'))
                );
                if (closeBtn && closeBtn.offsetParent) closeBtn.click();
            });

            const cookieClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const acceptBtn = buttons.find(el =>
                    el.innerText && (el.innerText.includes('ยอมรับทั้งหมด') || el.innerText.includes('Accept All'))
                );
                if (acceptBtn) { acceptBtn.click(); return true; }
                return false;
            });
            if (cookieClicked) await new Promise(r => setTimeout(r, 1000));
        } catch (e) { console.warn('Popup handling warning:', e.message); }

        // --- SEARCH ---
        console.log(`Searching for ${query}...`);
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';
        await page.waitForSelector(targetSelector, { visible: true, timeout: 10000 });
        await page.click(targetSelector);
        await page.type(targetSelector, query, { delay: 100 });
        await page.keyboard.press('Enter');

        // --- WAIT FOR RESULT ---
        console.log('Waiting for search results/profile...');
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 15000 });
            console.log('Directly landed on profile page.');
        } catch (e) {
            console.log('Print button not found immediately, checking for result list...');
             // Try to click the first profile link
             const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) { profileLink.click(); return true; }
                return false;
            });

            if (resultLink) {
                 console.log('Clicked profile link, waiting for load...');
                 await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
            } else {
                 throw new Error('Search failed or timed out.');
            }
        }

        console.log('Successfully reached Profile Page.');

        // --- FIX LOGIC: Click Dropdown -> Click Sub-item ---
        console.log('Attempting to click "ข้อมูลงบการเงิน" (Dropdown Parent)...');

        // 1. Click Parent
        const parentClicked = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li, div, span'));
            const tab = items.find(el => el.innerText && el.innerText.trim() === 'ข้อมูลงบการเงิน');
            if (tab) {
                tab.click();
                return true;
            }
            return false;
        });

        if (!parentClicked) throw new Error('Could not click "ข้อมูลงบการเงิน"');
        console.log('Clicked "ข้อมูลงบการเงิน". Waiting for animation...');
        await new Promise(r => setTimeout(r, 1000));

        // 2. Click Sub-item "งบการเงิน"
        console.log('Attempting to click "งบการเงิน" (Sub-item)...');
        const subItemClicked = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li'));
            const tab = items.find(el => el.innerText && el.innerText.trim() === 'งบการเงิน');
            if (tab) {
                tab.click();
                return true;
            }
            return false;
        });

        if (!subItemClicked) throw new Error('Could not click "งบการเงิน" sub-item');
        console.log('Clicked "งบการเงิน". Waiting for table text "งบแสดงฐานะการเงิน"...');

        // 3. Wait for Table
        await page.waitForFunction(
            () => document.body.innerText.includes('งบแสดงฐานะการเงิน'),
            { timeout: 30000 }
        );

        console.log('SUCCESS: "งบแสดงฐานะการเงิน" text found!');

    } catch (error) {
        console.error('An error occurred:', error);
        if (page) await fs.writeFile('debug_final_fail.html', await page.content());
    } finally {
        await browser.close();
    }
})();
