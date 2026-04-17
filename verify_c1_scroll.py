from playwright.sync_api import sync_playwright
import time

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context()
        context.add_cookies([{
            "name": "dev_role",
            "value": "%E0%B8%9C%E0%B8%B9%E0%B9%89%E0%B8%94%E0%B8%B9%E0%B9%81%E0%B8%A5%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%9A",
            "domain": "localhost",
            "path": "/"
        }])

        page = context.new_page()
        page.goto("http://localhost:5174/configuration")
        page.locator("text='โมเดลให้คะแนน'").click()
        page.wait_for_selector(".accordion-header", timeout=5000)
        time.sleep(1)

        # Scroll down to asset_ownership inside C1
        asset_ownership_row = page.locator("text='asset_ownership'")
        asset_ownership_row.scroll_into_view_if_needed()
        time.sleep(1)

        page.screenshot(path="asset_ownership_view.png")
        browser.close()

if __name__ == "__main__":
    main()
