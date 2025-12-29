from playwright.sync_api import Page, expect, sync_playwright

def test_payment_condition_ui(page: Page):
    # 1. Arrange: Go to the create credit request page.
    page.goto("http://localhost:5173/create-credit-request")

    # 2. Act: Perform a customer search
    # Use the placeholder text seen in the screenshot
    search_input = page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท")
    expect(search_input).to_be_visible(timeout=10000)
    search_input.fill("01016AY")

    # Click the Search button
    search_button = page.get_by_role("button", name="ค้นหา")
    search_button.click()

    # Wait for the "ข้อมูลคำขอ" (Request Info) tab to appear and click it
    # This confirms the search was successful and the form is loaded
    request_info_tab = page.get_by_text("ข้อมูลคำขอ")
    expect(request_info_tab).to_be_visible(timeout=10000)
    request_info_tab.click()

    # 3. Verify Payment Section
    # Scroll down to ensure elements are in view (though Playwright auto-scrolls usually)

    # Check that Condition input is HIDDEN initially
    # We check for the labels that should appear next to the input
    expect(page.get_by_text("เงื่อนไขการโอนเงิน")).not_to_be_visible()
    expect(page.get_by_text("เงื่อนไขการรับเช็ค")).not_to_be_visible()

    # 4. Select "โอนเงิน" (Transfer)
    # Finding the select box. We look for the label "ชำระเงินโดย"
    # The select should be near it.
    # Based on the code structure: <div class="form-group"><label>...</label><select>...
    # We can try to locate the select by the option it contains, or by strict structure.
    # Let's try locating by the "ชำระเงินโดย" text and then finding the select within that container or nearby.

    # Using a more specific selector strategy for the dropdown
    # We know I added a class .payment-method-grid.
    # Inside it, there is a .form-group with label "ชำระเงินโดย"
    payment_select = page.locator(".payment-method-grid select")
    payment_select.select_option(label="โอนเงิน")

    # 5. Verify Condition Input Appears with "เงื่อนไขการโอนเงิน"
    expect(page.get_by_text("เงื่อนไขการโอนเงิน")).to_be_visible()

    # Fill something in the condition to ensure it's interactive
    condition_input = page.locator(".payment-method-grid input")
    condition_input.fill("ภายใน 30 วัน")

    # 6. Select "รับเช็ค" (Cheque)
    payment_select.select_option(label="รับเช็ค")

    # 7. Verify Label Changes to "เงื่อนไขการรับเช็ค"
    expect(page.get_by_text("เงื่อนไขการรับเช็ค")).to_be_visible()
    expect(page.get_by_text("เงื่อนไขการโอนเงิน")).not_to_be_visible()

    # 8. Screenshot for final verification
    page.screenshot(path="/home/jules/verification/payment_condition_verified.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_payment_condition_ui(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="/home/jules/verification/failure_retry.png")
            raise e
        finally:
            browser.close()
