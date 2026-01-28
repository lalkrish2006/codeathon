from typing import Dict, Optional
from src.models import DecisionLog

class SenderTrustService:
    def __init__(self):
        self._trust_scores: Dict[str, float] = {}
        self.DEFAULT_TRUST = 0.7

    def get_trust_score(self, sender: str) -> float:
        return self._trust_scores.get(sender, self.DEFAULT_TRUST)

    def update_trust_score(self, sender: str, is_valid: bool):
        current = self.get_trust_score(sender)
        if is_valid:
            # Increase trust slowly
            new_score = min(1.0, current + 0.05)
        else:
            # Decrease trust faster
            new_score = max(0.0, current - 0.2)
        
        self._trust_scores[sender] = new_score

class HumanApprovalService:
    def request_human_approval(self, decision_log: DecisionLog):
        """
        Stub for requesting human approval.
        In a real system, this would trigger a UI notification or email.
        For now, it just logs/prints.
        """
        print(f"\n[HUMAN_APPROVAL_REQ] Package {decision_log.package_id} requires approval.")
        print(f"Reason: {decision_log.reasoning}")
        print(f"Priority: {decision_log.final_priority_score} | Confidence: {decision_log.confidence_score}")
        
        # Simulate approval process stub
        # In this stub we do NOT auto-approve here, the logic just marks it as 'required'.
        # The 'human_approved' field might stay None until an async action happens.
        # But per requirements: "Do NOT block execution — simulate approval with a stub function"
        # So we might mock an "Auto-approve for demo" or just leave it pending.
        # Requirement: "simulate approval with a stub function: def request_human_approval(decision_log): ..."
        # I will leave it as a log for now. The status in DecisionLog will be 'requires_human_approval=True'
        pass
