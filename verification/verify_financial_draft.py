from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Navigate with Feature Flag
        print("Navigating to Create Credit Request with Feature Flag...")
        page.goto("http://localhost:3000/create-credit-request?feature=financial_draft")

        # Wait for page load
        page.wait_for_load_state('networkidle')

        # 2. Mock API responses

        # Mock Suggestions (Autocomplete) - empty to avoid interference
        page.route("**/api/customers/suggestions*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[]'
        ))

        # Mock Customer Search
        page.route("**/api/customers/search?*", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='''[{
                "customer": {
                    "id": "00001AY",
                    "name": "Test Customer",
                    "address": "123 Test St",
                    "phone": "0812345678",
                    "payment_method": "Transfer",
                    "billing_requirement": "None",
                    "billing_method": "Email"
                },
                "history": [],
                "financial_summary": {},
                "credit_score": {}
            }]'''
        ))

        # Mock Credit Request Creation
        page.route("**/api/credit-requests", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='''{
                "data": {
                    "txId": "TMP-123456",
                    "status": "Draft",
                    "customer_no": "00001AY",
                    "customer_name": "Test Customer",
                    "attachments": []
                }
            }'''
        ))

        # Mock Comments (using wildcard for ID)
        page.route("**/api/credit-requests/*/comments", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"data": []}'
        ))

        # 3. Perform Search
        print("Searching for customer...")
        page.fill('input[placeholder*="ค้นหา"]', "Test Customer")
        page.click('button.btn-search')

        # Wait for Swal to close (it might take a moment for asyncs to finish)
        # We can wait for the tabs to appear, which happens after search
        print("Waiting for tabs...")
        try:
            page.wait_for_selector('.application-tabs', timeout=10000)
        except Exception as e:
            # If tabs don't appear, maybe Swal is still there. Take screenshot.
            print("Tabs did not appear. Taking screenshot...")
            page.screenshot(path="verification/timeout.png")
            raise e

        # 4. Switch to Financial Tab
        print("Switching to Financial Tab...")
        page.click('text=เอกสารการเงิน')

        # 5. Verify Financial Analysis Section
        print("Verifying Financial Analysis Section...")
        try:
            # Check for the specific header text in the new section
            expect(page.locator("text=การวิเคราะห์ทางการเงินและคะแนนเครดิต")).to_be_visible(timeout=5000)
            print("SUCCESS: Financial Analysis section is visible.")

            # Optional: Check console logs if we could access them, but checking visibility is enough
        except Exception as e:
            print("FAILURE: Financial Analysis section is NOT visible.")
            page.screenshot(path="verification/failure.png")
            raise e

        browser.close()

if __name__ == "__main__":
    run()
