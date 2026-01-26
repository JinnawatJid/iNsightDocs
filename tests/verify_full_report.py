import re
from playwright.sync_api import sync_playwright, expect
import os
import time

def verify_full_report():
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
                 # Structure: div.upload-item > label(text=label) ... input[type=file]
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
            page.click("button.swal2-confirm") # Click "OK"
            time.sleep(1) # Wait for animation
        except:
            print("Success modal not found, proceeding...")

        # Wait for results
        try:
             page.wait_for_selector("text=Credit Scoring Model", timeout=10000)
        except:
             print("Timeout waiting for results.")
             return

        time.sleep(2)

        # CLICK FULL REPORT
        print("Clicking Full Report Button...")
        # Expect a new page
        with context.expect_page() as new_page_info:
            page.click("text=Full Report")

        new_page = new_page_info.value
        print("New tab opened!")
        new_page.wait_for_load_state()

        print(f"New Page Title: {new_page.title()}")
        print(f"New Page URL: {new_page.url}")

        # Wait for content
        new_page.wait_for_selector(".report-container", timeout=10000)

        # Screenshot
        screenshot_path = "full_report_screenshot.png"
        new_page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_full_report()
