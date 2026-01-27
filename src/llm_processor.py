from src.models import PackageInput, LLMAnalysis, PackageType
import logging
import json
import re

# Optional: Import Google Generative AI if available
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

class LLMInterpreter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.logger = logging.getLogger("LLMInterpreter")
        
        if self.api_key and HAS_GENAI:
            genai.configure(api_key=self.api_key)
            # Use a model that supports JSON mode if possible, or standard gemini-pro
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    def analyze_context(self, package: PackageInput) -> LLMAnalysis:
        """
        Uses LLM to interpret description and return STRUCTURED analysis.
        First tries to use the Real Gemini API. Falls back to Mock if failed/missing.
        """
        if self.model:
            try:
                return self._call_gemini_api(package)
            except Exception as e:
                self.logger.error(f"Gemini API failed: {e}. Falling back to mock.")
        
        return self._mock_analysis(package)

    def _call_gemini_api(self, package: PackageInput) -> LLMAnalysis:
        prompt = f"""
        Analyze this package description for delivery prioritization.
        Description: "{package.description}"
        Sender: "{package.sender}"
        
        Return valid JSON with checks:
        - detected_category: One of [medical, essential, commercial, legal, personal, unknown]
        - intent: Brief context (e.g. "Simulated training item", "Real organ")
        - is_false_positive: true if it looks like a critical item but isn't (e.g. "Model Kit" vs "Kidney")
        - urgency_modifier: float -0.5 to +0.5 based on urgency implies context.
        - new_keywords: List of strings. Extract novel keywords not usually in standard lists but relevant here (e.g. "Vaccine", "Defibrillator", "Plaintiff").
        - reasoning: Brief explanation.
        """
        
        response = self.model.generate_content(prompt)
        text = response.text
        
        # Clean markdown code blocks if present
        text = re.sub(r"```json", "", text)
        text = re.sub(r"```", "", text).strip()
        
        data = json.loads(text)
        
        return LLMAnalysis(
            detected_category=PackageType(data.get("detected_category", "unknown")),
            intent=data.get("intent", "Unknown context"),
            is_false_positive=data.get("is_false_positive", False),
            urgency_modifier=float(data.get("urgency_modifier", 0.0)),
            new_keywords=data.get("new_keywords", []),
            reasoning=data.get("reasoning", "LLM Analysis")
        )

    def _mock_analysis(self, package: PackageInput) -> LLMAnalysis:
        """
        Fallback logic that simulates LLM intelligence for False Positives.
        """
        desc_lower = package.description.lower()
        
        detected_category = PackageType.UNKNOWN
        is_false_positive = False
        urgency_modifier = 0.0
        intent = "Standard delivery"
        reasoning = "Normal keyword match (Mock)"
        new_keywords = []

        # Logic to simulate "Smart" LLM detection & Keyword Extraction
        if "model kit" in desc_lower or "toy" in desc_lower or "fake" in desc_lower or "replica" in desc_lower:
            if "kidney" in desc_lower or "heart" in desc_lower or "organ" in desc_lower:
                is_false_positive = True
                intent = "Educational/Hobbyist item"
                detected_category = PackageType.PERSONAL
                urgency_modifier = -0.4 
                reasoning = "Mock LLM Detected 'Model Kit' or 'replica'."
        
        elif "vaccine" in desc_lower:
             # Simulation of "New Keyword Discovery"
             intent = "Medical Supply"
             detected_category = PackageType.MEDICAL
             new_keywords = ["vaccine"]
             urgency_modifier = 0.3
             reasoning = "Mock LLM extracted 'vaccine' as new medical keyword."

        return LLMAnalysis(
            detected_category=detected_category,
            intent=intent,
            is_false_positive=is_false_positive,
            urgency_modifier=urgency_modifier,
            new_keywords=new_keywords,
            reasoning=reasoning
        )
