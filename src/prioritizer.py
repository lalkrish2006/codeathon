from src.models import PackageInput, DecisionLog, EthicalCategory, PackageType
from src.ethical_engine import EthicalEngine
from src.ml_engine import ContextClassifier
from src.llm_processor import LLMInterpreter
from src.services import SenderTrustService, HumanApprovalService  # New services
import datetime

class DeliveryPrioritizer:
    def __init__(self, llm_api_key: str = "AIzaSyB53_7fH6tC1Cg32pDjIqx-6gXlQ0mMOpE"):
        self.ethical_engine = EthicalEngine()
        self.ml_model = ContextClassifier()
        self.llm = LLMInterpreter(api_key=llm_api_key)
        self.trust_service = SenderTrustService()      # Phase 4
        self.approval_service = HumanApprovalService() # Phase 4

    def prioritize(self, package: PackageInput) -> DecisionLog:
        # P4: Get Trust Score (Start)
        trust_score = self.trust_service.get_trust_score(package.sender)
        
        # 1. Ethical Engine Check (Highest Authority)
        ethical_decision = self.ethical_engine.evaluate(package)
        
        # 2. LLM Analysis (Always run for potential enrichment & False Positive check)
        llm_analysis = self.llm.analyze_context(package)
        
        # 3. Adaptive Learning Step
        if llm_analysis.new_keywords:
             self.ml_model.update_model(llm_analysis.new_keywords, llm_analysis.detected_category)

        # 4. Handle Ethical Conflict (Rule vs False Positive)
        if ethical_decision:
            if llm_analysis.is_false_positive:
                 # Override Rule!
                 pass # Fall through to ML/Hybrid logic
            else:
                 # Ethical Rule Applied
                 # P4: Calculate Confidence for Ethical Rule
                 # Base confidence high for rules, adjusted by trust? 
                 # Actually rules are absolute, so confidence is naturally high.
                 confidence = 0.95
                 
                 # P4: Check Human Approval (Priority 1 or 2)
                 requires_approval = ethical_decision.final_priority_score <= 2
                 
                 # Enrich the existing ethical_decision object
                 ethical_decision.llm_analysis = llm_analysis
                 ethical_decision.confidence_score = confidence
                 ethical_decision.sender_trust_score = trust_score
                 ethical_decision.requires_human_approval = requires_approval
                 ethical_decision.ai_models_used = ["EthicalEngine", "Gemini-2.5-Flash"]
                 
                 if llm_analysis.new_keywords:
                     ethical_decision.reasoning += f" [Adaptive] Learned: {llm_analysis.new_keywords}"
                     
                 # Explanation Format
                 ethical_decision.reasoning = (
                     f"Decision Explanation:\n"
                     f"• Ethical Rule: {ethical_decision.reasoning}\n"
                     f"• ML Prediction: N/A (Rule Override)\n"
                     f"• Gemini Intent: {llm_analysis.intent}\n"
                     f"• Confidence: {confidence}\n"
                     f"• Action: {'Human approval required' if requires_approval else 'Auto-approved'}"
                 )

                 # Trigger approval Stub
                 if requires_approval:
                     self.approval_service.request_human_approval(ethical_decision)
                     
                 return ethical_decision

        # 5. ML Contextual Classification
        ml_prediction = self.ml_model.predict(package)
        
        # 6. Hybrid Refinement (adjusted by P4 Trust)
        # Trust Impact: Lower trust reduces urgency slightly
        trust_modifier = 0.0
        if trust_score < 0.5:
            trust_modifier = -0.1
        elif trust_score > 0.9:
            trust_modifier = 0.05
            
        final_urgency = ml_prediction.urgency_score + llm_analysis.urgency_modifier + trust_modifier
        final_urgency = max(0.0, min(1.0, final_urgency))
        
        final_score = 10 
        if final_urgency > 0.85: final_score = 3
        elif final_urgency > 0.65: final_score = 4
        elif final_urgency > 0.45: final_score = 5
        elif final_urgency > 0.25: final_score = 7
        
        # P4: Confidence Calculation
        # Simple weighted formula
        # ML Confidence (0-1) + LLM Consistency?
        # If ML and LLM agree on category/urgency -> High Confidence
        # For prototype: Average of ML confidence and (1 - abs(ML_urgency - LLM_modifier))?
        # Let's simplify: ML confidence is base. If LLM agrees, boost it.
        # Actually LLM doesnt give a confidence score, but we can infer consistency.
        
        base_confidence = ml_prediction.confidence
        consistency_bonus = 0.0
        # If ML high urgency and LLM positive modifier -> Consistent
        if ml_prediction.urgency_score > 0.5 and llm_analysis.urgency_modifier >= 0:
            consistency_bonus = 0.1
        elif ml_prediction.urgency_score < 0.5 and llm_analysis.urgency_modifier < 0:
            consistency_bonus = 0.1
            
        confidence = min(0.99, base_confidence + consistency_bonus)
        if trust_score < 0.4: # Low trust penalizes confidence in the SOURCE
             confidence *= 0.8

        requires_approval = final_score <= 2 # Likely won't happen for hybrid unless score mappings change, but safest to dynamic
        
        reasoning = (
             f"Decision Explanation:\n"
             f"• Ethical Rule: None\n"
             f"• ML Prediction: {ml_prediction.predicted_category.value} ({ml_prediction.urgency_score:.2f} urgency)\n"
             f"• Gemini Intent: {llm_analysis.intent}\n"
             f"• Trust Score: {trust_score:.2f}\n"
             f"• Confidence: {confidence:.2f}\n"
             f"• Action: {'Human approval required' if requires_approval else 'Auto-approved'}"
        )
        
        if llm_analysis.is_false_positive:
            reasoning = "OVERRIDE: Ethical Engine bypassed due to LLM False Positive detection. " + reasoning

        decision_log = DecisionLog(
            package_id=package.id,
            final_priority_score=final_score,
            decision_source="HYBRID_ADAPTIVE_AI",
            ethical_category=EthicalCategory.STANDARD,
            ml_prediction=ml_prediction,
            llm_analysis=llm_analysis,
            reasoning=reasoning,
            timestamp=datetime.datetime.now(),
            confidence_score=confidence,
            requires_human_approval=requires_approval,
            sender_trust_score=trust_score,
            ai_models_used=["ContextClassifier", "Gemini-2.5-Flash"]
        )
        
        if requires_approval:
             self.approval_service.request_human_approval(decision_log)

        return decision_log
