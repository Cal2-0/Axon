import httpx
import asyncio

XAI_API_KEY = "YOUR_API_KEY"

async def test():
    async with httpx.AsyncClient() as client:
        url = "https://api.x.ai/v1/models"
        headers = {"Authorization": f"Bearer {XAI_API_KEY}"}
        res = await client.get(url, headers=headers)
        print("Grok:", res.status_code, res.text)

asyncio.run(test())
