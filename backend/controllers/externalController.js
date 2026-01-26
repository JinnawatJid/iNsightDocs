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
            headless: false,
            defaultViewport: null, // Allow browser to size itself
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,800',
                '--start-maximized' // Open maximized for better visibility
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

        // 2. Search
        const searchInputSelector = 'input.form-control';
        console.log('[DBD Auto] Waiting for search input...');
        await page.waitForSelector(searchInputSelector, { timeout: 30000 });

        // Type slowly to mimic human behavior (optional, but good for some sites)
        await page.type(searchInputSelector, query, { delay: 100 });

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
