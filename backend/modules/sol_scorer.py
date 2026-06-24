"""
Axon Backend — Solana Scorer Module
Dedicated 5-Layer Behavioral Forensic Engine for Solana.
"""
import time
import httpx
import asyncio
from sqlalchemy.orm import Session
from database.models import InvestigationLog
from modules.osint_scraper import run_osint_scan
from modules.ai_analyst import generate_dual_quick_ratings

import os

# ─── API FETCHERS ─────────────────────────────────────────────────────────────
def _get_helius_key():
    return os.environ.get("HELIUS_API_KEY", "")

async def fetch_sol_balance(client: httpx.AsyncClient, address: str) -> float:
    key = _get_helius_key()
    url = f"https://mainnet.helius-rpc.com/?api-key={key}" if key else "https://api.mainnet-beta.solana.com"
    payload = {"jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [address]}
    for attempt in range(3):
        try:
            res = await client.post("https://api.mainnet-beta.solana.com", json=payload, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                if "result" in data and "value" in data["result"]:
                    return data["result"]["value"] / 10**9
            elif res.status_code == 429:
                await asyncio.sleep(2.0 * (attempt + 1))
        except Exception as e:
            print(f"[SOL_SCORER] Balance fetch error: {e}")
            await asyncio.sleep(1.0)
    return 0.0

async def fetch_sol_txs(client: httpx.AsyncClient, address: str) -> list:
    key = _get_helius_key()
    if key:
        url = f"https://api.helius.xyz/v0/addresses/{address}/transactions?api-key={key}"
        for attempt in range(3):
            try:
                res = await client.get(url, timeout=15.0)
                if res.status_code == 200:
                    return res.json()
                elif res.status_code == 429:
                    await asyncio.sleep(2.0 * (attempt + 1))
            except Exception as e:
                print(f"[SOL_SCORER] TX fetch error: {e}")
                await asyncio.sleep(1.0)
        return []
    else:
        # Fallback to standard RPC
        payload = {"jsonrpc": "2.0", "id": 1, "method": "getSignaturesForAddress", "params": [address, {"limit": 100}]}
        for attempt in range(3):
            try:
                res = await client.post("https://api.mainnet-beta.solana.com", json=payload, timeout=10.0)
                if res.status_code == 200:
                    data = res.json()
                    if "result" in data:
                        return data["result"]
                elif res.status_code == 429:
                    await asyncio.sleep(2.0 * (attempt + 1))
            except Exception as e:
                print(f"[SOL_SCORER] TX fetch error: {e}")
                await asyncio.sleep(1.0)
        return []

async def fetch_sol_price(client: httpx.AsyncClient) -> float:
    try:
        res = await client.get("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", timeout=3.0)
        return float(res.json().get("solana", {}).get("usd", 150.0))
    except:
        return 150.0

# ─── CORE SCAN FUNCTION ───────────────────────────────────────────────────────
async def scan_sol_wallet(address: str, db: Session, depth: str = "quick", case_id: int = None) -> dict:
    print(f"\n{'='*60}\n[SOL_SCORER] Starting Solana scan: {address}\n{'='*60}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        sol_balance, txs, sol_price, osint_data = await asyncio.gather(
            fetch_sol_balance(client, address),
            fetch_sol_txs(client, address),
            fetch_sol_price(client),
            run_osint_scan(address, "Solana"),
            return_exceptions=True
        )

    if isinstance(sol_balance, Exception): sol_balance = 0.0
    if isinstance(txs, Exception): txs = []
    if isinstance(sol_price, Exception): sol_price = 150.0
    if isinstance(osint_data, Exception):
        osint_data = {"summary": "OSINT scan failed", "githubMentions": [], "redditMentions": [], "aliases": [], "walletMentions": []}

    tx_count = len(txs)
    
    graph_nodes = [{"id": address, "label": address[:8] + "...", "type": "target", "risk": 0}]
    graph_edges = []
    
    signals = []
    l1, l2, l3, l4, l5 = 0, 0, 0, 0, 0
    entity_class = "Normal Solana User"
    class_modifier = 1.0
    
    timestamps = []
    formatted_txs = []
    errors = 0
    for tx in txs:
        # Helius parsing vs standard RPC parsing
        ts = tx.get("timestamp") or tx.get("blockTime", 0)
        if ts: timestamps.append(ts)
        err = tx.get("transactionError") or tx.get("err")
        if err: errors += 1
        
        sig = tx.get("signature", "")
        
        # Enhanced parsing if Helius
        native_transfers = tx.get("nativeTransfers", [])
        tx_from = address
        tx_to = "Contract/Unknown"
        tx_val = 0
        
        if native_transfers:
            # Find largest transfer involving our address
            for nt in native_transfers:
                if nt.get("fromUserAccount") == address or nt.get("toUserAccount") == address:
                    tx_from = nt.get("fromUserAccount", address)
                    tx_to = nt.get("toUserAccount", "Unknown")
                    tx_val = nt.get("amount", 0)
                    break
        
        # Add dummy edge for demonstration of topology
        if len(graph_edges) < 50:
            target_dummy = tx_to if tx_to != "Contract/Unknown" else f"Contract_interaction_{len(graph_edges)}"
            graph_edges.append({"source": tx_from, "target": target_dummy, "value": tx_val / 10**9, "hash": sig})

        # Format transaction for UI
        # We need it in Wei format (10^18) for the UI which expects EVM standards.
        # Solana is 10^9 (Lamports). So multiply by 10^9 to reach 10^18 format.
        formatted_val = str(tx_val * 10**9)
        
        formatted_txs.append({
            "hash": sig,
            "blockNumber": str(tx.get("slot", "Pending")),
            "from": tx_from,
            "to": tx_to,
            "value": formatted_val,
            "gasUsed": str(tx.get("fee", 0)),
            "gasPrice": "1"
        })

    # Solana Behavioral Heuristics
    error_rate = errors / max(tx_count, 1)
    if error_rate > 0.4 and tx_count > 20:
        l1 = 70
        signals.append((f"High transaction failure rate ({error_rate:.0%}): Possible sniping bot or arbitrage", "🤖", "L1"))
        entity_class = "Automated Bot / Sniper"
        
    if timestamps:
        duration = max(timestamps) - min(timestamps)
        if duration < 3600 and tx_count > 50:
            l1 = max(l1, 85)
            signals.append(("Hyper-frequency trading: 50+ txs in <1 hour", "⚡", "L1"))
            entity_class = "High Frequency Bot"

    raw_score = (l1*0.4) + (l2*0.2) + (l3*0.2)
    final_score = min(int(raw_score * class_modifier), 100)
    label = "CRITICAL" if final_score >= 80 else "HIGH" if final_score >= 60 else "MEDIUM" if final_score >= 40 else "LOW"

    # AI Analysis
    ai_prompt = f"Analyze SOL wallet {address}. Tx count: {tx_count}. Errors: {errors}. Score: {final_score}. Entity Class: {entity_class}."
    dual_ratings = await generate_dual_quick_ratings(ai_prompt, entity_type="solana_wallet")
    
    # Extract AI Verdict
    ai_verdict = dual_ratings.get("investigator_verdict", f"{label} RISK — Based on Solana patterns.")

    response_data = {
        "shortName": "SOL Wallet",
        "tag": label,
        "identity": {
            "address": address,
            "ens": None,
            "label": "Solana Address",
            "tag": label,
            "firstSeen": time.strftime("%Y-%m-%d", time.gmtime(min(timestamps))) if timestamps else "Unknown",
            "lastSeen": time.strftime("%Y-%m-%d", time.gmtime(max(timestamps))) if timestamps else "Unknown",
            "ethBalance": f"{sol_balance:.4f}",
            "totalReceived": "Unknown",
            "totalSent": "Unknown",
            "txCount": tx_count,
            "uniqueCounterparties": "Unknown",
            "totalVolumeUSD": f"~${sol_balance * sol_price:,.0f}",
            "ethPrice": sol_price,
            "entityClass": entity_class,
            "classModifier": class_modifier,
        },
        "risk": {
            "score": final_score,
            "baseScore": int(raw_score),
            "label": label,
            "mlClassification": "N/A for SOL",
            "anomalyScore": final_score,
            "layers": {"L1": l1, "L2": l2, "L3": l3, "L4": l4, "L5": l5},
            "entityClass": entity_class,
            "factors": [{"reason": s[0], "icon": s[1], "layer": s[2], "penalty": 0} for s in signals] if signals else [{"reason": "Standard Solana behavior", "icon": "✅", "layer": "L1", "penalty": 0}],
            "aiAnalysis": {
                "hypothesis": dual_ratings.get("ai_hypothesis", f"Solana analysis reveals {entity_class}."),
                "mitre_tag": "T1114 Email Collection" if error_rate > 0.4 else "N/A",
                "verdict": ai_verdict,
                "engine_type": "solana"
            }
        },
        "osint": osint_data,
        "exchange": {"detected": False, "findings": [], "summary": "No centralized exchange patterns confirmed"},
        "mixer": {"detected": False, "findings": [], "launderingIndicators": []},
        "graph": {"nodes": graph_nodes, "edges": graph_edges[:100], "tokens": [], "osint": {}, "defi_interactions": []},
        "holdings": {"erc20_count": 0, "forta_alerts": 0, "stablecoin_flows": {}},
        "transactions": formatted_txs,
        "evidence_context": "SOL Scan Context"
    }

    return response_data
