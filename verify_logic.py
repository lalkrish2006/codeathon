from src.models import PackageInput
from src.prioritizer import DeliveryPrioritizer
from src.models import PackageType
import json
import time

def run_tests():
    print("Initializing Adaptive System...")
    prioritizer = DeliveryPrioritizer()
    
    # 1. Baseline Test (Before Learning)
    # "Experimental Vaccine" (vaccine is NOT in standard ml_engine list yet, assuming prototype)
    # Actually wait, I added "vaccine" to Critical keywords in EthicalEngine, but ML engine
    # might not have it in "Medical" list explicitly if I didn't add it.
    # Let's check ml_engine.py... 
    # category_keywords[MEDICAL] has: "medicine", "pill", "pharma", "clinical", "doctor", "nurse", "prescription", "icu", "ward"
    # It does NOT have "vaccine".
    # BUT, Ethical Engine HAS "vaccine".
    # So "vaccine" will trigger Priority 1 by Rule.
    # To test ML learning, we need a word that is NOT in Ethical Rules but IS Medical.
    # Let's use "Defibrillator" (Ethical engine has it? Yes).
    # Let's use "Stethoscope" or "Ventilator" (maybe).
    # "Ventilator" is likely life support -> Rule.
    # "Dermatology Cream" -> Medical but not life critical.
    # "NewBioMeds" -> Completely unknown word.
    
    pkg_unknown = PackageInput(
        id="PKG_NEW_1", 
        description="Delivery of NewBioMeds for trial", 
        sender="BioStartup Inc", 
        recipient_type="lab"
    )
    
    print("\n--- Test 1: Unknown Item (Before Learning) ---")
    decision1 = prioritizer.prioritize(pkg_unknown)
    print(f"Score: {decision1.final_priority_score} | ML Cat: {decision1.ml_prediction.predicted_category.value} | Reason: {decision1.reasoning[:50]}...")
    
    # Mock LLM is hardcoded to respond to "vaccine" for adaptation test in the code I wrote.
    # Check llm_processor.py _mock_analysis:
    # elif "vaccine" in desc_lower: ... new_keywords = ["vaccine"]
    # So I MUST use "vaccine" to trigger the mock learning.
    # BUT "vaccine" triggers Ethical Engine Rule 1.
    # So prioritize() returns early at Step 1.
    # ADAPTIVE LEARNING Step 3 is skipped if Ethical Engine returns early?
    # Let's check prioritizer.py...
    # Step 1: Ethical Check.
    # Step 2: LLM Analysis.
    # Step 3: Adaptive Learning (If keywords found).
    
    # So even if Ethical Engine triggers, LLM is called and Learning happens BEFORE return?
    # Code in prioritizer.py:
    # 1. Ethical Check (evaluated)
    # 2. LLM Analysis (evaluated)
    # 3. Learning (executed)
    # 4. If ethical_decision -> Return.
    
    # YES! Learning happens even if Rule overrides.
    # So if I send "vaccine", it will learn "vaccine" for ML map.
    # Next time I send "vaccine", ML will know it's Medical.
    # But "vaccine" is bad example because Rule always hides ML score.
    
    # I need a word that triggers mock learning but is NOT a rule.
    # The mock currently ONLY learns "vaccine".
    # I should update the mock or use "vaccine" to prove "Learning Happened" 
    # by checking the internal state of ml_engine, even if output is determined by Rule.
    
    pkg_learn = PackageInput(
        id="PKG_LEARN",
        description="Box of vaccines",
        sender="Pharma",
        recipient_type="hospital"
    )
    
    print("\n--- Test 2: Triggering Learning with 'vaccine' ---")
    decision2 = prioritizer.prioritize(pkg_learn) # This should trigger "vaccine" learning
    print(f"Score: {decision2.final_priority_score} | Learned: {decision2.llm_analysis.new_keywords}")
    
    # Verify ML Model State
    print("\n--- Verifying Internal State ---")
    known_med_keywords = prioritizer.ml_model.category_keywords[PackageType.MEDICAL]
    if "vaccine" in known_med_keywords:
        print("SUCCESS: 'vaccine' added to ML Medical keywords.")
    else:
        print("FAILURE: 'vaccine' NOT found in ML keywords.")

if __name__ == "__main__":
    run_tests()
