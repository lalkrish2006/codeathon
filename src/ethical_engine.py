from src.models import PackageInput, DecisionLog, EthicalCategory, UrgencyLevel

class EthicalEngine:
    def __init__(self):
        self.critical_keywords = [
            "blood", "organ", "transplant", "vaccine", "insulin", "epipen", "antidote", 
            "life support", "emergency medical", "defibrillator"
        ]
        self.safety_keywords = [
            "disaster relief", "flood aid", "earthquake", "biohazard", "containment", 
            "radioactive", "explosive", "hazmat"
        ]

    def evaluate(self, package: PackageInput) -> DecisionLog | None:
        """
        Evaluates the package against strict ethical rules.
        Returns a DecisionLog if a rule is triggered (override), else None.
        """
        desc_lower = package.description.lower()

        # Rule 1: Life-Critical (Highest Priority)
        # Matches specific medical keywords + Hospital/Medical destination implies strict priority
        for kw in self.critical_keywords:
            if kw in desc_lower:
                return DecisionLog(
                    package_id=package.id,
                    final_priority_score=1,
                    decision_source="ETHICAL_RULE",
                    ethical_category=EthicalCategory.LIFE_SAVING,
                    reasoning=f"Detected critical keyword: '{kw}'. Life-critical items have absolute priority."
                )

        # Rule 2: Harm Prevention & Safety
        # Hazmat or disaster relief items
        if package.is_hazmat or any(kw in desc_lower for kw in self.safety_keywords):
            return DecisionLog(
                package_id=package.id,
                final_priority_score=2,
                decision_source="ETHICAL_RULE",
                ethical_category=EthicalCategory.HARM_PREVENTION,
                reasoning="Package identified as Safety/Hazmat or Disaster Relief. Prioritized for public safety."
            )

        # No ethical override found
        return None
