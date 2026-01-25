import requests
import json
import sys
import os
import urllib3

# Disable warnings for self-signed certs if needed
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
API_URL = "http://192.192.0.37:8280/customer-sp682/1.0.0"
API_KEY = os.environ.get("CUSTOMER_API_KEY")

def run_test(name, payload):
    print(f"\n--- Running Test: {name} ---")
    print("Payload:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    headers = {
        "apikey": API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=5, verify=False)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if "data" in data and isinstance(data["data"], list):
                count = len(data["data"])
                print(f"Items returned: {count}")
                if count > 0:
                    print("First Item Sample:")
                    print(json.dumps(data["data"][0], indent=2, ensure_ascii=False))
            else:
                print("Full Response:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        else:
            print("Error Response:")
            print(response.text)
            return None

    except Exception as e:
        print(f"Exception: {e}")
        return None

def main():
    if not API_KEY:
        print("Please set CUSTOMER_API_KEY env var")
        # Fallback to interactive input if running manually
        try:
            import getpass
            global API_KEY
            API_KEY = getpass.getpass("Enter API Key: ")
        except:
            sys.exit(1)

    # Test 1: Empty Body (Get Baseline)
    print("1. Fetching baseline data...")
    baseline = run_test("Baseline (Empty Body)", {"page": 1, "size": 1})

    if not baseline or "data" not in baseline or not baseline["data"]:
        print("Cannot proceed without baseline data.")
        sys.exit(1)

    sample = baseline["data"][0]
    sample_no = sample.get("No_")
    sample_name = sample.get("Name")

    print(f"\nUsing Sample - No_: {sample_no}, Name: {sample_name}")

    # Test 2: Filter Exact Match
    if sample_no:
        run_test("Filter Exact Match (No_)", {
            "page": 1,
            "size": 10,
            "No_": {"$eq": sample_no}
        })

    # Test 3: Filter Partial Match (Like)
    if sample_name:
        partial = sample_name[:5]

        # Attempt 1: $like
        run_test("Filter Partial Match ($like)", {
            "page": 1,
            "size": 10,
            "Name": {"$like": f"%{partial}%"}
        })

        # Attempt 2: $regex
        run_test("Filter Partial Match ($regex)", {
             "page": 1,
            "size": 10,
            "Name": {"$regex": f"{partial}"}
        })

    # Test 4: OR Logic (Multi-field Search)
    if sample_no and sample_name:
         # MongoDB style $or
        run_test("Filter OR Logic ($or)", {
             "page": 1,
            "size": 10,
            "$or": [
                {"No_": {"$eq": sample_no}},
                {"Name": {"$like": f"%{sample_name[:5]}%"}}
            ]
        })

if __name__ == "__main__":
    main()
