from fastapi import FastAPI, HTTPException, Header
from src.models import PackageInput, DecisionLog
from src.prioritizer import DeliveryPrioritizer
from typing import Optional

app = FastAPI(title="Ethics-Aware Delivery Prioritizer")



prioritizer = DeliveryPrioritizer()

@app.get("/health")
def health_check():

    return {"status": "ok", "model_loaded": True}

@app.post("/prioritize", response_model=DecisionLog)
async def prioritize_package(package: PackageInput):

    try:
        decision = prioritizer.prioritize(package)
        return decision
    except Exception as e:
        print(f"Error processing package {package.id}: {str(e)}")
        
        from src.models import DecisionLog, EthicalCategory
        return DecisionLog(
            package_id=package.id,
            final_priority_score=10, 
            decision_source="FALLBACK_ERROR",
            ethical_category=EthicalCategory.STANDARD,
            reasoning=f"System Error: {str(e)}",
            confidence_score=0.0,
            requires_human_approval=True, 
            human_approved=False,
            sender_trust_score=1.0,
            ai_models_used=[]
        )

@app.get("/")
def read_root():
    return {"status": "System Operational", "message": "Ethics-Aware Delivery System Ready"}
