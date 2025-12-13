import { test, expect } from '@playwright/test';

test.describe('Create Credit Request E2E', () => {
  // Use the ID requested by the user
  const CUSTOMER_ID = '01016AY';

  test.beforeEach(async ({ page }) => {
    // Navigate to the root URL (configured in playwright.config.js)
    await page.goto('/');
  });

  test('TS01: Happy Path - Search customer and submit credit request', async ({ page }) => {
    // 1. Search for Customer
    // The placeholder is "ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
    const searchInput = page.getByPlaceholder('ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท');
    await searchInput.fill(CUSTOMER_ID);

    // Wait for the dropdown suggestion to appear
    // The component logic triggers search on input > 3 chars after debounce
    // We expect a suggestion item containing the ID
    const suggestionItem = page.locator('.suggestion-item').first();
    await suggestionItem.waitFor({ state: 'visible', timeout: 5000 });
    await suggestionItem.click();

    // 2. Verify Form Loaded
    // We check if the General Info tab is visible by checking a unique label
    await expect(page.getByText('ชื่อจริงและนามสกุล')).toBeVisible();

    // 3. Tab 1: General Info
    // Fill "Position" (placeholder: "เจ้าหน้าที่ใส่")
    await page.getByPlaceholder('เจ้าหน้าที่ใส่').first().fill('Owner');

    // Fill "Credit Amount" - Note: placeholder might be same, so use label or order
    // Using locator with label text is safer
    // The label is "วงเงินสินเชื่อที่ต้องการ *"
    // But text might have * inside a span. getByLabel might fail if structure is complex.
    // Let's use getByPlaceholder("เจ้าหน้าที่ใส่").nth(1) if order is fixed, or better:
    // Finding input near text "วงเงินสินเชื่อที่ต้องการ"
    const creditAmountInput = page.locator('div.form-group', { hasText: 'วงเงินสินเชื่อที่ต้องการ' }).locator('input');
    await creditAmountInput.fill('50000');

    // 4. Tab 2: Residence
    // The tab label is "ที่อยู่อาศัย"
    await page.getByText('ที่อยู่อาศัย').click();

    // Verify Address input exists (it should be pre-filled, we just check visibility)
    await expect(page.locator('div.form-group', { hasText: 'ที่อยู่ (บ้านเลขที่, ถนน)' }).locator('input')).toBeVisible();

    // Fill Phone if empty (though mock might have it). Let's fill it to be safe.
    const phoneInput = page.locator('div.form-group', { hasText: 'เบอร์โทรศัพท์' }).locator('input');
    await phoneInput.clear();
    await phoneInput.fill('081-234-5678');

    // 5. Tab 3: Store/Company
    await page.locator('.tab-item').nth(2).click(); // 'ร้านค้า/บริษัท'

    // Check "Same as Residence"
    await page.locator('#sameAddress').check();

    // 6. Tab 4: Financial
    await page.locator('.tab-item').nth(3).click(); // 'เดินบัญชี' or similar

    // Fill Account Name
    await page.locator('div.form-group', { hasText: 'ชื่อบัญชี' }).locator('input').fill('Test Account');
    // Fill Account Number
    await page.locator('div.form-group', { hasText: 'เลขที่บัญชี' }).locator('input').fill('1234567890');

    // 7. Submit
    // Click "ส่งคำขอเครดิต" button
    // It's in the footer
    const submitBtn = page.locator('button.btn-submit');
    await submitBtn.scrollIntoViewIfNeeded();

    // We need to mock the POST request to avoid poluting real DB?
    // User said "just leave them in the DB as test artifacts". So we execute real submit.
    // However, validation might require files.
    // The form requires files: ID Card, Home Reg, Home Photo, etc.
    // Since we didn't upload files in this script (it's hard to mock file upload without actual files),
    // we might fail validation.
    // Strategy: Create dummy file on fly or use a simple buffer.

    // File Upload Handling
    // We need to upload dummy files for required fields to pass validation.
    const buffer = Buffer.from('dummy content');
    const file = {
      name: 'test.jpg',
      mimeType: 'image/jpeg',
      buffer,
    };

    // Go back to Tab 1
    await page.locator('.tab-item').nth(0).click();
    // Upload ID Card
    const idCardInput = page.locator('input[type="file"]').nth(0); // Assuming order
    await idCardInput.setInputFiles(file);
    // Upload Home Reg
    const homeRegInput = page.locator('input[type="file"]').nth(1);
    await homeRegInput.setInputFiles(file);

    // Go to Tab 2
    await page.locator('.tab-item').nth(1).click();
    // Upload Home Photo
    const homePhotoInput = page.locator('.residence-tab input[type="file"]').nth(0);
    await homePhotoInput.setInputFiles(file);
    // Upload Land Tax
    const landTaxInput = page.locator('.residence-tab input[type="file"]').nth(1);
    await landTaxInput.setInputFiles(file);

    // Tab 3 (Store) - If "Same Address" is checked, do we need uploads?
    // StoreCompanyTab logic: "Individual/Store Uploads" are required.
    // We need to go there.
    await page.locator('.tab-item').nth(2).click();
    // Upload Store Photo
    const storePhotoInput = page.locator('.store-company-tab input[type="file"]').nth(0);
    await storePhotoInput.setInputFiles(file);
    // Upload Com Reg
    const comRegInput = page.locator('.store-company-tab input[type="file"]').nth(1);
    await comRegInput.setInputFiles(file);
    // Upload Store Land Tax
    const storeLandTaxInput = page.locator('.store-company-tab input[type="file"]').nth(2);
    await storeLandTaxInput.setInputFiles(file);

    // Tab 4 (Financial)
    await page.locator('.tab-item').nth(3).click();
    // Upload Statement
    const stmtInput = page.locator('.store-statement-tab input[type="file"]').first();
    await stmtInput.setInputFiles(file);

    // NOW Submit
    await submitBtn.click();

    // 8. Assert Success
    // SweetAlert2 usually shows a popup with title "สำเร็จ" or "Success"
    // We wait for swal popup
    await expect(page.locator('.swal2-popup')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.swal2-title')).toContainText('สำเร็จ'); // Or "Success" depending on locale
  });
});
