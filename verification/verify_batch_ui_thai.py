from playwright.sync_api import sync_playwright
import time

def verify_batch_automation_thai():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Navigating to /batch-automation...")
        # Assuming dev server is running on port 5174 (as per logs)
        page.goto("http://localhost:5174/batch-automation")
        time.sleep(2) # Wait for Vue to mount

        # Verify Header (Thai)
        header = page.locator("h2")
        print(f"Header text: {header.inner_text()}")
        assert "ระบบคำนวณวงเงินสินเชื่ออัตโนมัติ (Batch)" in header.inner_text()

        # Verify Upload Area Text (Thai)
        upload_area = page.locator(".upload-content")
        print(f"Upload area text: {upload_area.inner_text()}")
        assert "คลิกหรือลากไฟล์ Excel มาวางที่นี่" in upload_area.inner_text()

        # Verify Bridge Input Label (Thai)
        bridge_label = page.locator(".settings-area label")
        assert "การเชื่อมต่อ Bridge:" in bridge_label.inner_text()

        # Verify Buttons (Thai)
        # Using xpath to find buttons by text
        start_btn = page.locator("//button[contains(., 'เริ่มประมวลผล')]")
        assert start_btn.is_visible()

        export_btn = page.locator("//button[contains(., 'ส่งออกรายงาน')]")
        assert export_btn.is_visible()

        # Take Screenshot
        page.screenshot(path="verification/batch_ui_thai.png")
        print("Screenshot saved to verification/batch_ui_thai.png")

        browser.close()

if __name__ == "__main__":
    verify_batch_automation_thai()
