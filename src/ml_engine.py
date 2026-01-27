from src.models import PackageInput, MLPrediction, PackageType
import random

class ContextClassifier:
    def __init__(self):
        # Simple keyword mappings for heuristic classification
        self.category_keywords = {
            PackageType.LEGAL: ["court", "summon", "affidavit", "contract", "legal", "lawyer"],
            PackageType.COMMERCIAL: ["invoice", "catalog", "restock", "inventory", "bulk", "retail"],
            PackageType.PERSONAL: ["gift", "birthday", "clothes", "toy", "game", "snack"],
            PackageType.ESSENTIAL: ["food", "water", "groceries", "hygiene", "formula"]
        }

    def predict(self, package: PackageInput) -> MLPrediction:
        """
        Predicts package category and scores based on metadata and simple text analysis.
        In a real system, this would use a trained NLP model (BERT/RoBERTa).
        """
        desc_lower = package.description.lower()
        predicted_category = PackageType.UNKNOWN
        
        # 1. Determine Category
        for category, keywords in self.category_keywords.items():
            if any(kw in desc_lower for kw in keywords):
                predicted_category = category
                break
        
        # Default to commercial if unknown but sender is a business (heuristic)
        if predicted_category == PackageType.UNKNOWN:
            if "inc" in package.sender.lower() or "corp" in package.sender.lower():
                predicted_category = PackageType.COMMERCIAL
            else:
                predicted_category = PackageType.PERSONAL

        # 2. Calculate Urgency & Harm Scores (Heuristic Logic)
        urgency_score = 0.3 # Default low-medium
        harm_score = 0.1 # Default low

        if predicted_category == PackageType.LEGAL:
            urgency_score = 0.7 # Legal docs are often time-sensitive
            harm_score = 0.6    # Missed deadlines can cause harm
        
        elif predicted_category == PackageType.ESSENTIAL:
            urgency_score = 0.6
            harm_score = 0.4

        elif "urgent" in desc_lower or "express" in desc_lower:
             # Bump urgency slightly if explicitly stated, but don't trust blindly
            urgency_score = min(urgency_score + 0.2, 0.9)

        # 3. Simulate specific time-sensitive metadata
        if package.metadata.get("express_delivery_requested"):
            urgency_score = max(urgency_score, 0.5)

        return MLPrediction(
            predicted_category=predicted_category,
            urgency_score=round(urgency_score, 2),
            harm_score=round(harm_score, 2),
            confidence=0.85, # Mock confidence
            explanation=f"Classified as {predicted_category.value.upper()} based on keywords and sender data."
        )
