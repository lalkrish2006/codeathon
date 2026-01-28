import requests
import json


# API Key - Hardcoded as per USER instructions for this script, 
# or fetched from env/prioritizer default.
# The user said "Replace the existing Gemini API key... API_KEY = ..."
API_KEY = "AIzaSyBEnIgTnIZs6b2_yFGnhPOiFVpwENZZ1d4"

def verify_gemini_connection():
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{
                "text": "Say ONLY the word SUCCESS if you can read this."
            }]
        }]
    }
    
    try:
        print(f"Sending request to: {url.split('?')[0]}...")
        response = requests.post(url, headers=headers, json=payload)
        
        print(f"HTTP Status Code: {response.status_code}")
        print("Raw Response Body:")
        print(response.text)
        
        if response.status_code == 200:
            data = response.json()
            try:
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                if "SUCCESS" in text:
                    print("\n[PASS] Verification PASSED: 'SUCCESS' found in response.")
                else:
                    print("\n[WARN] Verification WARNING: Response received but 'SUCCESS' not found.")
            except (KeyError, IndexError) as e:
                print(f"\n[FAIL] Verification FAILED: Unexpected JSON structure. {e}")
        else:
            print(f"\n[FAIL] Verification FAILED: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"\n[FAIL] Verification CRASHED: {e}")

if __name__ == "__main__":
    verify_gemini_connection()
