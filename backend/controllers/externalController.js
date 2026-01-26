const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Helper to send SSE messages
const sendSSE = (res, data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Stream DBD Profile Download (SSE)
 * Provides real-time status updates to the client.
 */
exports.streamDBDProfile = async (req, res) => {
    // Note: EventSource uses GET, so params are in query
    const { taxId, companyName } = req.query;
    const query = taxId || companyName;

    if (!query) {
        return res.status(400).json({ success: false, message: 'Tax ID or Company Name is required' });
    }

    // Set headers for Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Important for Nginx/Proxies to not buffer
    });

    let browser = null;
    let tmpDir = null;

    try {
        sendSSE(res, { status: 'progress', message: 'Initializing download environment...' });

        // Create unique temp dir
        tmpDir = path.join(os.tmpdir(), `dbd-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        await fs.ensureDir(tmpDir);

        sendSSE(res, { status: 'progress', message: 'Launching browser...' });

        const isHeadless = process.env.DBD_HEADLESS !== 'false';
        browser = await puppeteer.launch({
            headless: isHeadless,
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

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Configure download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpDir,
        });

        // 1. Navigate
        sendSSE(res, { status: 'progress', message: 'Opening DBD DataWarehouse...' });
        console.log('[DBD Stream] Navigating...');
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        // --- POPUP HANDLING ---
        sendSSE(res, { status: 'progress', message: 'Checking for popups...' });
        try {
            // Wait briefly for animations
            await new Promise(r => setTimeout(r, 2000));
            await page.keyboard.press('Escape');

            // Close buttons
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, div, span, a'));
                const closeBtn = buttons.find(el =>
                    el.innerText && (el.innerText.includes('Close') || el.innerText.includes('ปิด') || el.innerText.includes('X'))
                );
                if (closeBtn && closeBtn.offsetParent) closeBtn.click();
            });

            // Cookie Consent
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

        // 2. Search
        sendSSE(res, { status: 'progress', message: `Searching for: ${query}...` });
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';
        try {
            await page.waitForSelector(targetSelector, { visible: true, timeout: 10000 });
            await page.click(targetSelector);
            await page.type(targetSelector, query, { delay: 100 });
            await page.keyboard.press('Enter');
        } catch (e) {
            throw new Error(`Search input not found: ${e.message}`);
        }

        // 3. Wait for Redirect/Results
        sendSSE(res, { status: 'progress', message: 'Waiting for search results...' });
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
        } catch (e) {
             // Fallback: Check for result list
             sendSSE(res, { status: 'progress', message: 'Checking search result list...' });

             const pageContent = await page.content();
             if (pageContent.includes('ไม่พบข้อมูล')) {
                 throw new Error('Company not found in DBD database');
             }

             const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) { profileLink.click(); return true; }
                return false;
            });

            if (resultLink) {
                 sendSSE(res, { status: 'progress', message: 'Company found. Opening profile...' });
                 try {
                     await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
                 } catch (retryErr) {
                     // Last ditch attempt: check by text
                     const manualFind = await page.evaluate(() => {
                         const btns = Array.from(document.querySelectorAll('a, button'));
                         return !!btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                     });
                     if (!manualFind) throw new Error('Timeout waiting for profile page');
                 }
            } else {
                 if (pageContent.includes('captcha') || pageContent.includes('Security Check')) {
                     throw new Error('Blocked by Captcha/Security Check');
                 }
                 throw new Error('Timeout waiting for company profile page');
            }
        }

        // 4. Download
        sendSSE(res, { status: 'progress', message: 'Downloading PDF...' });

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

        // 5. Wait for file
        let downloadedFile = null;
        const maxWait = 20000;
        const startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const files = await fs.readdir(tmpDir);
            const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));
            if (pdfFile) {
                downloadedFile = path.join(tmpDir, pdfFile);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!downloadedFile) throw new Error('Download timed out');

        // 6. Move File
        sendSSE(res, { status: 'progress', message: 'Saving file to server...' });

        const downloadsDir = path.join(__dirname, '../downloads');
        await fs.ensureDir(downloadsDir);

        // Use a clean filename
        const finalFilename = `DBD_Profile_${query}_${Date.now()}.pdf`;
        const finalPath = path.join(downloadsDir, finalFilename);

        await fs.move(downloadedFile, finalPath);

        // 7. Complete
        sendSSE(res, {
            status: 'complete',
            url: `/api/downloads/${finalFilename}`,
            filename: finalFilename
        });

    } catch (error) {
        console.error('[DBD Stream] Error:', error);
        sendSSE(res, { status: 'error', message: error.message });

        // Clean up immediately on error (if browser still open)
        if (browser) await browser.close().catch(() => {});
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});

    } finally {
        // Ensure browser is closed and response is ended
        if (browser && browser.isConnected()) await browser.close();
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
        res.end();
    }
};

// Deprecated: Old POST method (kept for backward compatibility if needed)
exports.downloadDBDProfile = async (req, res) => {
    return res.status(400).json({
        success: false,
        message: 'Please use the SSE endpoint /api/external/dbd-stream?taxId=... for better experience.'
    });
};
