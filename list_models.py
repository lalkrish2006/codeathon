from google import genai
import os


api_key = "AIzaSyB53_7fH6tC1Cg32pDjIqx-6gXlQ0mMOpE"

try:
    client = genai.Client(api_key=api_key, http_options={'api_version': 'v1'})
    print("Listing models...")
    
    
    for m in client.models.list():
        print(f"Model: {m.name}")

except Exception as e:
    print(f"Error: {e}")
