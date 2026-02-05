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

        desc_lower = package.description.lower()
        misuse_detected = any(kw in desc_lower for kw in self.misuse_keywords)
        misuse_note = " [MISUSE FLAG: User offered extra payment/bribe]" if misuse_detected else ""

        
        
        if misuse_detected:
            return DecisionLog(
                package_id=package.id,
                final_priority_score=10,
                decision_source="ETHICAL_RULE",
                ethical_category=EthicalCategory.STANDARD,
                reasoning=f"Payment-based urgency is not allowed. Priority clamped to LOW.{misuse_note}",
                misuse_flag=True
            )

        
        
        for kw in self.non_critical_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=10,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD,
                    reasoning=f"Detected recreational keyword: '{kw}'. Non-medical usage assigned lowest priority.{misuse_note}"
                )

        
        
        for kw in self.future_use_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=8,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD,
                    reasoning=f"Detected low-urgency context: '{kw}'. Request is for future/backup use.{misuse_note}"
                )

        
        for kw in self.critical_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=1,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.LIFE_SAVING,
                    reasoning=f"Detected critical keyword: '{kw}'. Life-critical items have absolute priority.{misuse_note}"
                )

        
        if package.is_hazmat or any(kw in desc_lower for kw in self.safety_keywords):
            return DecisionLog(
                package_id=package.id,
                final_priority_score=2,
                decision_source="ETHICAL_RULE",
                ethical_category=EthicalCategory.HARM_PREVENTION,
                reasoning=f"Package identified as Safety/Hazmat or Disaster Relief.{misuse_note}"
            )

        
        for kw in self.mild_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=4,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.STANDARD, 
                    reasoning=f"Detected mild medical keyword: '{kw}'. Assigned correct medical priority.{misuse_note}"
                )

        
        
        
        
        
        
        
        
        
        
        
        
        
        
        return None
