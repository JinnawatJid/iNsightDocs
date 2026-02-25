from playwright.sync_api import sync_playwright
import time
import os

def verify_formatting_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Mock API: /api/customers/by-branch
        # Return mock data with 'B00CR15' to test 'ไม่มีวางบิล'
        page.route("**/api/customers/by-branch**", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"No_":"CUST001","Name":"Test Company","VAT_Registration_No_":"123456789","Fixed_Credit_Limit":500000,"Payment_Terms_Code":"15","Billing_Terms_Code":"B00CR15","Customer_Date":"2020-01-01"}]'
        ))

        # Mock API: /api/financials/check-local/CUST001
        page.route("**/api/financials/check-local/CUST001", lambda route: route.fulfill(
             status=200,
             content_type="application/json",
             body='{"exists": true}'
        ))

        # Mock API: /api/financials/analyze
        # Return success
        page.route("**/api/financials/analyze", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"success":true,"scoringResult":{"recommendedLimit":100000,"totalScore":150,"grade":"A"},"financialSummary":{"wadlData":{"score":5}}}'
        ))

        # Navigate
        print("Navigating...")
        page.goto("http://localhost:5173/batch-automation")
        page.wait_for_selector(".batch-automation-container")

        # Select Branch & Fetch
        print("Fetching Data...")
        page.select_option("select.branch-select", "TJ")
        page.click("button.btn-fetch")
        page.wait_for_selector("table.data-table tbody tr:first-child")

        # Get Row
        row = page.locator("table.data-table tbody tr").first

        # 1. Verify 'ไม่มีวางบิล' (Col 6)
        billing_text = row.locator("td").nth(6).inner_text()
        print(f"Billing Text: {billing_text}")
        assert "ไม่มีวางบิล" in billing_text, f"Expected 'ไม่มีวางบิล' but got '{billing_text}'"

        # 2. Verify '15 วัน' in Payment Terms (Col 5 - Credit Term)
        # Note: Index might shift if columns changed. Let's count carefully from headers.
        # [#, ID, Name, Purchase, Late, CreditTerm, Billing, Limit, NewLimit, CycleLimit, Score, Status, File, Action]
        # Credit Term is Index 5 (0-based) ?
        # 0:#, 1:ID, 2:Name, 3:Purchase, 4:Late, 5:CreditTerm, 6:Billing, 7:Limit, 8:New, 9:Cycle
        credit_term_text = row.locator("td").nth(5).inner_text()
        print(f"Credit Term Text: {credit_term_text}")
        assert "15 วัน" in credit_term_text, f"Expected '15 วัน' but got '{credit_term_text}'"

        # 3. Verify ' บาท' in Current Limit (Col 7)
        current_limit_text = row.locator("td").nth(7).inner_text()
        print(f"Current Limit Text: {current_limit_text}")
        assert "บาท" in current_limit_text, f"Expected 'บาท' in '{current_limit_text}'"

        # Run Process to see calculated columns
        print("Running Process...")
        page.click("button.btn-primary:has-text('เริ่มประมวลผล')")

        # Wait for Done
        try:
             row.locator("span.status-badge.done").wait_for(timeout=10000)
        except:
             print("Timeout waiting for done.")

        # 4. Verify ' บาท' in New Limit (Col 8)
        new_limit_text = row.locator("td").nth(8).inner_text()
        print(f"New Limit Text: {new_limit_text}")
        assert "บาท" in new_limit_text, f"Expected 'บาท' in '{new_limit_text}'"

        # 5. Verify ' บาท' in Cycle Limit (Col 9)
        cycle_limit_text = row.locator("td").nth(9).inner_text()
        print(f"Cycle Limit Text: {cycle_limit_text}")
        assert "บาท" in cycle_limit_text, f"Expected 'บาท' in '{cycle_limit_text}'"

        # Screenshot
        os.makedirs("verification", exist_ok=True)
        page.screenshot(path="verification/formatting_ui.png", full_page=True)
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_formatting_ui()
