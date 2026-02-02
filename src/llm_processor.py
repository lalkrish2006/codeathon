from src.models import PackageInput, LLMAnalysis, PackageType
import logging
import json
import re
import requests

class LLMInterpreter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.logger = logging.getLogger("LLMInterpreter")
        self.client = None # No longer used, but kept for compatibility if needed or removed

    def analyze_context(self, package: PackageInput) -> LLMAnalysis:
        """
        Uses LLM to interpret description and return STRUCTURED analysis.
        First tries to use the Real Gemini API. Falls back to Mock if failed/missing.
        """
        if self.api_key:
            try:
                print(f"[DEBUG] Gemini API called for package: {package.id}")
                return self._call_gemini_api(package)
            except Exception as e:
                self.logger.error(f"Gemini API failed: {e}. Falling back to mock.")
                # The user asked NOT to silently fall back for the "Success" test, but for the main app logic `analyze_context`, 
                # their prompt "If the API call fails, log the exact HTTP error code and response body. Do NOT silently fall back..." 
                # technically applied to the "Minimal test call" step BUT "Do not change any business logic... Mock fallback logic (required for resilience)".
                # The user "Do NOT modify... Mock fallback logic". So business logic MUST fallback.
                # However, inside _call_gemini_api, I should log cleanly.
        
        print(f"[DEBUG] Gemini unavailable — using Mock LLM")
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

        import hashlib
        prompt_hash = hashlib.md5(prompt.encode()).hexdigest()
        print(f"[DEBUG] Invoking model='gemini-2.5-flash' with prompt_hash={prompt_hash}")
        
        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        # Log RAW response as requested
        print(f"[DEBUG] Raw Gemini Response Status: {response.status_code}")
        print(f"[DEBUG] Raw Gemini Response Body: {response.text}")

        if response.status_code != 200:
            raise Exception(f"HTTP {response.status_code}: {response.text}")

        try:
            response_json = response.json()
            text = response_json["candidates"][0]["content"]["parts"][0]["text"]
            print("[CONFIRMED] REAL GEMINI API RESPONSE USED")
            
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
        except Exception as e:
            raise Exception(f"Failed to parse Gemini response: {e}")

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
