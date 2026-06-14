import os
import asyncio
import httpx


def _get_etherscan_key():
    return os.environ.get("ETHERSCAN_API_KEY", "")

def _get_alchemy_key():
    return os.environ.get("ALCHEMY_API_KEY", "")

def _get_groq_key():
    return os.environ.get("GROQ_API_KEY", "")


async def check_etherscan(client: httpx.AsyncClient) -> bool:
    key = _get_etherscan_key()
    if not key:
        return False
    url = f"https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x0000000000000000000000000000000000000000&tag=latest&apikey={key}"
    try:
        res = await client.get(url)
        data = res.json()
        return data.get("status") == "1"
    except:
        return False

async def check_alchemy(client: httpx.AsyncClient) -> bool:
    key = _get_alchemy_key()
    if not key:
        return False
    url = f"https://eth-mainnet.g.alchemy.com/v2/{key}"
    payload = {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}
    try:
        res = await client.post(url, json=payload)
        data = res.json()
        return "result" in data
    except:
        return False

async def check_goplus(client: httpx.AsyncClient) -> bool:
    url = "https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=0xdAC17F958D2ee523a2206206994597C13D831ec7"
    try:
        res = await client.get(url)
        data = res.json()
        return data.get("code") == 1
    except:
        return False

async def check_defillama(client: httpx.AsyncClient) -> bool:
    url = "https://coins.llama.fi/prices/current/ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7"
    try:
        res = await client.get(url)
        data = res.json()
        return "coins" in data
    except:
        return False

async def check_groq(client: httpx.AsyncClient) -> bool:
    key = _get_groq_key()
    if not key:
        return False
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 1
    }
    try:
        res = await client.post(url, headers=headers, json=payload)
        return res.status_code == 200
    except:
        return False

async def get_all_health() -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        results = await asyncio.gather(
            check_etherscan(client),
            check_alchemy(client),
            check_goplus(client),
            check_defillama(client),
            check_groq(client),
            return_exceptions=True
        )
        
        return {
            "Etherscan": results[0] if isinstance(results[0], bool) else False,
            "Alchemy": results[1] if isinstance(results[1], bool) else False,
            "GoPlus": results[2] if isinstance(results[2], bool) else False,
            "DefiLlama": results[3] if isinstance(results[3], bool) else False,
            "Groq": results[4] if isinstance(results[4], bool) else False
        }
