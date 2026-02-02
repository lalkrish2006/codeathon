from fastapi import FastAPI, HTTPException, Header
from src.models import PackageInput, DecisionLog
from src.prioritizer import DeliveryPrioritizer
from typing import Optional

app = FastAPI(title="Ethics-Aware Delivery Prioritizer")

# Initialize prioritizer (In real app, manage lifecycle properly)
# Pass API key from environment variable if needed
prioritizer = DeliveryPrioritizer()

@app.get("/health")
def health_check():
    """
    Health check endpoint to verify service status.
    """
    return {"status": "ok", "model_loaded": True}

@app.post("/prioritize", response_model=DecisionLog)
async def prioritize_package(package: PackageInput):
    """
    Endpoint to process a package and determine its ethical priority.
    """
    try:
        decision = prioritizer.prioritize(package)
        return decision
    except Exception as e:
        print(f"Error processing package {package.id}: {str(e)}")
        # Return a valid JSON response even on failure (fallback)
        from src.models import DecisionLog, EthicalCategory
        return DecisionLog(
            package_id=package.id,
            final_priority_score=10, # Fail-safe low priority
            decision_source="FALLBACK_ERROR",
            ethical_category=EthicalCategory.STANDARD,
            reasoning=f"System Error: {str(e)}",
            confidence_score=0.0,
            requires_human_approval=True, # Safety first
            human_approved=False,
            sender_trust_score=1.0,
            ai_models_used=[]
        )

@app.get("/")
def read_root():
    return {"status": "System Operational", "message": "Ethics-Aware Delivery System Ready"}
