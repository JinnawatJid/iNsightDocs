import re
from playwright.sync_api import sync_playwright, expect
import os
import time

def verify_financials():
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
                page.screenshot(path="debug_no_search.png")
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
             page.screenshot(path="debug_search_fail.png")
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
                 if not os.path.exists(fp):
                      print(f"File not found locally: {fp}")
                      return

                 # Structure: div.upload-item > label(text=label) ... input[type=file]
                 xpath = f"//div[contains(@class, 'upload-item') and .//label[contains(text(), '{label}')]]//input[@type='file']"

                 loc = page.locator(xpath).first
                 if loc.count() == 0:
                     print(f"Locator not found for {label}")
                     return

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

        # Wait
        print("Waiting for results...")
        try:
             page.wait_for_selector("text=Credit Scoring Model", timeout=10000)
        except:
             print("Timeout waiting for results.")
             page.screenshot(path="debug_analysis_fail.png")
             return

        time.sleep(2)

        # Verify
        print("Verifying Data...")
        def verify(text):
             xpath = f"//div[contains(@class, 'score-item') and .//div[contains(@class, 's-label') and contains(text(), '{text}')]]//div[contains(@class, 's-val')]"
             try:
                 el = page.locator(xpath).first
                 val = el.inner_text().strip()
                 print(f"  {text}: '{val}'")
                 if val in ["-", ""]: return False
                 return True
             except:
                 print(f"  {text}: Not Found")
                 return False

        failed = False
        items = ["ระยะเวลาธุรกิจ", "สัดส่วนเครดิต/ทุน", "D/E Ratio", "Rev/Cap", "Trend"]
        for item in items:
             if not verify(item): failed = True

        if failed:
             print("FAILED: Some items have dashes or missing.")
        else:
             print("SUCCESS: All checked items have values.")

        page.screenshot(path="verification_result.png", full_page=True)
        browser.close()

if __name__ == "__main__":
    verify_financials()
