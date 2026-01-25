
from playwright.sync_api import sync_playwright, expect

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate with Feature Flag
        # Targeted Vite Dev Server
        print("Navigating to Create Request page with feature flag...")
        page.goto("http://localhost:5173/create-credit-request?feature=financial_draft")

        # 2. Search for a customer to unlock tabs
        print("Searching for customer '00001AY'...")
        # Use exact placeholder or a simpler selector
        page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท").fill("00001AY")

        # Click Search Button
        page.click('button:has-text("ค้นหา")')

        # Wait for results / Tabs to appear
        print("Waiting for customer data to load...")
        # Wait for tabs container to be visible
        expect(page.locator('.application-tabs')).to_be_visible(timeout=10000)

        # 3. Switch to "Financial Documents" tab (เอกสารการเงิน)
        print("Switching to Financial Documents tab...")
        page.locator('div.tab-item', has_text="เอกสารการเงิน").click()

        # 4. Verify Financial Analysis Section is Visible
        print("Verifying Financial Analysis Section...")
        section = page.locator('[data-testid="financial-analysis-section"]')
        expect(section).to_be_visible()

        print("Financial Analysis Section is VISIBLE!")

        # 5. Take Screenshot
        page.screenshot(path="verification/financial_draft_visible.png", full_page=True)
        print("Screenshot saved to verification/financial_draft_visible.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
