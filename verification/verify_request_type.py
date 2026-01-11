
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to the app
    page.goto("http://localhost:5173")

    # Use the correct placeholder found in the code
    selector = 'input[placeholder="ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"]'

    # Wait for the search input
    page.wait_for_selector(selector)

    # Type '01016AY' (Reserved ID from AGENTS.md/memory)
    page.fill(selector, "01016AY")

    # Press Enter to search
    page.press(selector, "Enter")

    # Wait for the history sidebar to load
    # Based on CreateCreditRequest.vue, it loads CreditHistorySidebar
    # I need to wait for .credit-history-sidebar
    page.wait_for_selector('.credit-history-sidebar', timeout=15000)

    # Wait for history items to populate
    # The history list renders .history-item
    page.wait_for_selector('.history-item', timeout=15000)

    # Wait for the new request-type element to be visible
    # Note: It only appears if item.requestType is present.
    # Since I updated the backend to return 'เครดิตใหม่' by default if null, it should be there.
    page.wait_for_selector('.request-type', timeout=5000)

    # Take a screenshot of the sidebar
    element = page.locator('.credit-history-sidebar')
    element.screenshot(path="verification/history_sidebar.png")

    print("Screenshot taken successfully")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
