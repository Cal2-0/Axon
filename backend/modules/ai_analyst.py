import os
import httpx
import json

def _get_groq_key():
    """Read key at call time, not import time."""
    return os.environ.get("GROQ_API_KEY", "")

async def generate_summary(prompt: str) -> dict:
    """Sends a prompt to the Groq API and returns a structured JSON dictionary."""
    fallback = {
        "hypothesis": "AI parsing unavailable due to an error.",
        "mitre_tag": "N/A",
        "verdict": "Manual verification required."
    }
    
    key = _get_groq_key()
    if not key:
        print("[AI_ANALYST] WARNING: GROQ_API_KEY is EMPTY — check .env")
        return fallback
        
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system", 
                "content": "You are Axon AI, an elite cybersecurity forensic engine. You MUST strictly respond in valid JSON format with exactly these three keys: 'hypothesis', 'mitre_tag', and 'verdict'. Do NOT wrap your response in markdown code blocks."
            },
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"[AI_ANALYST] API Error {response.status_code}: {response.text}")
                return fallback
                
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return json.loads(content)
            
    except Exception as e:
        print(f"[AI_ANALYST] Error generating Groq summary: {e}")
        return fallback
