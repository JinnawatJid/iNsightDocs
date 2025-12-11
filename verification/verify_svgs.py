from playwright.sync_api import sync_playwright

def verify_svg_replacement():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to Create Credit Request page (main entry point)
        try:
            page.goto("http://localhost:5173/create-credit-request")
            page.wait_for_selector(".create-credit-request", timeout=5000)
        except Exception as e:
            print(f"Failed to load page: {e}")
            browser.close()
            return

        # Screenshot the initial state (with search icon)
        page.screenshot(path="verification/create_credit_request.png")
        print("Screenshot saved: verification/create_credit_request.png")

        # Check for presence of img tags that replaced SVGs
        # The center placeholder should have search-large.svg
        placeholder_img = page.locator(".placeholder-content img")
        if placeholder_img.count() > 0:
            src = placeholder_img.get_attribute("src")
            print(f"Placeholder image src: {src[:50]}...")
            if src.startswith("data:image/svg+xml") or "search-large" in src:
                print("SUCCESS: Placeholder uses SVG (via data URI or file path)")
            else:
                print(f"FAILURE: Placeholder image src does not match expected: {src}")
        else:
             print("FAILURE: Placeholder img tag not found")

        # Check Navbar bell icon
        navbar_bell = page.locator(".notification-bell img")
        if navbar_bell.count() > 0:
             src = navbar_bell.get_attribute("src")
             print(f"Navbar bell src: {src[:50]}...")
        else:
             print("FAILURE: Navbar bell img not found")

        # Navigate to Customer Search page
        page.goto("http://localhost:5173/customer-search")
        page.wait_for_selector(".customer-search-container", timeout=5000)
        page.screenshot(path="verification/customer_search.png")
        print("Screenshot saved: verification/customer_search.png")

        browser.close()

if __name__ == "__main__":
    verify_svg_replacement()
