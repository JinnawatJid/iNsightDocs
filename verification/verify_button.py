
import os
import time
from playwright.sync_api import sync_playwright, expect

# 1. Create Mock Excel
os.makedirs("verification", exist_ok=True)
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.append(["Customer ID"])
ws.append(["CUST001"]) # Case 1: Done (Int) - No Tax ID
wb.save("verification/mock_customers.xlsx")

def run(page):
    # Mock Bridge Health
    page.route("**/health", lambda route: route.fulfill(status=200))

    # Mock Customer Search
    page.route("**/api/customers/search?q=CUST001", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''[
            {
                "customer": {
                    "id": "CUST001",
                    "name": "Mr. John Doe",
                    "tax_id": "",
                    "current_credit_limit": 100000,
                    "payment_terms_code": "30D",
                    "customer_since": "2020-01-01"
                },
                "financial_summary": {
                    "total_purchase_3_months": 50000
                }
            }
        ]'''
    ))

    # Mock Analysis API
    page.route("**/api/financials/analyze", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body='''{
            "success": true,
            "scoringResult": {
                "totalScore": 80,
                "grade": "A",
                "recommendedLimit": 150000
            }
        }'''
    ))

    print("Navigating...")
    # Go to page
    page.goto("http://localhost:5173/batch-automation")

    print("Uploading File...")
    page.set_input_files('input[type="file"]', "verification/mock_customers.xlsx")

    # Dismiss Success Alert
    print("Dismissing Alert...")
    page.click("button.swal2-confirm")

    # Wait for table to populate
    print("Waiting for table...")
    expect(page.get_by_text("CUST001")).to_be_visible()

    # Click Start
    print("Clicking Start...")
    page.click("button.btn-primary")

    # Wait for Processing -> Done (Int)
    print("Waiting for completion...")
    # Status should be "Done (Int)" or "เสร็จสิ้น (ภายใน)"
    expect(page.locator(".status-badge").filter(has_text="เสร็จสิ้น (ภายใน)")).to_be_visible(timeout=10000)

    # CHECK BUTTON VISIBILITY
    print("Checking button visibility...")
    btn = page.locator("button.btn-view-report").first
    expect(btn).to_be_visible()

    # Screenshot
    page.screenshot(path="verification/verification_button_fix.png")
    print("Verification Successful!")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        run(page)
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()
