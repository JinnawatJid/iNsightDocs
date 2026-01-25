import requests
import json
import sys
import os
import getpass

# Configuration
API_URL = "http://192.192.0.37:8280/customer-sp682/1.0.0"

def get_api_key():
    # 1. Try Environment Variable
    api_key = os.environ.get("CUSTOMER_API_KEY")
    if api_key:
        return api_key.strip()

    # 2. Prompt User
    print("API Key not found in environment variable 'CUSTOMER_API_KEY'.")
    print("Please paste your API Key below (hidden input):")
    try:
        api_key = getpass.getpass("API Key: ")
        return api_key.strip()
    except Exception as e:
        print(f"Error reading input: {e}")
        sys.exit(1)

def test_api():
    print(f"Testing API Connection to: {API_URL}")
    print("-" * 50)

    # Securely get API Key
    api_key = get_api_key()
    if not api_key:
        print("Error: API Key is required.")
        sys.exit(1)

    # 1. Define Headers
    headers = {
        "apikey": api_key,
        "Content-Type": "application/json"
    }

    # 2. Define the Body (Input Payload)
    payload = {
        "page": 1,
        "size": 50,
        "gen_bus": { "$eq": "W" },
        "payment_terms": { "$eq": "30" },
        "customer_name": "จำกัด"
    }

    print("\nSending Request Body:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("-" * 50)

    try:
        # 3. Send the POST request
        response = requests.post(API_URL, headers=headers, json=payload, timeout=10)

        # 4. Inspect Response
        print(f"Response Status Code: {response.status_code}")

        try:
            # Try to parse JSON response
            data = response.json()
            print("Response Body (JSON):")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            print("Response Body (Text):")
            print(response.text)

    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}")
        print("\nPossible causes:")
        print("1. You are not connected to the internal network (192.192.x.x).")
        print("2. The server is down or the firewall is blocking the connection.")
        sys.exit(1)

if __name__ == "__main__":
    test_api()
