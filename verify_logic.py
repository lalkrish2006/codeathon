from src.models import PackageInput
from src.prioritizer import DeliveryPrioritizer
import json

def run_tests():
    prioritizer = DeliveryPrioritizer()
    
    test_cases = [
        # 1. Critical Medical (Should be Priority 1)
        PackageInput(
            id="PKG001", 
            description="Human Heart for transplant", 
            sender="City Hospital", 
            recipient_type="hospital",
            is_hazmat=False
        ),
        # 2. Critical Meds (Should be Priority 1)
        PackageInput(
            id="PKG002",
            description="Urgent Insulin supply",
            sender="PharmaCorp",
            recipient_type="residential",
            metadata={"temp_control": True}
        ),
        # 3. Safety/Hazmat (Should be Priority 2)
        PackageInput(
            id="PKG003",
            description="Biohazard waste containment unit",
            sender="Lab Inc",
            recipient_type="waste_facility",
            is_hazmat=True
        ),
        # 4. Legal (Should be High Priority ML ~4-7)
        PackageInput(
            id="PKG004",
            description="Court summons and affidavit documents",
            sender="Law Firm LLC",
            recipient_type="residential"
        ),
        # 5. Commercial (Should be Low Priority ML ~10)
        PackageInput(
            id="PKG005",
            description="Box of 500 ballpoint pens",
            sender="Office Supply Co",
            recipient_type="office"
        ),
        # 6. Personal (Should be Low Priority ML ~10)
        PackageInput(
            id="PKG006",
            description="Birthday gift toy robot",
            sender="Grandma",
            recipient_type="residential"
        ),
         # 7. Ambiguous High Priority (Should be raised by ML words)
        PackageInput(
            id="PKG007",
            description="Urgent contract - Express delivery required",
            sender="Big Corp",
            recipient_type="office",
            metadata={"express_delivery_requested": True}
        )
    ]

    print(f"{'ID':<8} | {'Priority':<8} | {'Category':<15} | {'Source':<15} | {'Reasoning'}")
    print("-" * 100)

    for case in test_cases:
        decision = prioritizer.prioritize(case)
        print(f"{decision.package_id:<8} | {decision.final_priority_score:<8} | {decision.ethical_category.value:<15} | {decision.decision_source:<15} | {decision.reasoning[:50]}...")

if __name__ == "__main__":
    run_tests()
