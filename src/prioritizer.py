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
        # P4: Get Trust Score
        trust_score = self.trust_service.get_trust_score(package.sender)
        
        # 1. Run ML & LLM Analysis (Signals)
        ml_prediction = self.ml_model.predict(package)
        llm_analysis = self.llm.analyze_context(package)
        
        # Debug Log for LLM Provider (Requested)
        # Note: llm_processor logs to stdout, but we can add to reasoning or just print here
        llm_provider = "Gemini-2.5-Flash" if self.llm.api_key else "Local-Mock-LLM"
        print(f"[LLM] Provider used: {llm_provider}")

        # Adaptive Learning
        if llm_analysis.new_keywords:
             self.ml_model.update_model(llm_analysis.new_keywords, llm_analysis.detected_category)

        # 2. Calculate BASE Priority (Hybrid ML + Trust)
        trust_modifier = 0.0
        if trust_score < 0.5: trust_modifier = -0.1
        elif trust_score > 0.9: trust_modifier = 0.05
        
        final_urgency = ml_prediction.urgency_score + llm_analysis.urgency_modifier + trust_modifier
        final_urgency = max(0.0, min(1.0, final_urgency))
        
        # Map Urgency to Priority (10=Low, 1=High)
        base_priority = 10 
        if final_urgency > 0.85: base_priority = 3
        elif final_urgency > 0.65: base_priority = 4
        elif final_urgency > 0.45: base_priority = 5
        elif final_urgency > 0.25: base_priority = 7

        base_confidence = min(0.99, ml_prediction.confidence + (0.1 if llm_analysis.urgency_modifier * (ml_prediction.urgency_score - 0.5) > 0 else 0))
        if trust_score < 0.4: base_confidence *= 0.8

        # 3. Ethical Engine Check (FINAL AUTHORITY)
        ethical_decision = self.ethical_engine.evaluate(package)
        
        final_decision_log = None
        
        if ethical_decision:
            # Check for False Positives (The ONLY exception to the Rule)
            # Determine Source Label
            source_label = "GEMINI+RULES" if "Gemini" in llm_provider else "HYBRID_ADAPTIVE_AI"
            
            if llm_analysis.is_false_positive:
                # LLM says "It's a model kit/toy", ignoring keyword match.
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
                # ETHICAL OVERRIDE APPLIED
                # Use the priority from Ethical Engine
                override_reason = f"[Ethical Engine] Override applied: {ethical_decision.reasoning}"
                
                final_decision_log = ethical_decision
                final_decision_log.ml_prediction = ml_prediction
                final_decision_log.llm_analysis = llm_analysis
                final_decision_log.confidence_score = 0.98 # Rules are high confidence
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
            # No Ethical Rule -> Use Hybrid ML
            reasoning = (
                 f"Decision Explanation:\n"
                 f"• Ethical Rule: None\n"
                 f"• ML Prediction: {ml_prediction.predicted_category.value} ({ml_prediction.urgency_score:.2f} urgency)\n"
                 f"• Gemini Intent: {llm_analysis.intent}\n"
                 f"• Confidence: {base_confidence:.2f}\n"
                 f"• Action: {'Human approval required' if base_priority <= 2 else 'Auto-approved'}"
            )
            
            # Determine Source Label
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

        # Phase 2 Calibration: Medical Severity Dampening & Promotion
        # Only apply if NOT flagged for misuse
        if not getattr(final_decision_log, 'misuse_flag', False):
            desc_lower = package.description.lower()
            
            # Calibration Rule 1: Downgrade for stability/backup
            if any(kw in desc_lower for kw in ["stable", "daily support", "precaution", "backup"]):
                print("DEBUG: Applying Calibration Rule 1")
                final_decision_log.final_priority_score = min(10, final_decision_log.final_priority_score + 2)
                final_decision_log.reasoning += "\n• [Calibration] Urgency downgraded (+2) due to stability/backup keywords."
                final_decision_log.requires_human_approval = (final_decision_log.final_priority_score <= 2)

            # Rule 1.5: Non-Urgent Critical Item Check (Phase 5 Refinement)
            # If item is critical (Priority <= 4) but description lacks explicit urgency, downgrade to Standard (5-7).
            urgency_keywords = ["immediate", "today", "now", "emergency", "severe", "pain", "critical", "bleeding", "allergy", "asthma", "heart", "attack", "accident"]
            has_urgency_kw = any(kw in desc_lower for kw in urgency_keywords)
            
            if final_decision_log.final_priority_score <= 4 and not has_urgency_kw:
                 print("DEBUG: Applying Rule 1.5 - Critical Item but No Urgency Detected")
                 final_decision_log.final_priority_score = 5 # Downgrade to Standard/High-Standard
                 final_decision_log.reasoning += "\n• [Refinement] Critical Category detected, but user description lacks explicit urgency keywords. Downgrading to Standard High (P5)."
                 final_decision_log.requires_human_approval = False

            # Calibration Rule 2: Force Priority 1 for Critical/ICU
            if any(kw in desc_lower for kw in ["icu", "oxygen saturation dropped", "immediate", "life-threatening"]):
                final_decision_log.final_priority_score = 1
                final_decision_log.confidence_score = 0.99
                final_decision_log.requires_human_approval = True
                final_decision_log.reasoning += "\n• [Calibration] CRITICAL CONDITION detected. Enforcing Priority 1."

        # 4. Human Approval Stub
        if final_decision_log.requires_human_approval:
             self.approval_service.request_human_approval(final_decision_log)

        return final_decision_log
