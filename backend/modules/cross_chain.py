"""
Axon Backend — Cross-Chain Holdings Service
Fetches native balances across EVM chains using Etherscan v2 API.
"""
import asyncio
import httpx
from modules.wallet_scorer import _get_etherscan_key

CHAINS = {
    "Ethereum": {"id": 1,     "cg_id": "ethereum",     "symbol": "ETH"},
    "BSC":      {"id": 56,    "cg_id": "binancecoin",  "symbol": "BNB"},
    "Polygon":  {"id": 137,   "cg_id": "matic-network","symbol": "MATIC"},
    "Optimism": {"id": 10,    "cg_id": "ethereum",     "symbol": "ETH"},
    "Arbitrum": {"id": 42161, "cg_id": "ethereum",     "symbol": "ETH"},
    "Base":     {"id": 8453,  "cg_id": "ethereum",     "symbol": "ETH"},
    "Avalanche":{"id": 43114, "cg_id": "avalanche-2",  "symbol": "AVAX"},
}

# All unique CoinGecko IDs we ever need — fetch prices for all regardless of balance
ALL_CG_IDS = set(c["cg_id"] for c in CHAINS.values())
ALL_CG_IDS.add("bitcoin")
ALL_CG_IDS.add("solana")

def detect_address_type(address: str) -> dict:
    addr = address.strip()
    if addr.startswith("0x") and len(addr) == 42:
        return {"chain": "EVM", "type": "EVM", "coin": "Ethereum / EVM Compatible", "explorer": f"https://etherscan.io/address/{addr}"}
    if addr.startswith("T") and len(addr) == 34:
        return {"chain": "Tron", "type": "TRON", "coin": "Tron (TRX)", "explorer": f"https://tronscan.org/#/address/{addr}"}
    # Solana is base58, length usually 43-44
    if len(addr) >= 40 and not addr.startswith("0x") and not addr.startswith("bc1"):
        return {"chain": "Solana", "type": "SOLANA", "coin": "Solana (SOL)", "explorer": f"https://solscan.io/account/{addr}"}
    if addr.startswith("1") or addr.startswith("3") or addr.startswith("bc1"):
        return {"chain": "Bitcoin", "type": "BTC", "coin": "Bitcoin (BTC)", "explorer": f"https://www.blockchain.com/explorer/addresses/btc/{addr}"}
    return {"chain": "Data Not Available", "type": "UNKNOWN", "coin": "Unknown", "explorer": "N/A"}

async def fetch_btc_balance(client: httpx.AsyncClient, address: str) -> dict:
    try:
        res = await client.get(f"https://blockchain.info/rawaddr/{address}", timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            balance_btc = data.get("final_balance", 0) / 10**8
            return {"chain": "Bitcoin", "balance": balance_btc, "cg_id": "bitcoin", "symbol": "BTC", "error": None}
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching BTC balance: {e}")
    return {"chain": "Bitcoin", "balance": 0.0, "cg_id": "bitcoin", "symbol": "BTC", "error": "Fetch failed"}

async def fetch_solana_balance(client: httpx.AsyncClient, address: str) -> dict:
    try:
        payload = {
            "jsonrpc": "2.0", "id": 1,
            "method": "getBalance",
            "params": [address]
        }
        res = await client.post("https://api.mainnet-beta.solana.com", json=payload, timeout=10.0)
        if res.status_code == 200:
            data = res.json()
            if "result" in data and "value" in data["result"]:
                balance_sol = data["result"]["value"] / 10**9
                return {"chain": "Solana", "balance": balance_sol, "cg_id": "solana", "symbol": "SOL", "error": None}
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching SOL balance: {e}")
    return {"chain": "Solana", "balance": 0.0, "cg_id": "solana", "symbol": "SOL", "error": "Fetch failed"}

async def fetch_chain_balance(client: httpx.AsyncClient, address: str, chain_name: str, chain_info: dict, key: str) -> dict:
    url = (
        f"https://api.etherscan.io/v2/api"
        f"?chainid={chain_info['id']}"
        f"&module=account&action=balance"
        f"&address={address}&tag=latest&apikey={key}"
    )
    try:
        res = await client.get(url, timeout=10.0)
        data = res.json()
        if data.get("status") == "1":
            balance = int(data["result"]) / 10**18
            return {
                "chain": chain_name,
                "balance": balance,
                "cg_id": chain_info["cg_id"],
                "symbol": chain_info["symbol"],
                "error": None,
            }
        else:
            print(f"[CROSS_CHAIN] {chain_name}: status={data.get('status')}, msg={data.get('message')}, result={str(data.get('result',''))[:80]}")
            return {
                "chain": chain_name,
                "balance": 0.0,
                "cg_id": chain_info["cg_id"],
                "symbol": chain_info["symbol"],
                "error": None,
            }
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching {chain_name} balance: {e}")
    return {
        "chain": chain_name,
        "balance": 0.0,
        "cg_id": chain_info["cg_id"],
        "symbol": chain_info["symbol"],
        "error": None,
    }

async def fetch_prices(client: httpx.AsyncClient, cg_ids: set) -> dict:
    """Fetch USD + INR prices for ALL requested CoinGecko IDs."""
    ids_str = ",".join(cg_ids)
    url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids_str}&vs_currencies=usd,inr"
    try:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; Axon/2.0)"}
        res = await client.get(url, headers=headers, timeout=8.0)
        res.raise_for_status()
        data = res.json()
        print(f"[CROSS_CHAIN] Prices fetched for: {list(data.keys())}")
        return data
    except Exception as e:
        print(f"[CROSS_CHAIN] Failed fetching prices: {e}. Using fallback prices for demo.")
        return {
            "ethereum": {"usd": 1683.31, "inr": 140000.0},
            "binancecoin": {"usd": 575.39, "inr": 48000.0},
            "matic-network": {"usd": 0.62, "inr": 52.0},
            "avalanche-2": {"usd": 6.27, "inr": 520.0},
            "bitcoin": {"usd": 60000.0, "inr": 5000000.0},
            "solana": {"usd": 150.0, "inr": 12500.0}
        }

async def get_cross_chain_holdings(address: str) -> dict:
    addr_info = detect_address_type(address)
    addr_type = addr_info["type"]

    async with httpx.AsyncClient(timeout=20.0) as client:
        balance_tasks = []
        non_evm_note = None
        
        if addr_type == "EVM":
            key = _get_etherscan_key()
            if not key:
                return {"error": "Missing Etherscan API key", "holdings": [], "total_net_worth_usd": 0, "total_net_worth_inr": 0}
            
            # Fetch sequentially to avoid 5 req/s Etherscan rate limit
            balance_results = []
            for name, info in CHAINS.items():
                res = await fetch_chain_balance(client, address, name, info, key)
                balance_results.append(res)
                await asyncio.sleep(0.2) # Rate limit protection
                
            balance_tasks = [] # Already fetched sequentially
            non_evm_note = "To scan Bitcoin or Solana holdings, enter the suspect's native BTC or SOL address directly into the search bar."

        elif addr_type == "BTC":
            balance_tasks = [fetch_btc_balance(client, address)]
        elif addr_type == "SOLANA":
            balance_tasks = [fetch_solana_balance(client, address)]
        elif addr_type == "TRON":
            balance_tasks = [] # Tron balances not implemented yet
        else:
            return {"error": "Unknown address format", "holdings": [], "total_net_worth_usd": 0, "total_net_worth_inr": 0}
            
        # Always fetch prices for ALL chains (not just non-zero) to avoid missing data
        price_task = fetch_prices(client, ALL_CG_IDS)
        
        results = await asyncio.gather(*balance_tasks, price_task, return_exceptions=True)
        
        balances = results[:-1]
        if addr_type == "EVM":
            balances = balance_results + list(balances)
            
        prices = results[-1] if not isinstance(results[-1], Exception) else {}

    holdings = []
    total_net_worth_usd = 0.0
    total_net_worth_inr = 0.0
    
    for b in balances:
        if isinstance(b, Exception):
            continue
        
        cg_id = b["cg_id"]
        price_data = prices.get(cg_id, {})
        price_usd = price_data.get("usd", 0.0) if price_data else 0.0
        price_inr = price_data.get("inr", 0.0) if price_data else 0.0
        
        usd_value = b["balance"] * price_usd
        inr_value = b["balance"] * price_inr
        
        total_net_worth_usd += usd_value
        total_net_worth_inr += inr_value
        
        holdings.append({
            "chain":     b["chain"],
            "balance":   round(b["balance"], 4),
            "symbol":    b["symbol"],
            "cg_id":     cg_id,
            "usd_value": round(usd_value, 2),
            "inr_value": round(inr_value, 2),
            "price_usd": round(price_usd, 2),
            "error":     b.get("error"),
        })

    return {
        "address":              address,
        "holdings":             holdings,
        "total_net_worth_usd":  round(total_net_worth_usd, 2),
        "total_net_worth_inr":  round(total_net_worth_inr, 2),
        "non_evm_note":         non_evm_note,
    }
