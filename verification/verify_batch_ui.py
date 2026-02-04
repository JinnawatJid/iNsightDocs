from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the hidden route
        print("Navigating to /batch-automation...")
        page.goto("http://localhost:5173/batch-automation")

        # Verify Header
        expect(page.get_by_role("heading", name="Batch Credit Automation")).to_be_visible()
        print("Header found.")

        # Verify Upload Area
        expect(page.get_by_text("Click or Drag Excel File Here")).to_be_visible()
        print("Upload area found.")

        # Verify Start Button is disabled
        start_btn = page.get_by_role("button", name="Start Batch")
        expect(start_btn).to_be_disabled()
        print("Start button is correctly disabled.")

        # Verify Bridge IP Input exists
        expect(page.get_by_placeholder("Localhost or Bridge IP")).to_be_visible()
        print("Bridge IP input found.")

        # Take screenshot
        screenshot_path = "verification/batch_ui_initial.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    run()
