from src.models import PackageInput, DecisionLog, EthicalCategory, PackageType
from src.ethical_engine import EthicalEngine
from src.ml_engine import ContextClassifier
from src.llm_processor import LLMInterpreter
import datetime

class DeliveryPrioritizer:
    def __init__(self, llm_api_key: str = "AIzaSyBEnIgTnIZs6b2_yFGnhPOiFVpwENZZ1d4"):
        self.ethical_engine = EthicalEngine()
        self.ml_model = ContextClassifier()
        self.llm = LLMInterpreter(api_key=llm_api_key)

    def prioritize(self, package: PackageInput) -> DecisionLog:
        # 1. Ethical Engine Check (Highest Authority)
        ethical_decision = self.ethical_engine.evaluate(package)
        
        # 2. LLM Analysis (Always run for potential enrichment & False Positive check)
        # Note: In a high-throughput system, you might skip this for obvious cases, 
        # but here we need it for the "False Positive" check against rigid rules.
        llm_analysis = self.llm.analyze_context(package)
        
        # 3. Adaptive Learning Step
        # If LLM found new keywords, feed them back to ML engine
        if llm_analysis.new_keywords:
            # Only update if we are fairly confident or if category matches
            # For prototype, we update immediately.
             self.ml_model.update_model(llm_analysis.new_keywords, llm_analysis.detected_category)

        # 4. Handle Ethical Conflict (Rule vs False Positive)
        if ethical_decision:
            if llm_analysis.is_false_positive:
                 # Override Rule!
                 pass 
            else:
                 # Attach the LLM analysis to the decision log for completeness/audit
                 ethical_decision.llm_analysis = llm_analysis
                 if llm_analysis.new_keywords:
                     ethical_decision.reasoning += f" [Adaptive] Learned: {llm_analysis.new_keywords}"
                 return ethical_decision

        # 5. ML Contextual Classification (Now potentially using updated weights!)
        ml_prediction = self.ml_model.predict(package)
        
        # 6. Hybrid Refinement
        final_urgency = ml_prediction.urgency_score + llm_analysis.urgency_modifier
        final_urgency = max(0.0, min(1.0, final_urgency))
        
        final_score = 10 
        if final_urgency > 0.85: final_score = 3
        elif final_urgency > 0.65: final_score = 4
        elif final_urgency > 0.45: final_score = 5
        elif final_urgency > 0.25: final_score = 7
        
        reasoning = f"Hybrid Logic: ML({ml_prediction.predicted_category.value}, {ml_prediction.urgency_score}) + LLM({llm_analysis.intent}, mod={llm_analysis.urgency_modifier}). "
        
        if llm_analysis.new_keywords:
            reasoning += f" [Adaptive] Learned: {llm_analysis.new_keywords}"
            
        if llm_analysis.is_false_positive:
            reasoning = "OVERRIDE: Ethical Engine bypassed due to LLM False Positive detection. " + reasoning

        return DecisionLog(
            package_id=package.id,
            final_priority_score=final_score,
            decision_source="HYBRID_ADAPTIVE_AI",
            ethical_category=EthicalCategory.STANDARD,
            ml_prediction=ml_prediction,
            llm_analysis=llm_analysis,
            reasoning=reasoning,
            timestamp=datetime.datetime.now()
        )
