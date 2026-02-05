import sys
import os
import time


sys.path.append(os.getcwd())

from src.models import PackageInput, PackageType
from src.prioritizer import DeliveryPrioritizer

def test_phase4():
    print("--- Phase 4 Verification Suite ---\n")
    prioritizer = DeliveryPrioritizer()
    
    
    print("\n[Test 1] Validation Scenario: Medical Emergency")
    pkg_medical = PackageInput(
        id="PKG-VAC-001",
        description="COVID-19 vaccines for ICU patients – deliver immediately",
        sender="PharmaCorp_Trusted",
        recipient_type="hospital",
        claimed_urgency="critical",
        is_hazmat=False
    )
    
    log_medical = prioritizer.prioritize(pkg_medical)
    
    print(f"Priority: {log_medical.final_priority_score} (Expected: 1)")
    print(f"Confidence: {log_medical.confidence_score} (Expected: > 0.9)")
    print(f"Requires Approval: {log_medical.requires_human_approval} (Expected: True)")
    print(f"Trust Score: {log_medical.sender_trust_score} (Expected: 0.7 or more)")
    print(f"Explanation:\n{log_medical.reasoning}")
    
    if log_medical.final_priority_score == 1 and log_medical.requires_human_approval:
        print(">>> Test 1 PASSED")
    else:
        print(">>> Test 1 FAILED")

    
    print("\n[Test 2] Trust Score Decay")
    sender_sketchy = "SketchySender_001"
    
    
    pkg_fake = PackageInput(
        id="PKG-FAKE-001",
        description="Realistic Toy Kidney for model kit",
        sender=sender_sketchy,
        recipient_type="residential",
        claimed_urgency="critical"
    )
    
    
    print(f"Sending suspicious package from {sender_sketchy}...")
    log_fake1 = prioritizer.prioritize(pkg_fake)
    
    
    
    
    
    
    
    
    
    
    
    
    
    score_after_1 = prioritizer.trust_service.get_trust_score(sender_sketchy)
    print(f"Trust Score after 1st fake: {score_after_1}")
    
    
    
    
    
    
    if score_after_1 < 0.7:
        print(">>> Test 2 PASSED (Decay observed)")
    else:
        print(">>> Test 2 FAILED (No decay observed - Logic missing?)")

    
    print("\n[Test 3] Human Approval Logic")
    pkg_standard = PackageInput(
        id="PKG-STD-005",
        description="Box of office supplies",
        sender="OfficeDepot",
        recipient_type="commercial",
        claimed_urgency="medium"
    )
    
    log_standard = prioritizer.prioritize(pkg_standard)
    print(f"Priority: {log_standard.final_priority_score}")
    print(f"Requires Approval: {log_standard.requires_human_approval} (Expected: False)")
    
    if not log_standard.requires_human_approval:
        print(">>> Test 3 PASSED")
    else:
        print(">>> Test 3 FAILED")

if __name__ == "__main__":
    test_phase4()
