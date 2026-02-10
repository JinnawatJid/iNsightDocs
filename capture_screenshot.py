import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = context.new_page()

    # Define API Mocks
    def handle_customers(route):
        route.fulfill(json=[
                {
                    "customer": {
                        "id": "CUST001",
                        "name": "Test Company Co., Ltd.",
                        "address": "123 Test St",
                        "current_credit_limit": 0,
                        "payment_terms_code": "30"
                    },
                    "_source": "api",
                    "history": [],
                    "financial_summary": {},
                    "credit_score": {}
                }
            ]
        )

    def handle_create_request(route):
        route.fulfill(json={
            "data": {
                "txId": "TX-MOCK-001",
                "status": "Draft",
                "customer_no": "CUST001",
                "request_type": None
            }
        })

    def handle_get_comments(route):
        route.fulfill(json={"data": []})

    page.route("**/api/customers/search?q=*", handle_customers)
    page.route("**/api/customers**", handle_customers)
    page.route("**/api/credit-requests", handle_create_request)
    page.route("**/api/credit-requests/*/comments", handle_get_comments)

    page.goto("http://localhost:5173/create-credit-request")

    # Wait for initial load
    page.wait_for_selector(".credit-header")

    # Perform Search
    search_input = page.locator("input[placeholder*='ค้นหาด้วย']")
    search_input.fill("CUST001")
    page.keyboard.press("Enter")

    # Wait for "Create Request +" button
    create_btn = page.locator("button:has-text('สร้างคำขอเครดิต +')")
    create_btn.wait_for(state="visible", timeout=5000)

    # Select Request Type
    create_btn.click()
    new_credit_option = page.locator(".type-item:has-text('เครดิตใหม่')")
    new_credit_option.wait_for(state="visible")
    new_credit_option.click()

    # Verify Fields Appear
    page.wait_for_selector("input[placeholder='ระบุวงเงินที่ต้องการ']", state="visible", timeout=5000)

    # Take Screenshot
    page.screenshot(path="final_screenshot.png", full_page=True)
    print("Screenshot saved to final_screenshot.png")

    browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
