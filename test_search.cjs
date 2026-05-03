const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('http://localhost:5173/create-credit-request', { waitUntil: 'networkidle0' });

    // Select Dev Role: Document Reviewer (ผู้ตรวจสอบเอกสาร) to enable the toggle
    const selects = await page.$$('select');
    if (selects.length > 0) {
      await page.select('select', 'ผู้ตรวจสอบเอกสาร');
      await new Promise(r => setTimeout(r, 1000));
    }

    // Search for the customer
    await page.type('input[placeholder*="ค้นหา"]', '01013AY');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('ค้นหา')) {
            await btn.click();
            break;
        }
    }

    // Wait for the result to load
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshot_search.png' });
    console.log('Screenshot saved to screenshot_search.png');
  } catch (e) {
    console.log('Error taking screenshot:', e.message);
  }

  await browser.close();
})();
