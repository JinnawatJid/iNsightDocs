from playwright.sync_api import sync_playwright, expect
import json

def test_bridge_connection(page):
    # Mock the Customer Search API
    mock_response = [
        {
            "customer": {
                "id": "CUST001",
                "name": "บริษัท Test Company จำกัด",
                "tax_id": "1234567890123",
                "No_": "CUST001",
                "payment_method": "Transfer",
                "billing_requirement": "Invoice",
                "billing_method": "Email",
                "registered_capital": "1000000",
                "years_in_business": 10,
                "customer_since": "2020-01-01"
            },
            "_source": "api",
            "history": [],
            "financial_summary": {},
            "credit_score": {}
        }
    ]

    page.route("**/api/customers/search**", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(mock_response)
    ))

    # Mock Create Credit Request
    page.route("**/api/credit-requests", lambda route: route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps({
            "success": True,
            "data": {
                "txId": "TX12345",
                "status": "Draft",
                "attachments": []
            }
        })
    ))

    # Navigate
    page.goto("http://localhost:5173")

    # Wait for search input
    page.wait_for_selector("input", timeout=10000)

    # Type search query
    page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษั").fill("Test Company")
    page.get_by_placeholder("ค้นหาด้วย รหัสลูกค้า, ชื่อ, เบอร์โทร หรือ ชื่อบริษั").press("Enter")

    # Wait for the form to load
    expect(page.get_by_text("บริษัท Test Company จำกัด").first).to_be_visible(timeout=10000)

    # Click "เอกสารการเงิน" tab
    page.get_by_text("เอกสารการเงิน").click()

    # Now look for "Auto Download"
    auto_download_btn = page.get_by_text("Auto Download")
    expect(auto_download_btn).to_be_visible()

    # Click it
    auto_download_btn.click()

    # Check for SweetAlert "Connected to Local Bridge"
    expect(page.get_by_text("Connected to Local Bridge")).to_be_visible(timeout=10000)

    page.screenshot(path="/home/jules/verification/bridge_success.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_bridge_connection(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
