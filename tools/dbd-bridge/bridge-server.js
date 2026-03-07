const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const pdf = require('pdf-parse');

const app = express();
const PORT = 4343;

app.use(cors());

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'DBD Bridge is running' });
});

// Helper to send SSE messages
const sendSSE = (res, data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

/**
 * Extract data from DBD Profile PDF
 */
const extractDBDData = async (pdfPath) => {
    try {
        console.log(`[DBD Extract] Reading PDF: ${pdfPath}`);
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await pdf(dataBuffer);
        const text = data.text;

        let yearsInBusiness = null;
        let dbdCompanyName = null;
        const dateRegex = /วันที่จดทะเบียนจัดตั้ง\s*[:]\s*(\d{2}\/\d{2}\/\d{4})/;
        const match = text.match(dateRegex);

        if (match) {
            const dateStr = match[1]; // e.g. "29/01/2516"
            const parts = dateStr.split('/');
            const yearBE = parseInt(parts[2]);
            const currentYearBE = new Date().getFullYear() + 543;
            yearsInBusiness = currentYearBE - yearBE;
        }

        const nameRegex = /ชื่อนิติบุคคล\s*[:]\s*([^\n]+)/;
        const nameMatch = text.match(nameRegex);
        if (nameMatch) {
            dbdCompanyName = nameMatch[1].trim();
        } else {
            // Heuristic prefix match
            const prefixRegex = /(?:ห้างหุ้นส่วนจำกัด|บริษัท|บ\.|หจก\.)\s+[^\n]+/;
            const prefixMatch = text.match(prefixRegex);
            if (prefixMatch) {
                let extractedName = prefixMatch[0].trim();
                const endLabels = ["ข้อมูล", "เลขทะเบียน", "วันที่", "เอกสาร"];
                for (const label of endLabels) {
                    const idx = extractedName.indexOf(label);
                    if (idx > 0) {
                        extractedName = extractedName.substring(0, idx).trim();
                    }
                }
                if (extractedName.length > 5) {
                    dbdCompanyName = extractedName;
                }
            }
        }

        return { yearsInBusiness, dbdCompanyName };
    } catch (error) {
        console.error('[DBD Extract] Error:', error.message);
    }
    return { yearsInBusiness: null, dbdCompanyName: null };
};

app.get('/stream', async (req, res) => {
    const { taxId, companyName } = req.query;
    const query = taxId || companyName;

    console.log(`[Bridge] Received request for: ${query}`);

    if (!query) {
        return res.status(400).json({ success: false, message: 'Tax ID or Company Name is required' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
    });

    let browser = null;
    let tmpDir = null;

    req.on('close', async () => {
        console.log('[Bridge] Client disconnected. Cleaning up...');
        if (browser) await browser.close().catch(() => {});
        if (tmpDir) await fs.remove(tmpDir).catch(() => {});
    });

    try {
        sendSSE(res, { status: 'progress', message: 'Starting local browser...' });

        tmpDir = path.join(os.tmpdir(), `dbd-local-${Date.now()}`);
        await fs.ensureDir(tmpDir);

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--window-size=1200,800'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

        const client = await page.target().createCDPSession();
        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: tmpDir,
        });

        // 1. Navigate
        sendSSE(res, { status: 'progress', message: 'Connecting to DBD DataWarehouse...' });
        await page.goto('https://datawarehouse.dbd.go.th/', { waitUntil: 'networkidle2', timeout: 60000 });

        // Popup Handling
        try {
            await new Promise(r => setTimeout(r, 2000));
            await page.keyboard.press('Escape');

            // Cookie Consent
            const cookieClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button, a'));
                const acceptBtn = buttons.find(el =>
                    el.innerText && (el.innerText.includes('ยอมรับทั้งหมด') || el.innerText.includes('Accept All'))
                );
                if (acceptBtn) { acceptBtn.click(); return true; }
                return false;
            });
            if(cookieClicked) await new Promise(r => setTimeout(r, 1000));

        } catch (e) { console.warn('Popup warning:', e.message); }

        // 2. Search
        sendSSE(res, { status: 'progress', message: `Searching for: ${query}...` });
        const targetSelector = 'input[placeholder*="ค้นหาด้วยชื่อ"]';
        await page.waitForSelector(targetSelector, { visible: true, timeout: 10000 });
        await page.click(targetSelector);
        await page.type(targetSelector, query, { delay: 100 });
        await page.keyboard.press('Enter');

        // 3. Wait for Results/Profile
        sendSSE(res, { status: 'progress', message: 'Waiting for results...' });
        const printButtonSelector = 'div.dropdown.print > a.btn-print';

        try {
            await page.waitForSelector(printButtonSelector, { visible: true, timeout: 30000 });
        } catch (e) {
            // Check for list result
            const resultLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                const profileLink = links.find(l => l.href && l.href.includes('company/profile'));
                if (profileLink) { profileLink.click(); return true; }
                return false;
            });

            if (resultLink) {
                 sendSSE(res, { status: 'progress', message: 'Found entry, opening profile...' });
                 await page.waitForSelector(printButtonSelector, { visible: true, timeout: 30000 });
            } else {
                 throw new Error('Company not found or timeout');
            }
        }

        // 4. Download PDF
        sendSSE(res, { status: 'progress', message: 'Downloading Profile PDF...' });
        try {
             await page.click(printButtonSelector);
        } catch (clickErr) {
             await page.evaluate(() => {
                 const btns = Array.from(document.querySelectorAll('a, button'));
                 const printBtn = btns.find(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                 if (printBtn) printBtn.click();
             });
        }

        // Wait for PDF
        let profilePdf = null;
        let startTime = Date.now();
        while (Date.now() - startTime < 30000) {
            const files = await fs.readdir(tmpDir);
            const pdfFile = files.find(f => f.toLowerCase().endsWith('.pdf'));
            if (pdfFile) {
                profilePdf = path.join(tmpDir, pdfFile);
                break;
            }
            await new Promise(r => setTimeout(r, 500));
        }

        if (!profilePdf) throw new Error('PDF Download timed out');

        // --- NEW: Check for "No Financial Data" (ไม่พบข้อมูล) before continuing ---
        sendSSE(res, { status: 'progress', message: 'Checking Financial Data Status...' });

        let hasFinancialData = true;

        // Click Tab
        await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('a, li, div, span'));
            const tab = items.find(el => el.innerText && el.innerText.trim() === 'ข้อมูลงบการเงิน');
            if (tab) tab.click();
        });
        await new Promise(r => setTimeout(r, 1500));

        // Check if "ไม่พบข้อมูล" (No Data Found) is displayed
        const noDataFound = await page.evaluate(() => {
            return document.body.innerText.includes('ไม่พบข้อมูล');
        });

        if (noDataFound) {
            console.log(`[Bridge] "ไม่พบข้อมูล" detected. Skipping financial documents for ${query}.`);
            hasFinancialData = false;
            sendSSE(res, { status: 'progress', message: 'No financial data submitted to DBD (Skipping Excel)' });
        }

        let balanceSheetExcel = null;

        if (hasFinancialData) {
            // Click Sub-item
            await page.evaluate(() => {
                const items = Array.from(document.querySelectorAll('a, li'));
                const tab = items.find(el => el.innerText && el.innerText.includes('งบการเงิน'));
                if (tab) tab.click();
            });

            // Wait for table
            try {
                await page.waitForFunction(
                    () => document.body.innerText.includes('งบแสดงฐานะการเงิน'),
                    { timeout: 30000 }
                );
            } catch(e) {}

            // Download Excel
            sendSSE(res, { status: 'progress', message: 'Downloading Balance Sheet (Excel)...' });

            // Open Print Menu
            await page.evaluate(() => {
                 const buttons = Array.from(document.querySelectorAll('button, a'));
                 const printBtns = buttons.filter(b => b.innerText && b.innerText.includes('พิมพ์ข้อมูล'));
                 if (printBtns.length > 0) printBtns[printBtns.length - 1].click();
            });

            await new Promise(r => setTimeout(r, 1000));

            // Click Excel
            await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a, li, span'));
                const excelBtn = links.find(l => l.innerText && l.innerText.includes('พิมพ์ Excel'));
                if (excelBtn) excelBtn.click();
            });

            // Wait for Excel
            startTime = Date.now();
            while (Date.now() - startTime < 30000) {
                const files = await fs.readdir(tmpDir);
                const xlsxFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
                if (xlsxFile) {
                    balanceSheetExcel = path.join(tmpDir, xlsxFile);
                    break;
                }
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // 6. Process Files
        sendSSE(res, { status: 'progress', message: 'Processing files...' });

        const { yearsInBusiness, dbdCompanyName } = await extractDBDData(profilePdf);

        const pdfBase64 = await fs.readFile(profilePdf, 'base64');
        const excelBase64 = balanceSheetExcel ? await fs.readFile(balanceSheetExcel, 'base64') : null;

        sendSSE(res, {
            status: 'complete',
            noFinancialData: !hasFinancialData,
            data: {
                profile: {
                    filename: `DBD_Profile_${query}.pdf`,
                    content: pdfBase64,
                    mime: 'application/pdf'
                },
                balanceSheet: excelBase64 ? {
                    filename: `DBD_BalanceSheet_${query}.xlsx`,
                    content: excelBase64,
                    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                } : null,
                yearsInBusiness,
                dbdCompanyName
            }
        });

    } catch (error) {
        console.error('[Bridge] Error:', error);
        sendSSE(res, { status: 'error', message: error.message });
    } finally {
        if (browser) await browser.close();
        if (tmpDir) await fs.remove(tmpDir);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`DBD Local Bridge running at http://localhost:${PORT}`);
});
