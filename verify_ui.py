from playwright.sync_api import sync_playwright, expect
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to verify the layout properly
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        print("Navigating...")
        page.goto("http://localhost:5173/create-credit-request")
        time.sleep(3)

        # Login if needed
        if "login" in page.url:
            print("Logging in...")
            page.fill("input[type='email']", "user@example.com")
            page.fill("input[type='password']", "password")
            page.click("button[type='submit']")
            page.wait_for_url("**/create-credit-request")
            time.sleep(2)

        print("Searching for customer...")
        # Type in search
        search_input = page.locator("input[placeholder*='ค้นหา']")
        if search_input.count() > 0:
            search_input.fill("บริษัท") # Search for company to trigger isCompany=true
            time.sleep(3) # Wait for suggestions

            # Click first suggestion
            suggestion = page.locator(".suggestion-item").first
            if suggestion.count() > 0:
                print("Clicking suggestion...")
                suggestion.click()
            else:
                print("No suggestions found, trying Enter...")
                search_input.press("Enter")
        else:
            print("Search input not found")

        time.sleep(2)

        # Go to Financial Tab (StoreStatementTab)
        print("Clicking 'เอกสารการเงิน' tab...")
        # The tab text might be "เอกสารการเงิน"
        # Wait for tab to appear
        try:
            page.wait_for_selector("text=เอกสารการเงิน", timeout=5000)
            page.click("text=เอกสารการเงิน")
            time.sleep(1)
        except Exception as e:
            print(f"Could not find tab: {e}")
            page.screenshot(path="verification_fail_tab.png")
            return

        # Scroll to view
        print("Scrolling...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(1)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_ui.png", full_page=True)

        # Verify text
        content = page.content()
        if "คลิกเพื่ออัปโหลด" in content:
            print("SUCCESS: Thai text found.")
        else:
            print("FAILURE: Thai text NOT found.")

        browser.close()

if __name__ == "__main__":
    verify_ui()
