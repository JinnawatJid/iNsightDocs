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

            print("Checking initial state (3 items)...")
            expect(page.get_by_text("Category A")).to_be_visible()
            # Assuming Category G is the second one based on previous run
            expect(page.get_by_text("Category G")).to_be_visible()

            # The 4th item (Category C) should NOT be visible initially
            # Wait a bit to ensure rendering is complete
            page.wait_for_timeout(1000)

            # Verify the 4th item is hidden
            if page.get_by_text("Category C").is_visible():
                 raise Exception("Category C should be hidden initially")

            # Count the items
            items = page.locator(".category-row").count()
            print(f"Initial visible items: {items}")
            assert items == 3, f"Expected 3 items, found {items}"

            print("Testing Expand (Show More)...")
            show_more_btn = page.get_by_role("button", name="ดูทั้งหมด")
            expect(show_more_btn).to_be_visible()
            show_more_btn.click()

            # Wait for expansion
            expect(page.get_by_text("Category C")).to_be_visible()

            items_expanded = page.locator(".category-row").count()
            print(f"Expanded visible items: {items_expanded}")
            assert items_expanded > 3, f"Expected > 3 items, found {items_expanded}"

            print("Testing Collapse (Show Less)...")
            show_less_btn = page.get_by_role("button", name="แสดงน้อยลง")
            expect(show_less_btn).to_be_visible()
            show_less_btn.click()

            # Wait for collapse
            expect(page.get_by_text("Category C")).not_to_be_visible()

            items_collapsed = page.locator(".category-row").count()
            print(f"Collapsed visible items: {items_collapsed}")
            assert items_collapsed == 3, f"Expected 3 items, found {items_collapsed}"

            print("Taking screenshot...")
            page.screenshot(path="verification/category_breakdown_toggle.png", full_page=True)
            print("Screenshot saved to verification/category_breakdown_toggle.png")

        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    test_category_breakdown()
