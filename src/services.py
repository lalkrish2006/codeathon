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
            
            new_score = min(1.0, current + 0.05)
        else:
            
            new_score = max(0.0, current - 0.2)
        
        self._trust_scores[sender] = new_score

class HumanApprovalService:
    def request_human_approval(self, decision_log: DecisionLog):

        print(f"\n[HUMAN_APPROVAL_REQ] Package {decision_log.package_id} requires approval.")
        print(f"Reason: {decision_log.reasoning}")
        print(f"Priority: {decision_log.final_priority_score} | Confidence: {decision_log.confidence_score}")
        
        
        
        
        
        
        
        
        pass
