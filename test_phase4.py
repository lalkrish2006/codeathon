import sys
import os
import time

# Ensure src is in path
sys.path.append(os.getcwd())

from src.models import PackageInput, PackageType
from src.prioritizer import DeliveryPrioritizer

def test_phase4():
    print("--- Phase 4 Verification Suite ---\n")
    prioritizer = DeliveryPrioritizer()
    
    # 1. Validation Scenario: Medical Emergency
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

    # 2. Trust Score Decay
    print("\n[Test 2] Trust Score Decay")
    sender_sketchy = "SketchySender_001"
    
    # Send a False Positive (Mock LLM catches "fake" or "toy")
    pkg_fake = PackageInput(
        id="PKG-FAKE-001",
        description="Realistic Toy Kidney for model kit",
        sender=sender_sketchy,
        recipient_type="residential",
        claimed_urgency="critical"
    )
    
    # Send it once
    print(f"Sending suspicious package from {sender_sketchy}...")
    log_fake1 = prioritizer.prioritize(pkg_fake)
    
    # We need to manually update trust in our service based on the result for this test simulation?
    # Wait, the requirements said: "False positives detected → decay trust". 
    # Does the prioritizer UPDATE the trust score? 
    # Looking at my implementation in prioritizer.py... I didn't actually CALL `update_trust_score`!
    # I only READ it: `trust_score = self.trust_service.get_trust_score(package.sender)`
    # I missed the WRITE back step in `prioritizer.py`.
    # Let me check the Plan... "Rules: False positives detected → decay trust".
    # Implementation Plan said "Create SenderTrustService... Method update_trust_score".
    # But I missed hooking it up in `prioritize` method to actually CALL update.
    # I should fail this test and then fix it.
    
    # Let's check the score after the first call.
    score_after_1 = prioritizer.trust_service.get_trust_score(sender_sketchy)
    print(f"Trust Score after 1st fake: {score_after_1}")
    
    # Simulate external feedback loop or self-correction?
    # "False positives detected → decay trust".
    # If LLM says is_false_positive, we should PROBABLY decay trust immediately in the system.
    # Let's see if I implemented that... NO.
    
    if score_after_1 < 0.7:
        print(">>> Test 2 PASSED (Decay observed)")
    else:
        print(">>> Test 2 FAILED (No decay observed - Logic missing?)")

    # 3. Human Approval Logic
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
