import re
from playwright.sync_api import sync_playwright, expect
import os
import time

def verify_legacy_view():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Listen to console
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        url = "http://localhost:5173/create-credit-request"
        print(f"Navigating to {url}...")
        page.goto(url)
        time.sleep(3)

        # Check login
        if "login" in page.url:
             print("Found Login page. Logging in...")
             page.fill("input[placeholder*='Email'], input[type='email']", "zm@example.com")
             page.fill("input[type='password']", "password")
             page.click("button[type='submit']")
             print("Submitted login.")
             page.wait_for_url("**/create-credit-request", timeout=10000)
             time.sleep(2)

        print("Checking for Customer Search...")
        try:
            search_input = page.locator("input[placeholder*='ค้นหา'], input[placeholder*='Search']")
            search_btn = page.locator("button:has-text('ค้นหา'), button:has-text('Search')")

            if search_input.count() > 0:
                print("Found Search Input. Searching for 00001AY...")
                search_input.first.fill("00001AY")
                if search_btn.count() > 0:
                    search_btn.first.click()
                else:
                    search_input.first.press("Enter")
            else:
                print("Search input not found!")
                return

        except Exception as e:
            print(f"Error interacting with search: {e}")
            return

        print("Waiting for Customer Data to load...")
        try:
             # Wait for tabs-header
             page.wait_for_selector(".tabs-header", timeout=10000)
        except:
             print("Timeout waiting for form tabs.")
             return

        # Go to Financial Tab
        print("Clicking Financial Tab...")
        page.click("text=เอกสารการเงิน")

        # Upload
        print("Uploading...")
        base_path = os.path.abspath("temp_docs")

        def upload_file(label, filename):
             print(f"Uploading {filename}...")
             try:
                 fp = os.path.join(base_path, filename)
                 xpath = f"//div[contains(@class, 'upload-item') and .//label[contains(text(), '{label}')]]//input[@type='file']"
                 loc = page.locator(xpath).first
                 loc.set_input_files(fp)
             except Exception as e:
                 print(f"Could not upload {label}: {e}")

        # Label names from StoreStatementTab.vue template
        upload_file("งบดุล", "balance_sheet.xlsx")
        upload_file("งบกำไรขาดทุน", "profit_loss.xlsx")
        upload_file("งบอัตราส่วนทางการเงิน", "financial_ratios.xlsx")

        # Registered Capital
        print("Filling Capital...")
        page.fill("input[placeholder*='ระบุทุนจดทะเบียน']", "1,000,000")

        # Analyze
        print("Clicking Analyze...")
        page.click("text=วิเคราะห์และคำนวณคะแนน")

        # Wait for Success Modal
        print("Waiting for Success Modal...")
        try:
            page.wait_for_selector("h2:has-text('Success')", timeout=10000)
            print("Found Success Modal. Closing...")
            page.click("button.swal2-confirm")
            time.sleep(1)
        except:
            print("Success modal not found, proceeding...")

        # Wait for results
        print("Waiting for results container...")
        try:
             page.wait_for_selector(".analysis-results", timeout=10000)
        except:
             print("Timeout waiting for results.")
             return

        time.sleep(2)

        # VERIFY LEGACY VIEW
        print("Verifying Legacy View...")
        legacy_view = page.locator(".analysis-results-legacy")
        if legacy_view.count() > 0 and legacy_view.is_visible():
            print("PASS: Legacy view (.analysis-results-legacy) is visible.")
        else:
            print("FAIL: Legacy view is NOT visible.")
            exit(1)

        # VERIFY CREDIT SHEET IS NOT VISIBLE
        # The credit sheet uses table.financial-table
        financial_table = page.locator("table.financial-table")
        if financial_table.count() == 0 or not financial_table.is_visible():
             print("PASS: Complex Financial Table is NOT visible inline.")
        else:
             print("FAIL: Complex Financial Table IS visible inline!")
             exit(1)

        # VERIFY FULL REPORT BUTTON
        full_report_btn = page.locator("button:has-text('Full Report')")
        if full_report_btn.count() > 0 and full_report_btn.is_visible():
            print("PASS: Full Report button is visible.")
        else:
            print("FAIL: Full Report button is NOT visible.")
            exit(1)

        print("ALL CHECKS PASSED.")
        page.screenshot(path="/home/jules/verification/legacy_view.png", full_page=True)
        print("Saved screenshot to /home/jules/verification/legacy_view.png")
        browser.close()

if __name__ == "__main__":
    verify_legacy_view()
