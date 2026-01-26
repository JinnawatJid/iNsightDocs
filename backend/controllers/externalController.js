// Lazy load puppeteer to prevent startup crash if module is missing (Offline Mode)
// const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const pdf = require('pdf-parse');
const db = require('../db');

// Helper to send SSE messages
const sendSSE = (res, data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Extract data from DBD Profile PDF and update Customer DB
 */
const extractAndProcessDBDData = async (pdfPath, taxId, companyName) => {
    try {
        console.log(`[DBD Extract] Reading PDF: ${pdfPath}`);
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        // Extract Registration Date (วันที่จดทะเบียนจัดตั้ง)
        // Pattern: "วันที่จดทะเบียนจัดตั้ง : 29/01/2516" or similar
        console.log('[DBD Extract] Extracted Text (First 500 chars):', text.substring(0, 500));

        const dateRegex = /วันที่จดทะเบียนจัดตั้ง\s*[:]\s*(\d{2}\/\d{2}\/\d{4})/;
        const match = text.match(dateRegex);

        if (match) {
            const dateStr = match[1]; // e.g. "29/01/2516"
            const parts = dateStr.split('/');
            const yearBE = parseInt(parts[2]);
            const currentYearBE = new Date().getFullYear() + 543;
            const yearsInBusiness = currentYearBE - yearBE;

            console.log(`[DBD Extract] Found Registration Date: ${dateStr} (Year ${yearBE}). Years in Business: ${yearsInBusiness}`);

            // Update Database
            // We prioritize updating by Tax ID if available (likely unique)
            // If not, we try Company Name, but that's risky.
            // Usually the UI sends taxId if known.

            let sql = '';
            let params = [];
            const taxIdClean = taxId ? taxId.trim() : null;

            // Simple heuristic: If taxId is 13 digits, use it.
            if (taxIdClean && /^\d{13}$/.test(taxIdClean)) {
                sql = `UPDATE "Customers" SET "years_in_business" = ? WHERE "VAT Registration No_" = ?`;
                params = [yearsInBusiness, taxIdClean];
            } else if (companyName) {
                 // Fallback to name match? Maybe too risky.
                 // But if the user searched by Name, maybe we should update by Name?
                 // Let's stick to Tax ID for safety, or strict Name match.
                 sql = `UPDATE "Customers" SET "years_in_business" = ? WHERE "Name" = ?`;
                 params = [yearsInBusiness, companyName];
            }

            if (sql) {
                await db.query(sql, params);
                console.log(`[DBD Extract] Updated Customer DB with years_in_business = ${yearsInBusiness}`);
                return { success: true, yearsInBusiness };
            }
        } else {
            console.warn('[DBD Extract] Registration Date not found in PDF text.');
        }
    } catch (error) {
        console.error('[DBD Extract] Error:', error.message);
    }
    return { success: false };
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

    // Handle Client Disconnect (Cancel)
    req.on('close', async () => {
        console.log('[DBD Stream] Client disconnected (Cancel detected). Cleaning up...');
        if (browser) await browser.close().catch(() => {});
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
    });

    try {
        let puppeteer;
        try {
            puppeteer = require('puppeteer');
        } catch (e) {
            throw new Error('ระบบดาวน์โหลด DBD ไม่สามารถใช้งานได้ในโหมดออฟไลน์ (ไม่พบ Puppeteer)');
        }

        sendSSE(res, { status: 'progress', message: 'กำลังเตรียมระบบดาวน์โหลด...' });

        // Create unique temp dir
        tmpDir = path.join(os.tmpdir(), `dbd-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        await fs.ensureDir(tmpDir);

        sendSSE(res, { status: 'progress', message: 'กำลังเปิดเบราว์เซอร์...' });

        const isHeadless = process.env.DBD_HEADLESS !== 'false';
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--disable-gpu',
                '--ignore-certificate-errors',
                '--disable-http2',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        // Use a modern User-Agent (Chrome 121) to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        // Configure download behavior
        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpDir,
        });

        // 1. Navigate
        sendSSE(res, { status: 'progress', message: 'กำลังเชื่อมต่อกรมพัฒนาธุรกิจการค้า...' });
        console.log('[DBD Stream] Navigating...');
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        // --- POPUP HANDLING ---
        sendSSE(res, { status: 'progress', message: 'กำลังตรวจสอบ Popup...' });
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
        sendSSE(res, { status: 'progress', message: `กำลังค้นหานิติบุคคล: ${query}...` });
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
        sendSSE(res, { status: 'progress', message: 'กำลังรอผลการค้นหา...' });
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
        } catch (e) {
             // Fallback: Check for result list
             sendSSE(res, { status: 'progress', message: 'กำลังตรวจสอบรายการค้นหา...' });

             const pageContent = await page.content();
             if (pageContent.includes('ไม่พบข้อมูล')) {
                 throw new Error('ไม่พบข้อมูลนิติบุคคลในฐานข้อมูล');
             }

             const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) { profileLink.click(); return true; }
                return false;
            });

            if (resultLink) {
                 sendSSE(res, { status: 'progress', message: 'พบข้อมูลแล้ว กำลังเปิดหน้าโปรไฟล์...' });
                 try {
                     await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
                 } catch (retryErr) {
                     // Last ditch attempt: check by text
                     const manualFind = await page.evaluate(() => {
                         const btns = Array.from(document.querySelectorAll('a, button'));
                         return !!btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                     });
                     if (!manualFind) throw new Error('หมดเวลาในการรอหน้าโปรไฟล์');
                 }
            } else {
                 if (pageContent.includes('captcha') || pageContent.includes('Security Check')) {
                     throw new Error('ถูกระงับโดยระบบ Captcha/Security Check');
                 }
                 throw new Error('หมดเวลาในการค้นหาข้อมูล');
            }
        }

        // 4. Download Profile PDF
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดข้อมูลนิติบุคคล (PDF)...' });

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

        // Wait for PDF file
        let profilePdf = null;
        const maxWait = 30000;
        let startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const files = await fs.readdir(tmpDir);
            const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));
            if (pdfFile) {
                profilePdf = path.join(tmpDir, pdfFile);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!profilePdf) throw new Error('หมดเวลาในการดาวน์โหลด PDF');

        // --- NEW: Download Balance Sheet (Excel) ---
        sendSSE(res, { status: 'progress', message: 'กำลังเปลี่ยนแท็บไปยังข้อมูลงบการเงิน...' });

        // 4.1 Click "Financial Data" Tab (Dropdown Parent)
        const tabClicked = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li, div, span'));
            // Look for the dropdown toggle
            const tab = items.find(el => el.innerText && el.innerText.trim() === 'ข้อมูลงบการเงิน');
            if (tab) {
                tab.click();
                return true;
            }
            return false;
        });

        if (!tabClicked) {
            // Try partial match if exact match fails
             await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('a, li, span'));
                const tab = items.find(el => el.innerText && el.innerText.includes('ข้อมูลงบการเงิน'));
                if (tab) tab.click();
            });
        }

        // Wait for dropdown animation
        await new Promise(r => setTimeout(r, 1000));

        // 4.2 Click "Financial Statement" Sub-item (งบการเงิน)
        const subItemClicked = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li'));
            const tab = items.find(el => el.innerText && el.innerText.trim() === 'งบการเงิน');
            if (tab) {
                tab.click();
                return true;
            }
            return false;
        });

        if (!subItemClicked) {
             console.warn('Sub-item "งบการเงิน" not found, trying partial match...');
             await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('a, li'));
                const tab = items.find(el => el.innerText && el.innerText.includes('งบการเงิน'));
                if (tab) tab.click();
            });
        }

        // 4.3 Wait for Table (Look for "งบแสดงฐานะการเงิน" text)
        sendSSE(res, { status: 'progress', message: 'กำลังรอโหลดตารางงบการเงิน...' });
        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('งบแสดงฐานะการเงิน'),
                { timeout: 30000 }
            );
        } catch (e) {
            console.warn('Timeout waiting for balance sheet text, but continuing...');
        }

        // 4.3 Click "Print Info" -> "Print Excel"
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดงบการเงิน (Excel)...' });

        // Find the specific "Print Info" button in this tab
        await page.evaluate(() => {
             // Re-query buttons because DOM changed
             const buttons = Array.from(document.querySelectorAll('button, a'));
             // The button in the screenshot says "พิมพ์ข้อมูล" with a printer icon
             // We need to be careful not to click the top profile one again if it's still visible
             // Usually the Financial tab has its own section.
             // We look for the one inside the financial content area if possible,
             // or just the last one found which is likely the new one.
             const printBtns = buttons.filter(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
             if (printBtns.length > 0) {
                 // Click the last one as it's likely the one in the active tab content
                 printBtns[printBtns.length - 1].click();
             }
        });

        // 4.4 Click "Print Excel" in Dropdown
        await new Promise(r => setTimeout(r, 1000)); // Wait for dropdown
        await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a, li, span'));
            const excelBtn = links.find(l => l.innerText && l.innerText.includes('พิมพ์ Excel'));
            if (excelBtn) excelBtn.click();
        });

        // 4.5 Wait for Excel File
        let balanceSheetExcel = null;
        startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const files = await fs.readdir(tmpDir);
            const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
            if (xlsxFile) {
                balanceSheetExcel = path.join(tmpDir, xlsxFile);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!balanceSheetExcel) {
             console.warn('Excel download timed out');
             // We don't throw here to ensure we at least return the PDF
        }

        // 6. Move Files
        sendSSE(res, { status: 'progress', message: 'กำลังบันทึกไฟล์ลงระบบ...' });

        const downloadsDir = path.join(__dirname, '../downloads');
        await fs.ensureDir(downloadsDir);

        // Process PDF
        const pdfFilename = `DBD_Profile_${query}_${Date.now()}.pdf`;
        const pdfPath = path.join(downloadsDir, pdfFilename);
        await fs.move(profilePdf, pdfPath);

        // Process Excel (if found)
        let excelFilename = null;
        if (balanceSheetExcel) {
            excelFilename = `DBD_BalanceSheet_${query}_${Date.now()}.xlsx`;
            const excelPath = path.join(downloadsDir, excelFilename);
            await fs.move(balanceSheetExcel, excelPath);
        }

        // --- NEW: Extract Data from PDF and Update DB ---
        sendSSE(res, { status: 'progress', message: 'กำลังประมวลผลข้อมูลจาก PDF...' });
        const extractionResult = await extractAndProcessDBDData(pdfPath, taxId, companyName);

        // 7. Complete
        sendSSE(res, {
            status: 'complete',
            files: {
                profile: {
                    url: `/api/downloads/${pdfFilename}`,
                    filename: pdfFilename
                },
                balanceSheet: excelFilename ? {
                    url: `/api/downloads/${excelFilename}`,
                    filename: excelFilename
                } : null
            },
            yearsInBusiness: extractionResult?.yearsInBusiness
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

// Export internal helper for testing
exports.extractAndProcessDBDData = extractAndProcessDBDData;
