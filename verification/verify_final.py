
from playwright.sync_api import sync_playwright, expect

def verify_final():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the root
            page.goto("http://localhost:5173")

            # Wait for the app to load
            page.wait_for_load_state("networkidle")

            # Check if we are on the right page
            if "/pending-request-old" not in page.url:
                print(f"Warning: URL is {page.url}, expected /pending-request-old")

            # Check if main element is visible
            expect(page.locator("h1")).to_have_text("คำขอเครดิตใหม่")

            # Take a screenshot
            page.screenshot(path="verification/final_check.png")
            print("Screenshot saved to verification/final_check.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_final()
