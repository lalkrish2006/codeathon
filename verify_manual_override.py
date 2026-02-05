import requests
import json
import time

BASE_URL = "http://localhost:5000/api"
AUTH_TOKEN = "" 
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "password123"

def login():
    try:
        res = requests.post(f"{BASE_URL}/auth/login", json={
            "email": ADMIN_EMAIL, 
            "password": ADMIN_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get('token')
        
        
        print("Login failed, trying to register...")
        reg_res = requests.post(f"{BASE_URL}/auth/register", json={
            "name": "Test Admin",
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "role": "admin"
        })
        print(f"Registration Status: {reg_res.status_code}")
        if reg_res.status_code == 201:
             
             l_res = requests.post(f"{BASE_URL}/auth/login", json={
                "email": ADMIN_EMAIL, 
                "password": ADMIN_PASSWORD
             })
             return l_res.json().get('token')
        else:
            print("Registration failed:", reg_res.text)
            return None
            
    except Exception as e:
        print("Login error:", e)
        return None

def verify_allocation():
    token = login()
    if not token:
        print("Skipping verification - Server likely not running")
        return

    headers = {"Authorization": f"Bearer {token}"}

    
    print("\n[1] Fetching Agents...")
    res = requests.get(f"{BASE_URL}/users?role=delivery_agent", headers=headers)
    if res.status_code != 200:
        print("Failed to fetch agents:", res.text)
        return
    agents = res.json()
    if not agents:
        print("No agents found. Cannot test override.")
        return
    
    agent_id = agents[0]['_id']
    print(f"  > Found {len(agents)} agents. Using Agent: {agents[0]['name']} ({agent_id})")

    
    print("\n[1.5] Setting up Critical Product...")
    
    seller_creds = {"name": "PharmaSeller", "email": "pharma@test.com", "password": "password123", "role": "seller"}
    requests.post(f"{BASE_URL}/auth/register", json=seller_creds)
    s_res = requests.post(f"{BASE_URL}/auth/login", json={"email": "pharma@test.com", "password": "password123"})
    seller_token = s_res.json().get('token')
    
    
    prod_payload = {
        "name": "LifeSaving Medicine",
        "base_description": "Critical heart medication",
        "price": 100,
        "stock": 50,
        "category": "Medical"
    }
    p_headers = {"Authorization": f"Bearer {seller_token}"}
    p_res = requests.post(f"{BASE_URL}/products", json=prod_payload, headers=p_headers)
    if p_res.status_code == 201:
        product_id = p_res.json()['_id']
        print(f"  > Created Critical Product: {product_id}")
    else:
        
        res = requests.get(f"{BASE_URL}/products", headers=headers)
        products = res.json()
        
        matches = [p for p in products if 'med' in p['name'].lower()]
        if matches:
            product_id = matches[0]['_id']
            print(f"  > Found existing critical product: {product_id}")
        else:
            product_id = products[0]['_id'] 
            print("  > WARNING: unique critical product creation failed, using random.")

    
    print("\n[2] Creating High Priority Order...")
    order_payload = {
        "product_id": product_id,
        "quantity": 1,
        "customer_context": "CRITICAL EMERGENCY: Patient in ICU requires Life Support Medicine instantly. Death imminent.",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "customer_location": { "city": "New York" }
    }
    
    res = requests.post(f"{BASE_URL}/orders", json=order_payload, headers=headers)
    if res.status_code != 201:
        print("Order creation failed:", res.text)
        return
    
    order = res.json()
    order_id = order['_id']
    print(f"  > Order Created: {order_id}")
    print(f"  > Priority: {order.get('ai_priority')}")
    print(f"  > Assignment Reason: {order.get('assignment_reason')}")
    print(f"  > Recommended Agent: {order.get('system_recommended_agent')}")

    if order.get('system_recommended_agent'):
        print("  [SUCCESS] System pre-calculated routing.")
    else:
        print("  [WARNING] System did NOT pre-calculate routing (maybe due to location data).")

    
    print("\n[3] Testing Admin Override...")
    override_payload = {
        "approved": True,
        "override_agent_id": agent_id,
        "reasoning": "Test verify script override"
    }

    res = requests.patch(f"{BASE_URL}/orders/{order_id}/approve", json=override_payload, headers=headers)
    if res.status_code == 200:
        updated = res.json()
        print(f"  > Updated Status: {updated['status']}")
        print(f"  > Assigned To: {updated.get('assigned_to')}")
        print(f"  > Decision Source: {updated.get('decision_source')}")
        
        if updated.get('assigned_to') == agent_id and updated.get('decision_source') == 'ADMIN_OVERRIDE':
            print("  [SUCCESS] Admin Override Applied Verified.")
        else:
            print("  [FAILURE] Override match failed.")
    else:
        print("Approval failed:", res.text)

if __name__ == "__main__":
    verify_allocation()
