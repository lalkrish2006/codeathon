from src.models import PackageInput, MLPrediction, PackageType
import random
from typing import List

class ContextClassifier:
    def __init__(self):
        
        self.category_keywords = {
            PackageType.MEDICAL: ["medicine", "pill", "pharma", "clinical", "doctor", "nurse", "prescription", "icu", "ward"],
            PackageType.LEGAL: ["court", "summon", "affidavit", "contract", "legal", "lawyer", "judicial"],
            PackageType.COMMERCIAL: ["invoice", "catalog", "restock", "inventory", "bulk", "retail", "store"],
            PackageType.PERSONAL: ["gift", "birthday", "clothes", "toy", "game", "snack", "personal"],
            PackageType.ESSENTIAL: ["food", "water", "groceries", "hygiene", "formula"]
        }
        
        
        self.sender_weights = {
            "hospital": 0.9,
            "pharmacy": 0.8,
            "law_firm": 0.7,
            "government": 0.6,
            "business": 0.3, 
            "individual": 0.1
        }
        
        
        self.recipient_weights = {
            "hospital": 0.9,
            "emergency_center": 0.95,
            "court": 0.7,
            "residential": 0.2,
            "office": 0.3
        }
        
        
        self.learned_keywords = []

    def update_model(self, new_keywords: List[str], category: PackageType):

        for kw in new_keywords:
            kw_lower = kw.lower()
            if kw_lower not in self.category_keywords.get(category, []):
                if category not in self.category_keywords:
                    self.category_keywords[category] = []
                self.category_keywords[category].append(kw_lower)
                self.learned_keywords.append(f"{kw_lower} -> {category.value}")
                print(f"[ML ADAPTATION] Learned new keyword: '{kw_lower}' for category {category.value}")

    def predict(self, package: PackageInput) -> MLPrediction:

        desc_lower = package.description.lower()
        predicted_category = PackageType.UNKNOWN
        
        
        
        for category in [PackageType.MEDICAL, PackageType.LEGAL, PackageType.ESSENTIAL, PackageType.COMMERCIAL, PackageType.PERSONAL]:
            keywords = self.category_keywords.get(category, [])
            if any(kw in desc_lower for kw in keywords):
                predicted_category = category
                break
        
        
        if predicted_category == PackageType.UNKNOWN:
            if "hospital" in package.sender.lower():
                predicted_category = PackageType.MEDICAL
            elif "law" in package.sender.lower():
                 predicted_category = PackageType.LEGAL
            elif "inc" in package.sender.lower() or "corp" in package.sender.lower():
                predicted_category = PackageType.COMMERCIAL
            else:
                predicted_category = PackageType.PERSONAL
        
        
        
        content_score = 0.2
        if predicted_category == PackageType.MEDICAL: content_score = 0.85
        elif predicted_category == PackageType.LEGAL: content_score = 0.7
        elif predicted_category == PackageType.ESSENTIAL: content_score = 0.6
        elif predicted_category == PackageType.COMMERCIAL: content_score = 0.3
        
        
        sender_score = 0.2
        for key, val in self.sender_weights.items():
            if key in package.sender.lower():
                sender_score = val
                break
                
        recipient_score = 0.2
        for key, val in self.recipient_weights.items():
            if key in package.recipient_type.lower():
                recipient_score = val
                break
        
        urgency_score = (0.5 * content_score) + (0.25 * sender_score) + (0.25 * recipient_score)

        
        if "urgent" in desc_lower or "express" in desc_lower:
            urgency_score = min(urgency_score + 0.15, 0.95)
        
        if package.metadata.get("express_delivery_requested"):
            urgency_score = min(urgency_score + 0.1, 0.98)

        
        harm_score = urgency_score * 0.8 
        if predicted_category == PackageType.MEDICAL: 
            harm_score = urgency_score 
        
        return MLPrediction(
            predicted_category=predicted_category,
            urgency_score=round(urgency_score, 2),
            harm_score=round(harm_score, 2),
            confidence=0.85,
            explanation=f"Classified as {predicted_category.value.upper()}. Base urgency derived from Content({content_score}), Sender({sender_score}), Recipient({recipient_score})."
        )
