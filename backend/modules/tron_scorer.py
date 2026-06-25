import time
import httpx
import asyncio
import os
from sqlalchemy.orm import Session
from database.models import InvestigationLog, MaliciousWallet
from modules.osint_scraper import run_osint_scan
from modules.ai_analyst import generate_dual_quick_ratings
from modules.wallet_scorer import _compute_l5_deterministic, _compute_dormancy_persistence

def _get_trongrid_key():
    return os.environ.get("TRONGRID_API_KEY", "")

async def fetch_tron_balance(client: httpx.AsyncClient, address: str) -> float:
    key = _get_trongrid_key()
    headers = {"TRON-PRO-API-KEY": key} if key else {}
    url = f"https://api.trongrid.io/v1/accounts/{address}"
    for attempt in range(3):
        try:
            res = await client.get(url, headers=headers, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                if data.get("success") and len(data.get("data", [])) > 0:
                    return data["data"][0].get("balance", 0) / 10**6
            elif res.status_code == 429:
                await asyncio.sleep(2.0 * (attempt + 1))
        except Exception as e:
            print(f"[TRON_SCORER] Balance fetch error: {e}")
            await asyncio.sleep(1.0)
    return 0.0

async def fetch_tron_txs(client: httpx.AsyncClient, address: str) -> list:
    key = _get_trongrid_key()
    headers = {"TRON-PRO-API-KEY": key} if key else {}
    url = f"https://api.trongrid.io/v1/accounts/{address}/transactions?limit=100"
    for attempt in range(3):
        try:
            res = await client.get(url, headers=headers, timeout=15.0)
            if res.status_code == 200:
                return res.json().get("data", [])
            elif res.status_code == 429:
                await asyncio.sleep(2.0 * (attempt + 1))
        except Exception as e:
            print(f"[TRON_SCORER] TX fetch error: {e}")
            await asyncio.sleep(1.0)
    return []

async def fetch_tron_price(client: httpx.AsyncClient) -> float:
    try:
        res = await client.get("https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd", timeout=3.0)
        return float(res.json().get("tron", {}).get("usd", 0.12))
    except:
        return 0.12

async def scan_tron_wallet(address: str, db: Session, depth: str = "quick", case_id: int = None) -> dict:
    print(f"\n{'='*60}\n[TRON_SCORER] Starting Tron scan: {address}\n{'='*60}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        tron_balance, txs, tron_price, osint_data = await asyncio.gather(
            fetch_tron_balance(client, address),
            fetch_tron_txs(client, address),
            fetch_tron_price(client),
            run_osint_scan(address, "Tron"),
            return_exceptions=True
        )

    if isinstance(tron_balance, Exception): tron_balance = 0.0
    if isinstance(txs, Exception): txs = []
    if isinstance(tron_price, Exception): tron_price = 0.12
    if isinstance(osint_data, Exception):
        osint_data = {"summary": "OSINT scan failed", "githubMentions": [], "redditMentions": [], "aliases": [], "walletMentions": []}

    tx_count = len(txs)
    
    graph_nodes = [{"id": address, "label": address[:8] + "...", "type": "target", "risk": 0}]
    graph_edges = []
    unique_counterparties = set()
    
    signals = []
    l1, l2, l3, l4, l5 = 0, 0, 0, 0, 0
    entity_class = "Normal Tron User"
    class_modifier = 1.0
    
    timestamps = []
    formatted_txs = []
    
    for tx in txs:
        ts = tx.get("block_timestamp", 0)
        if ts: timestamps.append(ts / 1000.0)  # Tron provides ms
        
        tx_hash = tx.get("txID", "")
        raw_data = tx.get("raw_data", {})
        contracts = raw_data.get("contract", [])
        
        tx_from = address
        tx_to = "Unknown"
        tx_val = 0
        
        if contracts:
            contract = contracts[0]
            val_data = contract.get("parameter", {}).get("value", {})
            tx_from = val_data.get("owner_address", address)
            tx_to = val_data.get("to_address", "Contract")
            tx_val = val_data.get("amount", 0)
            
            # Tron addresses in API are often returned in hex (41...).
            # We just track them as-is for graph topology to avoid Base58 decoding overhead
            if tx_to != "Contract" and tx_to != tx_from:
                unique_counterparties.add(tx_to)
                
        # Format transaction for UI
        # Tron is 10^6 (sun). Frontend expects 10^18 format.
        # Multiply by 10^12 to align with 10^18.
        formatted_val = str(tx_val * 10**12)
        
        if len(graph_edges) < 50 and tx_to != "Contract":
            graph_edges.append({"source": tx_from, "target": tx_to, "value": tx_val / 10**6, "hash": tx_hash})
            if len(graph_nodes) < 50:
                graph_nodes.append({"id": tx_to, "label": tx_to[:8] + "...", "type": "default", "risk": 10})

        formatted_txs.append({
            "hash": tx_hash,
            "blockNumber": str(tx.get("blockNumber", "Pending")),
            "from": tx_from,
            "to": tx_to,
            "value": formatted_val,
            "gasUsed": str(tx.get("net_fee", 0)),
            "gasPrice": "1"
        })

    # Behavioral Heuristics
    if tx_count > 50:
        l1 = 60
        signals.append(("High transaction volume on Tron", "⚡", "L1"))
        
    # Database attribution lookup
    wallet_db = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    if wallet_db:
        print(f"[TRON_SCORER] DB match: {wallet_db.label if wallet_db else 'None'}")
        if wallet_db.threat_level == "CRITICAL":
            entity_class = "Confirmed Threat Actor"
            class_modifier = 1.5
        else:
            entity_class = "Suspect Wallet"
            class_modifier = 1.3
        
        l4 = min(100, wallet_db.risk_score)
        icon = "💥" if wallet_db.threat_level == "CRITICAL" else "⚠️"
        signals.append(("THREAT DB: {} — {}".format(wallet_db.label, wallet_db.category), icon, "L4"))
        if wallet_db.sanctioned:
            l4 = 100
            signals.append(("SANCTIONED ENTITY — legally designated threat actor", "🚫", "L4"))

    # Compute Layer 5 and dormancy adjustments
    l5 = _compute_l5_deterministic(l1, l2, l3, l4, entity_class, 0.0, 0.0)

    date_counts = {}
    for ts in timestamps:
        day = time.strftime("%Y-%m-%d", time.gmtime(ts))
        date_counts[day] = date_counts.get(day, 0) + 1

    persistence_floor, dormancy_modifier = _compute_dormancy_persistence(
        timestamps, l1, l2, l3, l4, date_counts, 0
    )

    raw_score = (l1*0.3) + (l2*0.25) + (l3*0.2) + (l4*0.15) + (l5*0.1)
    final_score = int(raw_score * class_modifier * dormancy_modifier)
    final_score = max(final_score, persistence_floor)
    final_score = min(max(final_score, 0), 100)

    label = "CRITICAL" if final_score >= 80 else "HIGH" if final_score >= 60 else "MEDIUM" if final_score >= 40 else "LOW"

    # AI Analysis
    ai_prompt = f"Analyze TRX wallet {address}. Tx count: {tx_count}. Score: {final_score}. Entity Class: {entity_class}. Counterparties: {len(unique_counterparties)}."
    dual_ratings = await generate_dual_quick_ratings(ai_prompt, entity_type="tron_wallet")
    ai_verdict = dual_ratings.get("investigator_verdict", f"{label} RISK — Based on Tron patterns.")

    response_data = {
        "shortName": "TRX Wallet",
        "tag": label,
        "identity": {
            "address": address,
            "ens": None,
            "label": "Tron Address",
            "tag": label,
            "firstSeen": time.strftime("%Y-%m-%d", time.gmtime(min(timestamps))) if timestamps else "Unknown",
            "lastSeen": time.strftime("%Y-%m-%d", time.gmtime(max(timestamps))) if timestamps else "Unknown",
            "ethBalance": f"{tron_balance:.4f}",
            "totalReceived": "Unknown",
            "totalSent": "Unknown",
            "txCount": tx_count,
            "uniqueCounterparties": len(unique_counterparties),
            "totalVolumeUSD": f"~${tron_balance * tron_price:,.0f}",
            "ethPrice": tron_price,
            "entityClass": entity_class,
            "classModifier": class_modifier,
        },
        "risk": {
            "score": final_score,
            "baseScore": int(raw_score),
            "label": label,
            "mlClassification": "N/A for TRX",
            "anomalyScore": final_score,
            "layers": {"L1": l1, "L2": l2, "L3": l3, "L4": l4, "L5": l5},
            "entityClass": entity_class,
            "factors": [{"reason": s[0], "icon": s[1], "layer": s[2], "penalty": 0} for s in signals] if signals else [{"reason": "Standard Tron behavior", "icon": "✅", "layer": "L1", "penalty": 0}],
            "aiAnalysis": {
                "hypothesis": dual_ratings.get("ai_hypothesis", f"Tron analysis reveals {entity_class}."),
                "mitre_tag": "T1565 Data Manipulation" if tx_count > 80 else "N/A",
                "verdict": ai_verdict,
                "engine_type": "tron"
            }
        },
        "osint": osint_data,
        "exchange": {"detected": False, "findings": [], "summary": "No centralized exchange patterns confirmed"},
        "mixer": {"detected": False, "findings": [], "launderingIndicators": []},
        "graph": {"nodes": graph_nodes, "edges": graph_edges[:100], "tokens": [], "osint": {}, "defi_interactions": []},
        "holdings": {"erc20_count": 0, "forta_alerts": 0, "stablecoin_flows": {}},
        "transactions": formatted_txs,
        "evidence_context": "TRON Scan Context"
    }

    return response_data
