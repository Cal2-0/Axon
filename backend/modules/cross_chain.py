"""
Axon Backend — Cross-Chain Holdings Service
Fetches native balances across EVM chains using Etherscan v2 API.
"""
import asyncio
import httpx
from modules.wallet_scorer import _get_etherscan_key

CHAINS = {
    "Ethereum": {"id": 1, "cg_id": "ethereum", "symbol": "ETH"},
    "BSC": {"id": 56, "cg_id": "binancecoin", "symbol": "BNB"},
    "Polygon": {"id": 137, "cg_id": "matic-network", "symbol": "MATIC"},
    "Optimism": {"id": 10, "cg_id": "ethereum", "symbol": "ETH"},
    "Arbitrum": {"id": 42161, "cg_id": "ethereum", "symbol": "ETH"},
    "Base": {"id": 8453, "cg_id": "ethereum", "symbol": "ETH"},
    "Avalanche": {"id": 43114, "cg_id": "avalanche-2", "symbol": "AVAX"}
}

async def fetch_chain_balance(client: httpx.AsyncClient, address: str, chain_name: str, chain_info: dict, key: str) -> dict:
    url = f"https://api.etherscan.io/v2/api?chainid={chain_info['id']}&module=account&action=balance&address={address}&tag=latest&apikey={key}"
    try:
        res = await client.get(url)
        data = res.json()
        if data.get("status") == "1":
            balance = int(data["result"]) / 10**18
            return {"chain": chain_name, "balance": balance, "cg_id": chain_info["cg_id"], "symbol": chain_info["symbol"]}
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching {chain_name} balance: {e}")
    return {"chain": chain_name, "balance": 0.0, "cg_id": chain_info["cg_id"], "symbol": chain_info["symbol"]}

async def fetch_prices(client: httpx.AsyncClient, cg_ids: set) -> dict:
    ids_str = ",".join(cg_ids)
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd,inr"
    try:
        # Add a common User-Agent to help bypass simple blocks
        headers = {"User-Agent": "Mozilla/5.0"}
        res = await client.get(url, headers=headers, timeout=5.0)
        return res.json()
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching prices: {e}")
    return {}

async def get_cross_chain_holdings(address: str) -> dict:
    key = _get_etherscan_key()
    if not key:
        return {"error": "Missing Etherscan API key"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        tasks = [
            fetch_chain_balance(client, address, name, info, key)
            for name, info in CHAINS.items()
        ]
        
        balances = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Unique coin gecko ids
        cg_ids = {b["cg_id"] for b in balances if not isinstance(b, Exception) and b["balance"] > 0}
        prices = {}
        if cg_ids:
            prices = await fetch_prices(client, cg_ids)
            
    holdings = []
    total_net_worth_usd = 0.0
    total_net_worth_inr = 0.0
    
    for b in balances:
        if isinstance(b, Exception):
            continue
        
        price_usd = prices.get(b["cg_id"], {}).get("usd", 0.0)
        price_inr = prices.get(b["cg_id"], {}).get("inr", 0.0)
        
        usd_value = b["balance"] * price_usd
        inr_value = b["balance"] * price_inr
        
        total_net_worth_usd += usd_value
        total_net_worth_inr += inr_value
        
        holdings.append({
            "chain": b["chain"],
            "balance": round(b["balance"], 4),
            "symbol": b["symbol"],
            "cg_id": b["cg_id"],
            "usd_value": round(usd_value, 2),
            "inr_value": round(inr_value, 2)
        })
        
    return {
        "address": address,
        "holdings": holdings,
        "total_net_worth_usd": round(total_net_worth_usd, 2),
        "total_net_worth_inr": round(total_net_worth_inr, 2)
    }
