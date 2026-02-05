from src.models import PackageInput
from src.prioritizer import DeliveryPrioritizer
from src.models import PackageType
import json
import time

def run_tests():
    print("Initializing Adaptive System...")
    prioritizer = DeliveryPrioritizer()
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    pkg_unknown = PackageInput(
        id="PKG_NEW_1", 
        description="Delivery of NewBioMeds for trial", 
        sender="BioStartup Inc", 
        recipient_type="lab"
    )
    
    print("\n--- Test 1: Unknown Item (Before Learning) ---")
    decision1 = prioritizer.prioritize(pkg_unknown)
    print(f"Score: {decision1.final_priority_score} | ML Cat: {decision1.ml_prediction.predicted_category.value} | Reason: {decision1.reasoning[:50]}...")
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    pkg_learn = PackageInput(
        id="PKG_LEARN",
        description="Box of vaccines",
        sender="Pharma",
        recipient_type="hospital"
    )
    
    print("\n--- Test 2: Triggering Learning with 'vaccine' ---")
    decision2 = prioritizer.prioritize(pkg_learn) 
    print(f"Score: {decision2.final_priority_score} | Learned: {decision2.llm_analysis.new_keywords}")
    
    
    print("\n--- Verifying Internal State ---")
    known_med_keywords = prioritizer.ml_model.category_keywords[PackageType.MEDICAL]
    if "vaccine" in known_med_keywords:
        print("SUCCESS: 'vaccine' added to ML Medical keywords.")
    else:
        print("FAILURE: 'vaccine' NOT found in ML keywords.")

if __name__ == "__main__":
    run_tests()
