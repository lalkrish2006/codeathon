from src.models import PackageInput
from src.prioritizer import DeliveryPrioritizer


prioritizer = DeliveryPrioritizer()

pkg = PackageInput(
    id="TEST_GEMINI",
    description="Box of COVID-19 vaccines for ICU patients from City Hospital. Deliver immediately.",
    sender="City Hospital",
    recipient_type="hospital"
)

print("Starting Prioritization (Expecting Gemini API Call)...")
decision = prioritizer.prioritize(pkg)
print(f"[INFO] Final Priority: {decision.final_priority_score}")
print(f"[INFO] Decision Source: {decision.decision_source}")
print(f"[INFO] LLM Intent: {decision.llm_analysis.intent}")
print(f"[INFO] New Keywords Found: {decision.llm_analysis.new_keywords}")
print("[INFO] LLM Analysis Output:", decision.llm_analysis)
