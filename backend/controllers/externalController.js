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

// Helper to capture debug screenshots
const captureScreenshot = async (page, name) => {
    try {
        const screenshotDir = path.join(__dirname, '../debug_screenshots');
        await fs.ensureDir(screenshotDir);
        const screenshotPath = path.join(screenshotDir, `${name}_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[DBD Debug] Screenshot saved: ${screenshotPath}`);
    } catch (e) {
        console.error('[DBD Debug] Failed to capture screenshot:', e.message);
    }
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
    const { taxId, companyName, customerCode } = req.query;
    const query = taxId || companyName;
    const fileIdentifier = customerCode || taxId || companyName || 'Unknown';

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
            headless: true,
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
        const closePopups = async () => {
            try {
                // Wait briefly for animations
                await new Promise(r => setTimeout(r, 1000));
                await page.keyboard.press('Escape');

                // Close buttons (Generic)
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
        };

        sendSSE(res, { status: 'progress', message: 'กำลังตรวจสอบ Popup...' });
        await closePopups();

        // 2. Search (With Retry & Validation)
        sendSSE(res, { status: 'progress', message: `กำลังค้นหานิติบุคคล: ${query}...` });
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';

        try {
            await page.waitForSelector(targetSelector, { visible: true, timeout: 15000 });

            // Search Retry Loop (Handles Focus Loss)
            let searchSuccess = false;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await page.click(targetSelector);
                    // Clear input first
                    await page.evaluate((sel) => { document.querySelector(sel).value = ''; }, targetSelector);
                    await page.type(targetSelector, query, { delay: 100 });

                    // Verify Input Value
                    const inputValue = await page.$eval(targetSelector, el => el.value);
                    if (inputValue !== query) {
                        console.warn(`[DBD Stream] Search input mismatch (Expected: ${query}, Got: ${inputValue}). Focus might be lost. Retrying...`);
                        await closePopups(); // Try closing popups again
                        await new Promise(r => setTimeout(r, 1000));
                        continue; // Retry
                    }

                    // Press Enter
                    await page.keyboard.press('Enter');
                    searchSuccess = true;
                    break;
                } catch (innerErr) {
                    console.warn(`[DBD Stream] Search attempt ${attempt + 1} failed: ${innerErr.message}`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (!searchSuccess) throw new Error('ไม่สามารถกรอกคำค้นหาได้ (Input Verification Failed)');

        } catch (e) {
            await captureScreenshot(page, 'search_error');
            throw new Error(`Search input not found or failed: ${e.message}`);
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

        // Helper to find element by XPath (replaces page.$x which is deprecated)
        const getElementByXPath = async (page, xpath) => {
            return await page.evaluateHandle((xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }, xpath);
        };

        // 4.1 Hover over "Financial Data" Tab to reveal Dropdown
        // Using XPath to find the element containing the text "ข้อมูลงบการเงิน"
        const financialTabHandle = await getElementByXPath(page, "//a[contains(., 'ข้อมูลงบการเงิน')]");
        const financialTab = financialTabHandle.asElement();

        if (financialTab) {
            console.log('[DBD Stream] Hovering over Financial Data tab...');
            await financialTab.hover();

            // Wait for the dropdown menu to appear (looking for "งบการเงิน")
            await new Promise(r => setTimeout(r, 1000)); // Animation wait

            // 4.2 Click "Financial Statement" (งบการเงิน)
            console.log('[DBD Stream] Clicking Financial Statement submenu...');
            // FIXED: Use strict text matching to avoid matching the main menu "ข้อมูลนิติบุคคลและงบการเงิน" which links to /juristic
            const statementLinkHandle = await getElementByXPath(page, "//a[normalize-space(.)='งบการเงิน']");
            const statementLink = statementLinkHandle.asElement();

            if (statementLink) {
                 // Ensure it's visible before clicking
                 await statementLink.click();
            } else {
                 throw new Error('ไม่พบเมนูย่อย "งบการเงิน"');
            }
        } else {
            console.warn('[DBD Stream] Financial Data tab not found via XPath, trying legacy generic search...');
             // Fallback to legacy evaluator if XPath fails
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('a, li, div, span'));
                const tab = items.find(el => el.innerText && el.innerText.trim() === 'ข้อมูลงบการเงิน');
                if (tab) tab.click(); // Try clicking if hover logic failed/not found
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

        // Robust Click Strategy for "Print Info" Dropdown
        const clickVisiblePrintButton = async () => {
             // 1. Try Standard Click
             try {
                 const selector = '.tab-pane.active .dropdown.print > a';
                 if (await page.$(selector)) {
                     await page.click(selector);
                     await new Promise(r => setTimeout(r, 500));
                 }
             } catch (e) { console.warn('Precise click failed:', e.message); }

             // 2. Check if Dropdown is open (has 'open' or 'show' class or menu is visible)
             const isDropdownOpen = await page.evaluate(() => {
                 const activePane = document.querySelector('.tab-pane.active');
                 if (!activePane) return false;
                 const dropdown = activePane.querySelector('.dropdown.print');
                 if (!dropdown) return false;

                 return dropdown.classList.contains('open') ||
                        dropdown.classList.contains('show') ||
                        dropdown.querySelector('.dropdown-menu')?.style.display === 'block';
             });

             if (isDropdownOpen) {
                 console.log('[DBD Stream] Dropdown opened successfully.');
                 return;
             }

             console.warn('[DBD Stream] Dropdown not open after click. Attempting Force Open...');

             // 3. Force Open Dropdown via JS (Fallback)
             await page.evaluate(() => {
                 const activePane = document.querySelector('.tab-pane.active');
                 if (activePane) {
                     const dropdown = activePane.querySelector('.dropdown.print');
                     if (dropdown) {
                         dropdown.classList.add('open');
                         dropdown.classList.add('show');
                         const menu = dropdown.querySelector('.dropdown-menu');
                         if (menu) menu.style.display = 'block';
                     }
                 }
             });
             await new Promise(r => setTimeout(r, 500));
        };

        await clickVisiblePrintButton();

        // 4.4 Click "Print Excel" in Dropdown
        const clickExcelButton = async () => {
             console.log('[DBD Stream] Attempting to click Excel button...');

             // 1. Direct JS Click (Most reliable when forced open)
             const jsClicked = await page.evaluate(() => {
                 // Search in active pane first
                 const activePane = document.querySelector('.tab-pane.active');
                 const container = activePane || document;

                 const links = Array.from(container.querySelectorAll('a, button, li, span'));
                 const excelBtn = links.find(l => l.innerText && (l.innerText.includes('พิมพ์ Excel') || l.innerText.includes('Excel')));

                 if (excelBtn) {
                     excelBtn.click();
                     return true;
                 }
                 return false;
             });

             if (jsClicked) return;

             // 2. Fallback to Puppeteer Click
             try {
                const excelBtnHandle = await getElementByXPath(page, "//a[contains(., 'พิมพ์ Excel') or contains(., 'Excel')]");
                if (excelBtnHandle) await excelBtnHandle.click();
             } catch (e) {
                 console.warn('[DBD Stream] Puppeteer click for Excel failed:', e.message);
             }
        };

        await clickExcelButton();

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
             console.warn('Balance Sheet Excel download timed out');
        }

        // 6. Move Files (Balance Sheet and Profile)
        sendSSE(res, { status: 'progress', message: 'กำลังบันทึกไฟล์ (1/2)...' });

        const downloadsDir = path.join(__dirname, '../downloads');
        await fs.ensureDir(downloadsDir);

        // Process PDF
        const pdfFilename = `DBD_Profile_${fileIdentifier}_${Date.now()}.pdf`;
        const pdfPath = path.join(downloadsDir, pdfFilename);
        if (await fs.pathExists(profilePdf)) {
             await fs.move(profilePdf, pdfPath);
        }

        // Process Balance Sheet Excel (if found)
        let excelFilename = null;
        if (balanceSheetExcel) {
            excelFilename = `DBD_BalanceSheet_${fileIdentifier}_${Date.now()}.xlsx`;
            const excelPath = path.join(downloadsDir, excelFilename);
            await fs.move(balanceSheetExcel, excelPath);
        }

        // --- NEW: Download Income Statement (งบกำไรขาดทุน) ---
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดงบกำไรขาดทุน...' });

        // 4.6 Click "Income Statement" (งบกำไรขาดทุน)
        // Try precise XPath first using normalize-space to handle whitespace
        let incomeTabHandle = await getElementByXPath(page, "//button[normalize-space(.)='งบกำไรขาดทุน'] | //a[normalize-space(.)='งบกำไรขาดทุน']");

        // If not found, try contains but be careful
        if (!incomeTabHandle) {
             incomeTabHandle = await getElementByXPath(page, "//button[contains(., 'งบกำไรขาดทุน')] | //a[contains(., 'งบกำไรขาดทุน')]");
        }

        const incomeTab = incomeTabHandle ? incomeTabHandle.asElement() : null;

        if (incomeTab) {
            console.log('[DBD Stream] Clicking Income Statement tab...');
            await incomeTab.click();
        } else {
            console.warn('[DBD Stream] Income Statement tab not found via XPath, trying JS fallback...');
             // Fallback JS with strict matching
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('button, a, li, span, div'));
                const tab = items.find(el => el.innerText && el.innerText.trim() === 'งบกำไรขาดทุน');
                if (tab) tab.click();
            });
        }

        // Wait for Table (Look for specific table header "รายได้หลัก" which appears in Income Statement)
        sendSSE(res, { status: 'progress', message: 'กำลังรอโหลดตารางงบกำไรขาดทุน...' });
        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('รายได้หลัก') || document.body.innerText.includes('ต้นทุนขาย'),
                { timeout: 15000 }
            );
        } catch (e) {
            console.warn('Timeout waiting for Income Statement specific text, but continuing...');
        }

        // Small buffer for animations
        await new Promise(r => setTimeout(r, 1000));

        // Click Print Info again
        console.log('[DBD Stream] Clicking Print Info for Income Statement...');
        await clickVisiblePrintButton();

        // Wait for dropdown animation
        await new Promise(r => setTimeout(r, 1500));

        // Click Print Excel again
        console.log('[DBD Stream] Clicking Print Excel for Income Statement...');
        await clickExcelButton();

        // Wait for Income Statement Excel
        let incomeStatementExcel = null;
        startTime = Date.now();
        while (Date.now() - startTime < maxWait) {
            const files = await fs.readdir(tmpDir);
            // Since we moved the previous xlsx, the only xlsx should be the new one
            const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
            if (xlsxFile) {
                incomeStatementExcel = path.join(tmpDir, xlsxFile);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // Move Income Statement
        let incomeFilename = null;
        if (incomeStatementExcel) {
            incomeFilename = `DBD_IncomeStatement_${fileIdentifier}_${Date.now()}.xlsx`;
            const incomePath = path.join(downloadsDir, incomeFilename);
            await fs.move(incomeStatementExcel, incomePath);
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
                } : null,
                incomeStatement: incomeFilename ? {
                    url: `/api/downloads/${incomeFilename}`,
                    filename: incomeFilename
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
