from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        # Set a dummy role cookie to bypass authentication
        context.add_cookies([{
            "name": "dev_role",
            "value": "%E0%B8%9C%E0%B8%B9%E0%B9%89%E0%B8%94%E0%B8%B9%E0%B9%81%E0%B8%A5%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A", # Admin role URL encoded
            "domain": "localhost",
            "path": "/"
        }])

        page = context.new_page()
        page.goto("http://localhost:5174/configuration")

        # Click on the Scorecards tab
        page.locator("text='โมเดลให้คะแนน'").click()

        # Wait for the tab to load and data to appear
        page.wait_for_selector(".accordion-header", timeout=5000)
        time.sleep(1) # wait for the accordion to render

        # Take screenshot of the initial state (C1 expanded)
        page.screenshot(path="accordion_initial.png")

        # Click C2 to expand it
        c2_header = page.locator(".accordion-header:has-text('C2')")
        c2_header.click()
        time.sleep(1) # wait for animation

        # Take screenshot of C2 expanded
        page.screenshot(path="accordion_c2_expanded.png")

        browser.close()

if __name__ == "__main__":
    main()
