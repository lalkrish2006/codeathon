from src.models import PackageInput, DecisionLog, EthicalCategory, UrgencyLevel

class EthicalEngine:
    def __init__(self):
        self.critical_keywords = [
            "blood", "organ", "transplant", "vaccine", "insulin", "epipen", "antidote", 
            "life support", "emergency medical", "defibrillator", "oxygen", "cylinder", 
            "concentrator", "ventilator", "suction machine", "nebulizer"
        ]
        self.safety_keywords = [
            "disaster relief", "flood aid", "earthquake", "biohazard", "containment", 
            "radioactive", "explosive", "hazmat"
        ]
        self.mild_keywords = ["pain", "fever", "cough", "cold", "flu", "migraine", "rash", "bandage", "checkup"]
        self.non_critical_keywords = ["trekking", "camping", "sports", "gym", "hiking", "vacation", "party", "travel"]
        self.future_use_keywords = ["future", "backup", "just in case", "stock up", "later use", "preventative", "standby"]
        self.misuse_keywords = ["pay extra", "double price", "urgent delivery fee", "bribe", "naming your price"]

    def evaluate(self, package: PackageInput) -> DecisionLog | None:
        """
        Evaluates the package against strict ethical rules.
        Returns a DecisionLog if a rule is triggered (override), else None.
        Ethical rules MUST override ML output.
        """
        desc_lower = package.description.lower()
        misuse_detected = any(kw in desc_lower for kw in self.misuse_keywords)
        misuse_note = " [MISUSE FLAG: User offered extra payment/bribe]" if misuse_detected else ""

        # Rule -1: MISUSE DETECTED (Priority 10 - SANCTION)
        # Payment-based urgency is STRICTLY disallowed.
        if misuse_detected:
            return DecisionLog(
                package_id=package.id,
                final_priority_score=10,
                decision_source="ETHICAL_RULE",
                ethical_category=EthicalCategory.STANDARD,
                reasoning=f"Payment-based urgency is not allowed. Priority clamped to LOW.{misuse_note}",
                misuse_flag=True
            )

        # Rule 0: Non-Medical / Recreational (Priority 10)
        # Prevents misuse of medical channel for non-medical items
        for kw in self.non_critical_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=10,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD,
                    reasoning=f"Detected recreational keyword: '{kw}'. Non-medical usage assigned lowest priority.{misuse_note}"
                )

        # Rule 0.5: Future Use / Hoarding (Priority 8)
        # "Just in case" negates immediate urgency
        for kw in self.future_use_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=8,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD,
                    reasoning=f"Detected low-urgency context: '{kw}'. Request is for future/backup use.{misuse_note}"
                )

        # Rule 1: Life-Critical (Highest Priority 1-2)
        for kw in self.critical_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=1,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.LIFE_SAVING,
                    reasoning=f"Detected critical keyword: '{kw}'. Life-critical items have absolute priority.{misuse_note}"
                )

        # Rule 2: Harm Prevention & Safety (Priority 2)
        if package.is_hazmat or any(kw in desc_lower for kw in self.safety_keywords):
            return DecisionLog(
                package_id=package.id,
                final_priority_score=2,
                decision_source="ETHICAL_RULE",
                ethical_category=EthicalCategory.HARM_PREVENTION,
                reasoning=f"Package identified as Safety/Hazmat or Disaster Relief.{misuse_note}"
            )

        # Rule 3: Mild Medical (Priority 3-4)
        for kw in self.mild_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=4,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD, # Medical but standard urgency
                    reasoning=f"Detected mild medical keyword: '{kw}'. Assigned correct medical priority.{misuse_note}"
                )

        # If Misuse detected but no other rule hit, we should perhaps force a low priority to prevent ML gaming?
        # User said: "NO priority increase". 
        # If we return None, ML runs. ML might give it High urgency if it uses "Urgent" words.
        # But if it had no critical keywords, it likely shouldn't be high.
        # Let's return None and let ML decide, but pass the misuse flag? 
        # `prioritizer.py` will run this AFTER ML now (per plan).
        # So if I return None here, the ML result stands.
        # If I want to ensure Misuse doesn't game ML, I should probably handle it here if ML gave it high score.
        # But `evaluate` doesn't know ML score yet explicitly in this signature.
        # Wait, plan said "Refactor prioritizer.py to run Ethical Engine AFTER ML".
        # So I can pass ML result to `evaluate`?
        # Or I can handle the logic in `prioritizer.py`.
        # I'll stick to `evaluate` purely checking text rules. Prioritizer will decide how to combine.
        
        return None
