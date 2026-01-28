from google import genai
import os

# Use the same key as in the app
api_key = "AIzaSyB53_7fH6tC1Cg32pDjIqx-6gXlQ0mMOpE"

try:
    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1'})
    print("Listing models...")
    # The new SDK has text extraction differently, checking typical list method
    # Actually, for google-genai, it is client.models.list()
    for m in client.models.list():
        print(f"Model: {m.name}")

except Exception as e:
    print(f"Error: {e}")
