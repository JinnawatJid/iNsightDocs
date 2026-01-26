const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

exports.downloadDBDProfile = async (req, res) => {
    const { taxId, companyName } = req.body;
    const query = taxId || companyName;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Tax ID or Company Name is required' });
    }

    let browser = null;
    let tmpDir = null;

    try {
        // Create a unique temp directory for this download
        tmpDir = path.join(os.tmpdir(), `dbd-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        await fs.ensureDir(tmpDir);

        console.log(`[DBD Auto] Starting download for query: ${query}, tmpDir: ${tmpDir}`);

        // Launch Puppeteer
        // DEBUG MODE: headless: false to see the browser
        browser = await puppeteer.launch({
            headless: process.env.DBD_HEADLESS !== 'false',
            defaultViewport: null, // Allow browser to size itself
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,800',
                // '--start-maximized' // maximize not always supported in headless
            ]
        });

        const page = await browser.newPage();

        // Configure download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpDir,
        });

        // 1. Navigate to DBD Datawarehouse
        console.log('[DBD Auto] Navigating to https://datawarehouse.dbd.go.th/ ...');
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        const title = await page.title();
        console.log(`[DBD Auto] Page Title: ${title}`);

        // --- HANDLE POPUPS ---
        try {
            console.log('[DBD Auto] Checking for popups...');
            // Give time for popup to animate in
            await new Promise(r => setTimeout(r, 2000));

            // Strategy 1: Press Escape (often works for modals)
            await page.keyboard.press('Escape');
            await new Promise(r => setTimeout(r, 1000));

            // Strategy 2: Look for "ปิด" (Close) button explicitly
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
            if (closeClicked) console.log('[DBD Auto] Clicked a "Close/ปิด" button.');

            // Strategy 3: Accept Cookies (Critical: Cookie banner often blocks interactions)
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
                console.log('[DBD Auto] Clicked "ยอมรับทั้งหมด".');
                // Wait for banner to disappear
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (popupErr) {
            console.warn('[DBD Auto] Popup handling warning:', popupErr.message);
        }
        // ---------------------

        // 2. Search
        // Use a specific attribute selector to avoid selecting hidden inputs
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';

        console.log(`[DBD Auto] Waiting for search input (${targetSelector})...`);

        try {
            await page.waitForSelector(targetSelector, { visible: true, timeout: 10000 });
        } catch (e) {
            console.error('[DBD Auto] Search input not found. Dumping HTML for debug...');
            throw new Error(`Search input '${targetSelector}' not found.`);
        }

        // Focus and Type
        await page.click(targetSelector); // Ensure focus
        await page.type(targetSelector, query, { delay: 100 });

        // Press Enter
        await page.keyboard.press('Enter');

        // 3. Wait for Redirect
        // The site redirects to the profile page. We can detect this by checking for the "Print" button.
        // Or we can check if the URL changes to contain "company/profile".
        console.log('[DBD Auto] Waiting for redirect...');

        const printButtonSelector = 'a.btn-print';

        // Wait up to 20 seconds for the redirect and the button to appear
        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 20000 });
        } catch (e) {
            // If button not found, maybe search failed?
            console.error('[DBD Auto] Print button not found. Search might have failed.');
            const pageContent = await page.content();
            if (pageContent.includes('ไม่พบข้อมูล')) {
                 throw new Error('Customer not found in DBD database');
            }
            throw new Error('Timeout waiting for company profile page');
        }

        console.log('[DBD Auto] Redirect successful. Clicking print...');

        // 4. Click Print/Download
        // Note: The print button might trigger a window.print() or a download.
        // Based on user description: "the dbd will sent pdf file for me... save to my download directory"
        // This implies it triggers a download.

        await page.click(printButtonSelector);

        // 5. Wait for file download
        console.log('[DBD Auto] Waiting for file to appear in temp dir...');

        // Poll for file existence
        let downloadedFile = null;
        const maxWait = 15000; // 15 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const files = await fs.readdir(tmpDir);
            // Filter for PDF files (ignoring .crdownload partials)
            const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));

            if (pdfFile) {
                downloadedFile = path.join(tmpDir, pdfFile);

                // Ensure file is fully written (size constant? or just wait a bit)
                // Puppeteer usually renames .crdownload to .pdf when done.
                // So if we see .pdf, it should be ready.
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!downloadedFile) {
            throw new Error('Download timed out');
        }

        console.log(`[DBD Auto] File downloaded: ${downloadedFile}`);

        // 6. Read and Return File
        const fileBuffer = await fs.readFile(downloadedFile);

        // Clean up immediately
        await fs.remove(tmpDir);
        await browser.close();
        browser = null; // Prevent double close in finally

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="DBD_Profile_${query}.pdf"`);
        res.send(fileBuffer);

    } catch (error) {
        console.error('[DBD Auto] Error:', error);

        // Debugging: Take screenshot on failure
        if (browser) {
            try {
                const pages = await browser.pages();
                const page = pages.length > 0 ? pages[0] : null;
                if (page) {
                    const debugPath = path.join(__dirname, '..', 'error_dbd.png');
                    const debugHtmlPath = path.join(__dirname, '..', 'error_dbd.html');
                    await page.screenshot({ path: debugPath, fullPage: true });
                    const html = await page.content();
                    await fs.writeFile(debugHtmlPath, html);
                    console.log(`[DBD Auto] Saved debug screenshot to ${debugPath}`);
                }
            } catch (snapErr) {
                console.error('[DBD Auto] Failed to save debug screenshot:', snapErr);
            }
        }

        // Cleanup if error
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
        if (browser) await browser.close().catch(() => {});

        res.status(500).json({
            success: false,
            message: 'Failed to download DBD profile',
            error: error.message
        });
    }
};
