
def test_logic():
    # Mock Data
    test_cases = [
        {"status": "Draft", "url": "http://localhost:3000?feature=financial_draft", "expected": True},
        {"status": " Draft ", "url": "http://localhost:3000?feature=financial_draft", "expected": True},
        {"status": None, "url": "http://localhost:3000?feature=financial_draft", "expected": True},
        {"status": "", "url": "http://localhost:3000?feature=financial_draft", "expected": True},
        {"status": "Opened", "url": "http://localhost:3000", "expected": True},
        {"status": "Draft", "url": "http://localhost:3000", "expected": False},
    ]

    visible_statuses = [
        'opened', 'regionalsubmitted', 'salessubmitted', 'submitted',
        'reviewed', 'approved', 'pendingfinance', 'pendingsales',
        'pendingfinance (ชั่วคราว)', 'pendingsales (ชั่วคราว)'
    ]

    for case in test_cases:
        status = case["status"]
        url = case["url"]

        # Logic from Component
        clean_status = str(status).strip().lower() if status else ''
        is_draft = not status or clean_status == 'draft' or clean_status == ''
        has_flag = 'feature=financial_draft' in url

        is_standard_visible = any(s in clean_status for s in visible_statuses)

        result = is_standard_visible or (is_draft and has_flag)

        print(f"Status: '{status}' | URL: ...{url[-25:]} -> Result: {result} | Expected: {case['expected']}")

        if result != case["expected"]:
            print("FAIL")
            exit(1)

    print("ALL LOGIC TESTS PASSED")

if __name__ == "__main__":
    test_logic()
