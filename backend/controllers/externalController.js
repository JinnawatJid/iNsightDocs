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
        // Default to headless (true) unless explicitly set to 'false' for debugging
        const isHeadless = process.env.DBD_HEADLESS !== 'false';
        console.log(`[DBD Auto] Launching Puppeteer (Headless: ${isHeadless})...`);

        browser = await puppeteer.launch({
            headless: isHeadless,
            defaultViewport: null, // Allow browser to size itself
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--disable-gpu',
                '--ignore-certificate-errors',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        });

        const page = await browser.newPage();

        // Set a realistic User-Agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

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

        // Use a specific selector for the visible print button to avoid the hidden "Request Certificate" button (d-xl-none)
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        // Wait up to 60 seconds for the redirect and the button to appear (increased from 20s)
        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
        } catch (e) {
            console.error('[DBD Auto] Print button not found. Checking for list results or errors...');

            // Check for "Not Found" message
            const pageContent = await page.content();
            if (pageContent.includes('ไม่พบข้อมูล')) {
                 throw new Error('Customer not found in DBD database');
            }

            // Check if we are on a search result list (multiple matches)
            // Strategy: Look for links that contain 'company/profile'
            const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) {
                    profileLink.click();
                    return true;
                }
                return false;
            });

            if (resultLink) {
                console.log('[DBD Auto] Found search result list. Clicked first profile link.');
                // Wait again for the print button on the new page
                // Increased timeout to 60s for slow loading
                try {
                    await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
                } catch (retryErr) {
                    throw new Error('Timeout waiting for company profile page after clicking result');
                }
            } else {
                 // Check for Captcha or other blockers
                 if (pageContent.includes('captcha') || pageContent.includes('Security Check')) {
                     throw new Error('Blocked by Captcha/Security Check');
                 }
                 // Try fallback: look for button by text content "พิมพ์ข้อมูล"
                 const manualFind = await page.evaluate(() => {
                     const btns = Array.from(document.querySelectorAll('a, button'));
                     const printBtn = btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                     return !!printBtn;
                 });
                 if (manualFind) {
                     console.log('[DBD Auto] Found print button via text content fallback.');
                 } else {
                     throw new Error('Timeout waiting for company profile page');
                 }
            }
        }

        console.log('[DBD Auto] Redirect successful. Clicking print...');

        // 4. Click Print/Download
        // Note: The print button might trigger a window.print() or a download.
        // Based on user description: "the dbd will sent pdf file for me... save to my download directory"
        // This implies it triggers a download.

        try {
            await page.click(printButtonSelector);
        } catch (clickErr) {
            // Fallback click by text
             await page.evaluate(() => {
                 const btns = Array.from(document.querySelectorAll('a, button'));
                 const printBtn = btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                 if (printBtn) printBtn.click();
             });
        }

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
                } else {
                    console.error('[DBD Auto] No pages found to screenshot.');
                }
            } catch (snapErr) {
                console.error('[DBD Auto] Failed to save debug screenshot:', snapErr);
            }

            // If running visibly, keep open for inspection
            const isHeadless = process.env.DBD_HEADLESS !== 'false';
            if (!isHeadless) {
                 console.log('[DBD Auto] Browser is visible. Waiting 30s before closing for inspection...');
                 await new Promise(r => setTimeout(r, 30000));
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
