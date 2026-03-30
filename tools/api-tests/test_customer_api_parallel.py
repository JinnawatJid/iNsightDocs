import requests
import json
import sys
import os
import urllib3
import concurrent.futures

# Disable warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

API_URL = "http://192.192.0.37:8280/customer-sp682/1.0.0"

def get_api_key():
    key = os.environ.get("CUSTOMER_API_KEY")
    if not key:
        print("Please set CUSTOMER_API_KEY env var")
        try:
            import getpass
            key = getpass.getpass("Enter API Key: ")
        except:
            pass
    return key

def search_field(api_key, field, value):
    """
    Performs a single field search using $like
    """
    payload = {
        "page": 1,
        "size": 10,
        field: {"$like": f"%{value}%"}
    }

    headers = {
        "apikey": api_key,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=5, verify=False)
        if response.status_code == 200:
            data = response.json()
            items = data.get("data", []) or []
            print(f"   [+] Search '{field}' found {len(items)} items")
            return items
        else:
            print(f"   [-] Search '{field}' failed: {response.status_code}")
            return []
    except Exception as e:
        print(f"   [!] Search '{field}' error: {e}")
        return []

def main():
    api_key = get_api_key()
    if not api_key:
        sys.exit(1)

    search_term = input("\nEnter search term (e.g. '168'): ").strip()
    if not search_term:
        print("Search term required.")
        sys.exit(1)

    print(f"\n--- Starting Parallel Search for: '{search_term}' ---")

    # The fields we want to search in parallel
    # Mapping: (Label/Description, Actual API Column Name)
    target_fields = [
        "No_",
        "Name",
        "Mobile Phone No_"
    ]

    all_results = []

    # Execute in parallel threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        # Submit tasks
        future_to_field = {
            executor.submit(search_field, api_key, field, search_term): field
            for field in target_fields
        }

        # Collect results
        for future in concurrent.futures.as_completed(future_to_field):
            results = future.result()
            all_results.extend(results)

    # Deduplicate Logic (Client-Side Merge)
    unique_map = {}
    for item in all_results:
        cust_id = item.get("No_")
        if cust_id:
            unique_map[cust_id] = item

    final_list = list(unique_map.values())

    print("-" * 50)
    print(f"Total Unique Results: {len(final_list)}")
    print("-" * 50)

    # Show first 3 results
    for i, item in enumerate(final_list[:3]):
        print(f"{i+1}. [{item.get('No_')}] {item.get('Name')} (Phone: {item.get('Mobile Phone No_')})")

if __name__ == "__main__":
    main()
