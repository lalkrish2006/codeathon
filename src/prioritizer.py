from src.models import PackageInput, DecisionLog, EthicalCategory
from src.ethical_engine import EthicalEngine
from src.ml_engine import ContextClassifier
from src.llm_processor import LLMInterpreter
import datetime

class DeliveryPrioritizer:
    def __init__(self, llm_api_key: str = None):
        self.ethical_engine = EthicalEngine()
        self.ml_model = ContextClassifier()
        self.llm = LLMInterpreter(api_key=llm_api_key)

    def prioritize(self, package: PackageInput) -> DecisionLog:
        # 1. Optional LLM Enrichment (for logging/clarity, not final decision logic mainly)
        # In a real system, this might feed into the ML model as a structured feature
        prediction_context = self.llm.enrich_context(package)
        
        # 2. Ethical Engine Check (First pass - Highest Authority)
        ethical_decision = self.ethical_engine.evaluate(package)
        if ethical_decision:
            # Rule triggered! Return immediate decision.
            return ethical_decision

        # 3. ML Contextual Classification (Second pass)
        ml_prediction = self.ml_model.predict(package)

        # 4. Final Priority Calculation pipeline
        # Map ML urgency/harm scores to priority tiers (3-10)
        # 1-2 are reserved for Ethical Engine
        
        final_score = 10 # Default Lowest priority
        
        if ml_prediction.urgency_score > 0.8 or ml_prediction.harm_score > 0.8:
            final_score = 3
        elif ml_prediction.urgency_score > 0.6:
            final_score = 4
        elif ml_prediction.urgency_score > 0.4:
            final_score = 5
        elif ml_prediction.urgency_score > 0.2:
            final_score = 7
        
        return DecisionLog(
            package_id=package.id,
            final_priority_score=final_score,
            decision_source="ML_CONTEXTUAL_MODEL",
            ethical_category=EthicalCategory.STANDARD,
            ml_prediction=ml_prediction,
            reasoning=f"Standard Delivery. ML classified as {ml_prediction.predicted_category.value}. {ml_prediction.explanation} Context: {prediction_context}",
            timestamp=datetime.datetime.now()
        )
