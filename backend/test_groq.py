import httpx
import asyncio

async def test():
    headers = {"Authorization": "Bearer YOUR_API_KEY"}
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "ping"}]
    }
    async with httpx.AsyncClient() as client:
        r = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.text[:200]}")

asyncio.run(test())
