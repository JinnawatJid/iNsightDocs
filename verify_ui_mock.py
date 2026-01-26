from playwright.sync_api import sync_playwright
import time
import json

def verify_ui_mock():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        # Mock Search Response
        def handle_search(route):
            print(f"Intercepted search: {route.request.url}")
            mock_response = [
                {
                    "customer": {
                        "id": "MOCK001",
                        "name": "บริษัท Mock จำกัด", # MUST contain 'บริษัท' for isCompany=true
                        "tax_id": "1234567890123",
                        "type": "Company",
                        "address": "123 Mock St",
                        "years_in_business": 5
                    },
                    "history": [],
                    "financial_summary": {},
                    "credit_score": {},
                    "_source": "mock"
                }
            ]
            route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(mock_response)
            )

        # Intercept API calls
        page.route("**/api/customers/search?*", handle_search)

        print("Navigating...")
        page.goto("http://localhost:5173/create-credit-request")
        time.sleep(2)

        if "login" in page.url:
             print("Logging in...")
             page.fill("input[type='email']", "user@example.com")
             page.fill("input[type='password']", "password")
             page.click("button[type='submit']")
             page.wait_for_url("**/create-credit-request")
             time.sleep(2)

        print("Searching for customer...")
        search_input = page.locator("input[placeholder*='ค้นหา']")
        if search_input.count() > 0:
            search_input.fill("Mock")
            time.sleep(2)

            search_btn = page.locator("button:has-text('ค้นหา')")
            if search_btn.count() > 0:
                 search_btn.click()
            else:
                 search_input.press("Enter")

            try:
                suggestion = page.locator(".suggestion-item, .search-result-item").first
                if suggestion.is_visible(timeout=3000):
                    suggestion.click()
            except:
                print("No suggestion dropdown, maybe auto-selected or table list?")

        else:
            print("Search input not found")

        # Wait for "เอกสารการเงิน" tab
        print("Waiting for tabs...")
        try:
            page.wait_for_selector("text=เอกสารการเงิน", timeout=5000)
            print("Clicking 'เอกสารการเงิน' tab...")
            page.click("text=เอกสารการเงิน")
            time.sleep(1)
        except Exception as e:
            print(f"Could not find tab: {e}")
            page.screenshot(path="verification_mock_fail_tab.png")
            return

        # Scroll to view Financial Analysis
        print("Scrolling...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_ui_final.png", full_page=True)

        # Verify text
        content = page.content()
        checks = [
            ("คลิกเพื่ออัปโหลด", "Thai Upload Text"),
            ("ข้อมูลบริษัท (Company Profile)", "Company Profile Label"),
            ("งบแสดงฐานะการเงิน (Balance Sheet)", "Balance Sheet Label")
        ]

        all_passed = True
        for text, label in checks:
            if text in content:
                print(f"SUCCESS: {label} found.")
            else:
                print(f"FAILURE: {label} NOT found.")
                all_passed = False

        # Verify Grid Class
        if page.locator(".upload-grid-small").count() > 0:
             print("SUCCESS: .upload-grid-small class found.")
        else:
             print("FAILURE: .upload-grid-small class NOT found.")
             all_passed = False

        if all_passed:
            print("VERIFICATION PASSED")

        browser.close()

if __name__ == "__main__":
    verify_ui_mock()
