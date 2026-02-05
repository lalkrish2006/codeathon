from src.models import PackageInput, DecisionLog, EthicalCategory, PackageType
from src.ethical_engine import EthicalEngine
from src.ml_engine import ContextClassifier
from src.llm_processor import LLMInterpreter
from src.services import SenderTrustService, HumanApprovalService  
import datetime

class DeliveryPrioritizer:
    def __init__(self, llm_api_key: str = "AIzaSyB53_7fH6tC1Cg32pDjIqx-6gXlQ0mMOpE"):
        self.ethical_engine = EthicalEngine()
        self.ml_model = ContextClassifier()
        self.llm = LLMInterpreter(api_key=llm_api_key)
        self.trust_service = SenderTrustService()      
        self.approval_service = HumanApprovalService() 

    def prioritize(self, package: PackageInput) -> DecisionLog:
        
        trust_score = self.trust_service.get_trust_score(package.sender)
        
        
        
        
        
        
        
        
        desc_lower = (package.description or "").lower().strip()
        
        non_urgent_phrases = ["not urgent", "no emergency", "future use", "can wait", "no immediate need"]
        emergency_indicators = ["emergency", "critical", "immediate", "oxygen level dropping", "struggling to breathe", "severe", "life threatening", "icu"]
        
        
        is_empty_or_short = len(desc_lower) < 5
        is_explicitly_non_urgent = any(phrase in desc_lower for phrase in non_urgent_phrases)
        
        
        has_emergency_intent = any(indicator in desc_lower for indicator in emergency_indicators)
        
        if is_empty_or_short or is_explicitly_non_urgent or not has_emergency_intent:
            print(f"[Prioritizer] Guard: No emergency intent detected. Skipping AI. Desc: '{desc_lower[:50]}...'")
            
            
            
            return DecisionLog(
                package_id=package.id,
                final_priority_score=7, 
                decision_source="PRE_CHECK_GUARD",
                ethical_category=EthicalCategory.STANDARD,
                reasoning="Pre-Check: No explicit emergency intent detected (Empty description, non-urgent phrases, or lack of critical keywords). Defaulting to Normal Priority.",
                ml_prediction=None, 
                llm_analysis=None,  
                confidence_score=0.2, 
                requires_human_approval=False,
                sender_trust_score=trust_score,
                ai_models_used=[]
            )
        
        
        ml_prediction = self.ml_model.predict(package)
        llm_analysis = self.llm.analyze_context(package)
        
        
        
        llm_provider = "Gemini-2.5-Flash" if self.llm.api_key else "Local-Mock-LLM"
        print(f"[LLM] Provider used: {llm_provider}")

        
        if llm_analysis.new_keywords:
             self.ml_model.update_model(llm_analysis.new_keywords, llm_analysis.detected_category)

        
        trust_modifier = 0.0
        if trust_score < 0.5: trust_modifier = -0.1
        elif trust_score > 0.9: trust_modifier = 0.05
        
        final_urgency = ml_prediction.urgency_score + llm_analysis.urgency_modifier + trust_modifier
        final_urgency = max(0.0, min(1.0, final_urgency))
        
        
        base_priority = 10 
        if final_urgency > 0.85: base_priority = 3
        elif final_urgency > 0.65: base_priority = 4
        elif final_urgency > 0.45: base_priority = 5
        elif final_urgency > 0.25: base_priority = 7

        base_confidence = min(0.99, ml_prediction.confidence + (0.1 if llm_analysis.urgency_modifier * (ml_prediction.urgency_score - 0.5) > 0 else 0))
        if trust_score < 0.4: base_confidence *= 0.8

        
        ethical_decision = self.ethical_engine.evaluate(package)
        
        final_decision_log = None
        
        if ethical_decision:
            
            
            source_label = "GEMINI+RULES" if "Gemini" in llm_provider else "HYBRID_ADAPTIVE_AI"
            
            if llm_analysis.is_false_positive:
                
                reasoning = (
                    f"Decision Explanation:\n"
                    f"• Ethical Rule Triggered: {ethical_decision.reasoning}\n"
                    f"• OVERRIDE: Ethical Rule bypassed due to LLM False Positive detection ({llm_analysis.intent}).\n"
                    f"• ML Prediction: {ml_prediction.predicted_category.value} -> Priority {base_priority}\n"
                    f"• Action: Reverted to ML/Hybrid Priority."
                )
                
                final_decision_log = DecisionLog(
                    package_id=package.id,
                    final_priority_score=base_priority,
                    decision_source=source_label,
                    ethical_category=EthicalCategory.STANDARD,
                    reasoning=reasoning,
                    ml_prediction=ml_prediction,
                    llm_analysis=llm_analysis,
                    confidence_score=base_confidence,
                    requires_human_approval=(base_priority <= 2),
                    sender_trust_score=trust_score,
                    ai_models_used=["ContextClassifier", llm_provider]
                )
            else:
                
                
                override_reason = f"[Ethical Engine] Override applied: {ethical_decision.reasoning}"
                
                final_decision_log = ethical_decision
                final_decision_log.ml_prediction = ml_prediction
                final_decision_log.llm_analysis = llm_analysis
                final_decision_log.confidence_score = 0.98 
                final_decision_log.sender_trust_score = trust_score
                final_decision_log.ai_models_used = ["EthicalEngine", llm_provider]
                final_decision_log.requires_human_approval = (final_decision_log.final_priority_score <= 2)
                
                final_decision_log.reasoning = (
                    f"Decision Explanation:\n"
                    f"• {override_reason}\n"
                    f"• ML Context: {ml_prediction.predicted_category.value}\n"
                    f"• Action: {'Human approval required' if final_decision_log.requires_human_approval else 'Auto-approved'}"
                )

        else:
            
            reasoning = (
                 f"Decision Explanation:\n"
                 f"• Ethical Rule: None\n"
                 f"• ML Prediction: {ml_prediction.predicted_category.value} ({ml_prediction.urgency_score:.2f} urgency)\n"
                 f"• Gemini Intent: {llm_analysis.intent}\n"
                 f"• Confidence: {base_confidence:.2f}\n"
                 f"• Action: {'Human approval required' if base_priority <= 2 else 'Auto-approved'}"
            )
            
            
            source_label = "GEMINI+RULES" if "Gemini" in llm_provider else "HYBRID_ADAPTIVE_AI"

            final_decision_log = DecisionLog(
                package_id=package.id,
                final_priority_score=base_priority,
                decision_source=source_label,
                ethical_category=EthicalCategory.STANDARD,
                reasoning=reasoning,
                ml_prediction=ml_prediction,
                llm_analysis=llm_analysis,
                confidence_score=base_confidence,
                requires_human_approval=(base_priority <= 2),
                sender_trust_score=trust_score,
                ai_models_used=["ContextClassifier", llm_provider]
            )

        
        
        if not getattr(final_decision_log, 'misuse_flag', False):
            desc_lower = package.description.lower()
            
            
            if any(kw in desc_lower for kw in ["stable", "daily support", "precaution", "backup"]):
                print("DEBUG: Applying Calibration Rule 1")
                final_decision_log.final_priority_score = min(10, final_decision_log.final_priority_score + 2)
                final_decision_log.reasoning += "\n• [Calibration] Urgency downgraded (+2) due to stability/backup keywords."
                final_decision_log.requires_human_approval = (final_decision_log.final_priority_score <= 2)

            
            
            urgency_keywords = ["immediate", "today", "now", "emergency", "severe", "pain", "critical", "bleeding", "allergy", "asthma", "heart", "attack", "accident"]
            has_urgency_kw = any(kw in desc_lower for kw in urgency_keywords)
            
            if final_decision_log.final_priority_score <= 4 and not has_urgency_kw:
                 print("DEBUG: Applying Rule 1.5 - Critical Item but No Urgency Detected")
                 final_decision_log.final_priority_score = 5 
                 final_decision_log.reasoning += "\n• [Refinement] Critical Category detected, but user description lacks explicit urgency keywords. Downgrading to Standard High (P5)."
                 final_decision_log.requires_human_approval = False

            
            if any(kw in desc_lower for kw in ["icu", "oxygen saturation dropped", "immediate", "life-threatening"]):
                final_decision_log.final_priority_score = 1
                final_decision_log.confidence_score = 0.99
                final_decision_log.requires_human_approval = True
                final_decision_log.reasoning += "\n• [Calibration] CRITICAL CONDITION detected. Enforcing Priority 1."

        
        if final_decision_log.requires_human_approval:
             self.approval_service.request_human_approval(final_decision_log)

        return final_decision_log
