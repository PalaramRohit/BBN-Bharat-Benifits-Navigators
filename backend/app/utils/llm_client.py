import requests
from ..config import get_settings
from typing import Optional, List, Dict, Any

settings = get_settings()

class LLMClient:
    def __init__(self):
        self.llm_mode = (settings.LLM_MODE or "auto").strip().lower()
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = (settings.GROQ_MODEL or "llama-3.3-70b-versatile").strip()
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        if self.llm_mode == "offline":
            self.model = None
        elif self.groq_key:
            self.model = "groq"
        else:
            self.model = None

    async def generate_text(self, prompt: str) -> str:
        if self.llm_mode == "offline":
            return (
                "Offline mode response: local fallback is active. "
                "Rule-based processing can continue without internet."
            )
        if not self.model:
            return "LLM API Key not configured. Please provide a mock response."
        
        try:
            headers = {
                "Authorization": f"Bearer {self.groq_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            }
            response = requests.post(self.groq_url, headers=headers, json=payload, timeout=20)
            response.raise_for_status()
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
        except Exception as e:
            return f"Error generating text: {str(e)}"

    async def detect_intent(self, query: str) -> Dict[str, Any]:
        """
        Simplistic intent detection using Groq (Llama).
        """
        prompt = f"""
        Analyze the following user query for a welfare scheme platform:
        Query: "{query}"
        
        Extract the following in JSON format:
        - intent: (eligibility / explanation / claim / search / chat)
        - entities: (scheme name, occupation, income level, state if mentioned)
        - confidence: (0.0 to 1.0)
        
        Return ONLY valid JSON.
        """
        response_text = await self.generate_text(prompt)
        # In a real app, we'd parse the JSON properly.
        return {"raw_response": response_text}

llm_client = LLMClient()
