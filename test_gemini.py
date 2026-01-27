from src.models import PackageInput
from src.prioritizer import DeliveryPrioritizer

prioritizer = DeliveryPrioritizer(llm_api_key="YOUR_REAL_API_KEY")  # Replace with your real key

pkg = PackageInput(
    id="TEST_GEMINI",
    description="Box of COVID-19 vaccines for ICU patients from City Hospital. Deliver immediately.",
    sender="City Hospital",
    recipient_type="hospital"
)

decision = prioritizer.prioritize(pkg)
print("LLM Analysis Output:", decision.llm_analysis)
