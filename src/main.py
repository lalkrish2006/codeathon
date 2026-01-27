from fastapi import FastAPI, HTTPException, Header
from src.models import PackageInput, DecisionLog
from src.prioritizer import DeliveryPrioritizer
from typing import Optional

app = FastAPI(title="Ethics-Aware Delivery Prioritizer")

# Initialize prioritizer (In real app, manage lifecycle properly)
# Pass API key from environment variable if needed
prioritizer = DeliveryPrioritizer()

@app.post("/prioritize", response_model=DecisionLog)
async def prioritize_package(package: PackageInput):
    """
    Endpoint to process a package and determine its ethical priority.
    """
    try:
        decision = prioritizer.prioritize(package)
        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    return {"status": "System Operational", "message": "Ethics-Aware Delivery System Ready"}
