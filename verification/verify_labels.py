from playwright.sync_api import sync_playwright, expect

def test_blacklist_alert(page):
    # 1. Arrange: Go to Create Credit Request page
    page.goto("http://localhost:5173/create-credit-request")

    # 2. Act: Search for the blacklisted customer (40035RB)
    # Wait for input to be visible
    search_input = page.locator("input.form-input")
    expect(search_input).to_be_visible()

    # Fill in the ID
    search_input.fill("40035RB")

    # Click search button
    page.locator("button.btn-search").click()

    # 3. Assert: Expect SweetAlert2 popup
    alert_title = page.locator(".swal2-title")
    expect(alert_title).to_contain_text("แจ้งเตือน: ลูกค้ารายนี้อยู่ในบัญชี Blacklist", timeout=30000)

    # Check buttons exist (we can't easily check text with simple locator if we don't know the class, but swal2-confirm and swal2-cancel are standard)
    confirm_btn = page.locator(".swal2-confirm")
    cancel_btn = page.locator(".swal2-cancel")

    expect(confirm_btn).to_be_visible()
    expect(cancel_btn).to_be_visible()

    print("Confirm Button Text:", confirm_btn.inner_text())
    print("Cancel Button Text:", cancel_btn.inner_text())

    # 4. Screenshot
    page.screenshot(path="/home/jules/verification/blacklist_labels.png")
    print("Verification passed! Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_blacklist_alert(page)
        except Exception as e:
            print(f"Test failed: {e}")
            raise e
        finally:
            browser.close()
