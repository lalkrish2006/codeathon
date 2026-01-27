from src.models import PackageInput
import logging

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
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None

    def enrich_context(self, package: PackageInput) -> str:
        """
        Uses LLM to interpret ambiguous descriptions.
        If no API key or LLM unavailable, returns standard description.
        This ensures the system works without external dependencies.
        """
        if not self.model:
            return f"[LLM Disabled] Raw description used: {package.description}"

        try:
            prompt = f"""
            Analyze the following package description for delivery urgency context.
            Output ONLY a brief 1-sentence summary of the item and its potential context (Medical/Legal/Personal).
            Do not make up facts.
            
            Description: {package.description}
            Sender: {package.sender}
            """
            response = self.model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            self.logger.error(f"LLM Error: {e}")
            return f"[LLM Error] Fallback to: {package.description}"
