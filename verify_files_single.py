from playwright.sync_api import sync_playwright, expect
import os

def test_credit_request_files(page):
    print("Navigating to app...")
    page.goto("http://[::1]:3000/create-credit-request")

    print("Searching for customer...")
    page.fill("input[placeholder='ค้นหาลูกค้า...']", "010")
    page.click(".search-box button")

    print("Waiting for form...")
    page.wait_for_selector("input[placeholder='ชื่อจดทะเบียนบริษัท']", timeout=10000)

    print("Clicking Request Info tab...")
    page.click("text=ข้อมูลคำขอ")

    with open("test_doc.txt", "w") as f:
        f.write("dummy content")

    print("Uploading file...")
    # Trigger file chooser via click on the upload area (first one)
    with page.expect_file_chooser() as fc_info:
        # Click the first .upload-box
        page.click(".upload-box >> nth=0")

    file_chooser = fc_info.value
    file_chooser.set_files("test_doc.txt")

    page.wait_for_selector("text=test_doc.txt")
    print("File uploaded.")

    print("Saving draft...")
    page.click("button:has-text('บันทึกแบบร่าง')")

    page.wait_for_selector(".swal2-success")
    page.click(".swal2-confirm")

    page.reload()

    print("Checking sidebar...")
    page.wait_for_selector(".request-item")

    print("Clicking request in sidebar...")
    page.click(".request-item:first-child")

    page.wait_for_selector("input[placeholder='ชื่อจดทะเบียนบริษัท']")

    print("Verifying file presence...")
    page.click("text=ข้อมูลคำขอ")
    page.wait_for_selector("text=test_doc.txt")

    count = page.locator(".download-btn").count()
    if count > 0:
        print(f"Download button visible! Count: {count}")
    else:
        print("Download button NOT visible.")

    page.screenshot(path="verification_result.png")
    print("Screenshot saved to verification_result.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_credit_request_files(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()
