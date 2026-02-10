from playwright.sync_api import Page, expect, sync_playwright
import re
import time

def test_category_breakdown():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to page...")
            page.goto("http://localhost:5173/create-credit-request")

            print("Searching for customer...")
            search_input = page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท")
            expect(search_input).to_be_visible()

            search_input.fill("01013AY")
            search_input.press("Enter")

            print("Waiting for results...")
            breakdown_header = page.get_by_text("สัดส่วนสินค้าที่ซื้อ (6 เดือนย้อนหลัง)")
            expect(breakdown_header).to_be_visible(timeout=20000)

            print("Checking category content...")
            expect(page.get_by_text("Category A")).to_be_visible()
            expect(page.get_by_text("Category G")).to_be_visible()

            print("Taking screenshot...")
            page.screenshot(path="verification/category_breakdown.png", full_page=True)
            print("Screenshot saved to verification/category_breakdown.png")

        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    time.sleep(5) # Give servers time to start
    test_category_breakdown()
