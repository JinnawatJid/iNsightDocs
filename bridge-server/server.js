const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const pdf = require('pdf-parse');

const app = express();
const PORT = 4343;

// Middleware to handle Private Network Access (PNA) Preflight
// MUST be placed BEFORE cors() middleware so it applies to Preflight (OPTIONS)
app.use((req, res, next) => {
    // Chrome requires this header to allow a public/private website to talk to localhost
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    next();
});

// Enable CORS for all origins (since this is a local tool)
// IMPORTANT: For Private Network Access (PNA), we need strict CORS and specific headers
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins (since this is a local bridge intended for internal use)
        // In a strict prod environment, we might list specific IPs.
        callback(null, true);
    },
    credentials: true,
}));

// Helper to send SSE messages
const sendSSE = (res, data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// Helper to read file as Base64
const readFileAsBase64 = async (filePath) => {
    try {
        if (await fs.pathExists(filePath)) {
            const buffer = await fs.readFile(filePath);
            return buffer.toString('base64');
        }
    } catch (e) {
        console.warn(`Failed to read file for Base64: ${filePath}`, e);
    }
    return null;
};

/**
 * Extract data from DBD Profile PDF (No DB interaction)
 */
const extractDBDData = async (pdfPath) => {
    try {
        console.log(`[DBD Bridge] Reading PDF for extraction: ${pdfPath}`);
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        const dateRegex = /วันที่จดทะเบียนจัดตั้ง\s*[:]\s*(\d{2}\/\d{2}\/\d{4})/;
        const match = text.match(dateRegex);

        if (match) {
            const dateStr = match[1];
            const parts = dateStr.split('/');
            const yearBE = parseInt(parts[2]);
            const currentYearBE = new Date().getFullYear() + 543;
            const yearsInBusiness = currentYearBE - yearBE;
            return { success: true, yearsInBusiness };
        }
    } catch (error) {
        console.error('[DBD Bridge] Extraction Error:', error.message);
    }
    return { success: false };
};

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// Stream Endpoint
app.get('/stream', async (req, res) => {
    const { taxId, companyName } = req.query;
    const query = taxId || companyName;
    const fileIdentifier = taxId || companyName || 'Unknown';

    if (!query) {
        return res.status(400).json({ success: false, message: 'Tax ID or Company Name is required' });
    }

    // Set headers for SSE
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Private-Network': 'true'
    });

    let browser = null;
    let tmpDir = null;

    req.on('close', async () => {
        console.log('[DBD Bridge] Client disconnected. Cleaning up...');
        if (browser) await browser.close().catch(() => {});
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
    });

    try {
        sendSSE(res, { status: 'progress', message: 'กำลังเปิดเบราว์เซอร์...' });

        tmpDir = path.join(os.tmpdir(), `dbd-bridge-${Date.now()}`);
        await fs.ensureDir(tmpDir);

        const isHeadless = process.env.DBD_HEADLESS !== 'false';

        browser = await puppeteer.launch({
            headless: isHeadless, // Default true
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,800', // Smaller window for local
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpDir,
        });

        // --- HELPERS (Copied from backend) ---
        const getElementByXPath = async (page, xpath) => {
            return await page.evaluateHandle((xpath) => {
                const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                return result.singleNodeValue;
            }, xpath);
        };

        const handlePopups = async () => {
            try {
                await new Promise(r => setTimeout(r, 500));
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
            } catch (e) { }
        };

        const downloadExcel = async (label) => {
             let menuOpen = false;
             for (let i = 0; i < 5; i++) {
                 try {
                     const clicked = await page.evaluate(() => {
                        const activePane = document.querySelector('.tab-pane.active');
                        if (activePane) {
                            const scopedBtn = Array.from(activePane.querySelectorAll('button, a'))
                                .find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล') && b.offsetParent !== null);
                            if (scopedBtn) { scopedBtn.click(); return true; }
                        }
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const printBtns = buttons.filter(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล') && b.offsetParent !== null);
                        if (printBtns.length > 0) { printBtns[printBtns.length - 1].click(); return true; }
                        return false;
                    });

                    if (!clicked) {
                        await new Promise(r => setTimeout(r, 1000));
                        continue;
                    }

                    let excelVisible = false;
                    for(let j=0; j<150; j++) {
                        excelVisible = await page.evaluate(() => {
                             const links = Array.from(document.querySelectorAll('a, li, span'));
                             return !!links.find(l => l.innerText && l.innerText.includes('พิมพ์ Excel') && l.offsetParent !== null);
                        });
                        if(excelVisible) break;
                        await new Promise(r => setTimeout(r, 100));
                    }

                    if (excelVisible) { menuOpen = true; break; }
                 } catch (e) {}
                 await new Promise(r => setTimeout(r, 1000));
             }

             await new Promise(r => setTimeout(r, 500));
             try {
                 const excelBtnHandle = await getElementByXPath(page, "//a[contains(., 'พิมพ์ Excel') or contains(., 'Excel')]");
                 const excelBtn = excelBtnHandle ? excelBtnHandle.asElement() : null;
                 if (excelBtn) {
                     const box = await excelBtn.boundingBox();
                     if (box) { await excelBtn.click(); return; }
                 }
                 await page.evaluate(() => {
                     const links = Array.from(document.querySelectorAll('a, li, span'));
                     const btn = links.find(l => l.innerText && l.innerText.includes('พิมพ์ Excel') && l.offsetParent !== null);
                     if (btn) btn.click();
                 });
             } catch (e) {}
        };

        // --- EXECUTION ---
        sendSSE(res, { status: 'progress', message: 'กำลังเข้าสู่เว็บไซต์ DBD...' });
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 90000 });
        await handlePopups();

        // Search
        sendSSE(res, { status: 'progress', message: `กำลังค้นหา: ${query}...` });
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';
        let searchSuccess = false;
        for(let i=0; i<3; i++) {
             try {
                if (i > 0) await handlePopups();
                await page.waitForSelector(targetSelector, { visible: true, timeout: 30000 });
                await page.click(targetSelector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                await page.type(targetSelector, query, { delay: 100 });
                const inputValue = await page.$eval(targetSelector, el => el.value);
                if (inputValue === query) {
                    await page.keyboard.press('Enter');
                    searchSuccess = true;
                    break;
                }
             } catch (e) {}
        }

        if (!searchSuccess) throw new Error('Failed to type search query.');

        sendSSE(res, { status: 'progress', message: 'กำลังรอผลการค้นหา...' });
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
        } catch (e) {
             const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) { profileLink.click(); return true; }
                return false;
            });

            if (resultLink) {
                 sendSSE(res, { status: 'progress', message: 'พบข้อมูลบริษัท กำลังเปิดหน้าโปรไฟล์...' });
                 try {
                     await page.waitForSelector(printButtonSelector, { visible: true, timeout: 60000 });
                 } catch (retryErr) {
                     throw new Error('Timeout waiting for profile page.');
                 }
            } else {
                 throw new Error('Company not found or timed out.');
            }
        }

        // 1. Download Profile PDF
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดไฟล์ข้อมูลนิติบุคคล (PDF)...' });
        try {
            await page.click(printButtonSelector);
        } catch (clickErr) {
             await page.evaluate(() => {
                 const btns = Array.from(document.querySelectorAll('a, button'));
                 const printBtn = btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                 if (printBtn) printBtn.click();
             });
        }

        let profilePdf = null;
        let startTime = Date.now();
        while (Date.now() - startTime < 60000) {
            const files = await fs.readdir(tmpDir);
            const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));
            if (pdfFile) { profilePdf = path.join(tmpDir, pdfFile); break; }
            await new Promise(r => setTimeout(r, 500));
        }

        // 2. Download Balance Sheet
        sendSSE(res, { status: 'progress', message: 'กำลังไปที่หน้างบแสดงฐานะการเงิน...' });
        const financialTabHandle = await getElementByXPath(page, "//a[contains(., 'ข้อมูลงบการเงิน')]");
        const financialTab = financialTabHandle.asElement();

        if (financialTab) {
            await financialTab.hover();
            await new Promise(r => setTimeout(r, 1000));
            const statementLinkHandle = await getElementByXPath(page, "//a[normalize-space(.)='งบการเงิน']");
            if (statementLinkHandle) await statementLinkHandle.asElement().click();
        } else {
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('a, li, div, span'));
                const tab = items.find(el => el.innerText && el.innerText.trim() === 'ข้อมูลงบการเงิน');
                if (tab) tab.click();
            });
        }

        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('งบแสดงฐานะการเงิน'),
                { timeout: 60000 }
            );
        } catch (e) {}

        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดงบแสดงฐานะการเงิน...' });
        await downloadExcel('BalanceSheet');

        let balanceSheetExcel = null;
        startTime = Date.now();
        while (Date.now() - startTime < 60000) {
            const files = await fs.readdir(tmpDir);
            const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
            if (xlsxFile) {
                // Rename to avoid overwrite by next download
                const newPath = path.join(tmpDir, 'BalanceSheet.xlsx');
                await fs.move(path.join(tmpDir, xlsxFile), newPath);
                balanceSheetExcel = newPath;
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // 3. Download Income Statement
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดงบกำไรขาดทุน...' });
        let incomeTabHandle = await getElementByXPath(page, "//button[normalize-space(.)='งบกำไรขาดทุน'] | //a[normalize-space(.)='งบกำไรขาดทุน']");
        if (!incomeTabHandle) incomeTabHandle = await getElementByXPath(page, "//button[contains(., 'งบกำไรขาดทุน')] | //a[contains(., 'งบกำไรขาดทุน')]");

        if (incomeTabHandle) await incomeTabHandle.asElement().click();
        else {
             await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('button, a, li, span, div'));
                const tab = items.find(el => el.innerText && el.innerText.trim() === 'งบกำไรขาดทุน');
                if (tab) tab.click();
            });
        }

        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('รายได้หลัก') || document.body.innerText.includes('ต้นทุนขาย'),
                { timeout: 60000 }
            );
        } catch (e) {}

        await new Promise(r => setTimeout(r, 1000));
        await downloadExcel('IncomeStatement');

        let incomeStatementExcel = null;
        startTime = Date.now();
        while (Date.now() - startTime < 60000) {
            const files = await fs.readdir(tmpDir);
            // Look for new xlsx (not BalanceSheet.xlsx)
            const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx') && !f.includes('BalanceSheet'));
            if (xlsxFile) {
                const newPath = path.join(tmpDir, 'IncomeStatement.xlsx');
                await fs.move(path.join(tmpDir, xlsxFile), newPath);
                incomeStatementExcel = newPath;
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // 4. Download Financial Ratios
        sendSSE(res, { status: 'progress', message: 'กำลังดาวน์โหลดอัตราส่วนทางการเงิน...' });
        let ratioTabHandle = await getElementByXPath(page, "//button[normalize-space(.)='อัตราส่วนทางการเงิน'] | //a[normalize-space(.)='อัตราส่วนทางการเงิน']");
        if (!ratioTabHandle) ratioTabHandle = await getElementByXPath(page, "//button[contains(., 'อัตราส่วนทางการเงิน')] | //a[contains(., 'อัตราส่วนทางการเงิน')]");

        if (ratioTabHandle) await ratioTabHandle.asElement().click();
        else {
             await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('button, a, li, span, div'));
                const tab = items.find(el => el.innerText && el.innerText.trim() === 'อัตราส่วนทางการเงิน');
                if (tab) tab.click();
            });
        }

        try {
            await page.waitForFunction(
                () => document.body.innerText.includes('อัตราส่วนสภาพคล่อง') || document.body.innerText.includes('อัตราส่วนหนี้สินต่อส่วนของผู้ถือหุ้น'),
                { timeout: 60000 }
            );
        } catch (e) {}

        await new Promise(r => setTimeout(r, 1000));
        await downloadExcel('FinancialRatios');

        let ratioExcel = null;
        startTime = Date.now();
        while (Date.now() - startTime < 60000) {
            const files = await fs.readdir(tmpDir);
            const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx') && !f.includes('BalanceSheet') && !f.includes('IncomeStatement'));
            if (xlsxFile) {
                 const newPath = path.join(tmpDir, 'FinancialRatios.xlsx');
                await fs.move(path.join(tmpDir, xlsxFile), newPath);
                ratioExcel = newPath;
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        // Extract Data
        let extractionResult = {};
        if (profilePdf) {
             extractionResult = await extractDBDData(profilePdf);
        }

        // Prepare Base64 Data
        sendSSE(res, { status: 'progress', message: 'กำลังประมวลผลไฟล์...' });

        const profileB64 = profilePdf ? await readFileAsBase64(profilePdf) : null;
        const balanceB64 = balanceSheetExcel ? await readFileAsBase64(balanceSheetExcel) : null;
        const incomeB64 = incomeStatementExcel ? await readFileAsBase64(incomeStatementExcel) : null;
        const ratioB64 = ratioExcel ? await readFileAsBase64(ratioExcel) : null;

        // Clean up
        await browser.close().catch(() => {});
        browser = null;
        await fs.remove(tmpDir).catch(() => {});
        tmpDir = null;

        sendSSE(res, {
            status: 'complete',
            data: {
                profile: profileB64 ? {
                    content: profileB64,
                    mime: 'application/pdf',
                    filename: `DBD_Profile_${fileIdentifier}.pdf`
                } : null,
                balanceSheet: balanceB64 ? {
                    content: balanceB64,
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `DBD_BalanceSheet_${fileIdentifier}.xlsx`
                } : null,
                incomeStatement: incomeB64 ? {
                    content: incomeB64,
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `DBD_IncomeStatement_${fileIdentifier}.xlsx`
                } : null,
                financialRatios: ratioB64 ? {
                    content: ratioB64,
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    filename: `DBD_FinancialRatios_${fileIdentifier}.xlsx`
                } : null,
                yearsInBusiness: extractionResult.yearsInBusiness
            }
        });

    } catch (error) {
        console.error('[DBD Bridge] Error:', error);
        sendSSE(res, { status: 'error', message: error.message });
        if (browser) await browser.close().catch(() => {});
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
    } finally {
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`DBD Bridge Server running on http://localhost:${PORT}`);
});
