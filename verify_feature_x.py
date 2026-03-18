from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_feature(page: Page):
  page.context.add_cookies([
      {"name": "dev_role", "value": "maker", "domain": "localhost", "path": "/"}
  ])
  page.goto("http://localhost:5173/create-credit-request")
  page.wait_for_timeout(3000)

  # Create a new customer by typing a name
  # "ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท"
  search_input = page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษัท")
  search_input.fill("TEST001")
  page.get_by_role("button", name="ค้นหา").click()
  page.wait_for_timeout(2000)

  # Now there should be a button to add a new customer
  # Let's see what is there
  page.screenshot(path="/home/jules/verification/verification2.png")

if __name__ == "__main__":
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(record_video_dir="/home/jules/verification/video", viewport={"width": 1280, "height": 720})
    page = context.new_page()
    try:
      verify_feature(page)
    finally:
      context.close()
      browser.close()
