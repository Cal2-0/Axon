"""
Axon Backend — Bitcoin (UTXO) Scorer Module
Dedicated 5-Layer Behavioral Forensic Engine for Bitcoin.
"""
import time
import httpx
import asyncio
from sqlalchemy.orm import Session
from database.models import InvestigationLog, MaliciousWallet
import hashlib
import json as json_module

from modules.osint_scraper import run_osint_scan
from modules.ai_analyst import generate_dual_quick_ratings
from modules.wallet_scorer import _compute_l5_deterministic, _compute_dormancy_persistence

# ─── API FETCHERS ─────────────────────────────────────────────────────────────
async def fetch_btc_data(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch UTXOs and tx history from blockchain.info with basic retry/backoff."""
    url = f"https://blockchain.info/rawaddr/{address}"
    for attempt in range(3):
        try:
            res = await client.get(url, timeout=10.0)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 429:
                await asyncio.sleep(2.0 * (attempt + 1))
                continue
        except Exception as e:
            print(f"[BTC_SCORER] Request error: {e}")
            await asyncio.sleep(1.0)
    return {}

async def fetch_btc_price(client: httpx.AsyncClient) -> float:
    try:
        res = await client.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", timeout=3.0)
        return float(res.json().get("bitcoin", {}).get("usd", 60000.0))
    except:
        return 60000.0

# ─── CORE SCAN FUNCTION ───────────────────────────────────────────────────────
async def scan_btc_wallet(address: str, db: Session, depth: str = "quick", case_id: int = None) -> dict:
    print(f"\n{'='*60}\n[BTC_SCORER] Starting Bitcoin scan: {address}\n{'='*60}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        btc_data, btc_price, osint_data = await asyncio.gather(
            fetch_btc_data(client, address),
            fetch_btc_price(client),
            run_osint_scan(address, "Bitcoin"),
            return_exceptions=True
        )

    if isinstance(btc_data, Exception): btc_data = {}
    if isinstance(btc_price, Exception): btc_price = 60000.0
    if isinstance(osint_data, Exception):
        osint_data = {"summary": "OSINT scan failed", "githubMentions": [], "redditMentions": [], "aliases": [], "walletMentions": []}

    # Base Metrics
    balance_sat = btc_data.get("final_balance", 0)
    total_recv_sat = btc_data.get("total_received", 0)
    total_sent_sat = btc_data.get("total_sent", 0)
    txs = btc_data.get("txs", [])
    
    btc_balance = balance_sat / 10**8
    total_recv_btc = total_recv_sat / 10**8
    total_sent_btc = total_sent_sat / 10**8
    tx_count = btc_data.get("n_tx", len(txs))
    total_volume_btc = total_recv_btc + total_sent_btc

    # Default Graph Nodes
    graph_nodes = [{"id": address, "label": address[:8] + "...", "type": "target", "risk": 0}]
    graph_edges = []
    
    # ── UTXO Behavioral Parsing ──
    signals = []
    l1, l2, l3, l4, l5 = 0, 0, 0, 0, 0
    entity_class = "Normal UTXO Wallet"
    class_modifier = 1.0
    
    unique_counterparties = set()
    peel_chains_detected = 0
    coinjoins_detected = 0
    burst_activity = False

    timestamps = []
    formatted_txs = []
    for tx in txs:
        tx_hash = tx.get("hash", "")
        ts = tx.get("time", 0)
        if ts > 0: timestamps.append(ts)
        
        inputs = tx.get("inputs", [])
        outputs = tx.get("out", [])
        
        # Determine if address is sender or receiver in this tx
        is_sender = any(i.get("prev_out", {}).get("addr") == address for i in inputs)
        
        # CoinJoin Detection (Many inputs, many identical outputs)
        if len(inputs) >= 3 and len(outputs) >= 3:
            out_vals = [o.get("value", 0) for o in outputs]
            if len(set(out_vals)) < len(out_vals) - 1: # Some identical outputs
                coinjoins_detected += 1
                
        # Peel Chain Detection (1 large output, 1 small output, new address)
        if is_sender and len(outputs) == 2:
            v1, v2 = outputs[0].get("value", 0), outputs[1].get("value", 0)
            if v1 > 0 and v2 > 0 and (max(v1,v2) / min(v1,v2)) > 10:
                peel_chains_detected += 1
                
        # Graph Construction
        for i in inputs:
            addr = i.get("prev_out", {}).get("addr")
            if addr and addr != address:
                unique_counterparties.add(addr)
                graph_edges.append({"source": addr, "target": address, "value": i.get("prev_out", {}).get("value", 0) / 10**8, "hash": tx_hash})
                if len(graph_nodes) < 50:
                    graph_nodes.append({"id": addr, "label": addr[:8] + "...", "type": "default", "risk": 10})
        
        for o in outputs:
            addr = o.get("addr")
            if addr and addr != address:
                unique_counterparties.add(addr)
                graph_edges.append({"source": address, "target": addr, "value": o.get("value", 0) / 10**8, "hash": tx_hash})
                if len(graph_nodes) < 50:
                    graph_nodes.append({"id": addr, "label": addr[:8] + "...", "type": "default", "risk": 10})

        # Format transaction for UI
        tx_val_satoshis = sum(o.get("value", 0) for o in outputs)
        formatted_txs.append({
            "hash": tx_hash,
            "blockNumber": str(tx.get("block_height", "Pending")),
            "from": address if is_sender else "External",
            "to": "External" if is_sender else address,
            # Frontend parses value as wei (divides by 10^18). BTC is 10^8. Multiply by 10^10 to align.
            "value": str(tx_val_satoshis * 10**10),
            "gasUsed": "0",
            "gasPrice": "0"
        })

    # UTXO Behavioral Heuristics
    if coinjoins_detected > 0:
        l1 = 85
        signals.append(("MIXER: Detected CoinJoin patterns (multi-input, equal-output)", "🌀", "L1"))
        entity_class = "Privacy Mixer / CoinJoin"
        class_modifier = 1.4
    
    if peel_chains_detected > 3:
        l2 = 70
        signals.append((f"Peel Chain Topology: {peel_chains_detected} asymmetric change events", "🕸️", "L2"))
        if entity_class == "Normal UTXO Wallet": entity_class = "Distribution / Peel Chain"
        
    if timestamps:
        duration = max(timestamps) - min(timestamps)
        if duration < 86400 and tx_count > 10:
            l3 = 80
            burst_activity = True
            signals.append(("Burst Consolidation: High tx count within 24h", "⚡", "L3"))

    # Database attribution lookup
    wallet_db = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    if wallet_db:
        print(f"[BTC_SCORER] DB match: {wallet_db.label if wallet_db else 'None'}")
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
    ai_prompt = f"Analyze BTC wallet {address}. Tx count: {tx_count}. Coinjoins: {coinjoins_detected}. Peel chains: {peel_chains_detected}. Score: {final_score}. Entity Class: {entity_class}."
    dual_ratings = await generate_dual_quick_ratings(ai_prompt, entity_type="bitcoin_wallet")
    
    # Extract AI Verdict
    ai_verdict = dual_ratings.get("investigator_verdict", f"{label} RISK — Based on UTXO patterns.")

    response_data = {
        "shortName": "BTC Wallet",
        "tag": label,
        "identity": {
            "address": address,
            "ens": None,
            "label": "Bitcoin Address",
            "tag": label,
            "firstSeen": time.strftime("%Y-%m-%d", time.gmtime(min(timestamps))) if timestamps else "Unknown",
            "lastSeen": time.strftime("%Y-%m-%d", time.gmtime(max(timestamps))) if timestamps else "Unknown",
            "ethBalance": f"{btc_balance:.4f}",
            "totalReceived": f"{total_recv_btc:.4f} BTC",
            "totalSent": f"{total_sent_btc:.4f} BTC",
            "txCount": tx_count,
            "uniqueCounterparties": len(unique_counterparties),
            "totalVolumeUSD": f"~${total_volume_btc * btc_price:,.0f}",
            "ethPrice": btc_price,
            "entityClass": entity_class,
            "classModifier": class_modifier,
        },
        "risk": {
            "score": final_score,
            "baseScore": int(raw_score),
            "label": label,
            "mlClassification": "N/A for BTC",
            "anomalyScore": final_score,
            "layers": {"L1": l1, "L2": l2, "L3": l3, "L4": l4, "L5": l5},
            "entityClass": entity_class,
            "factors": [{"reason": s[0], "icon": s[1], "layer": s[2], "penalty": 0} for s in signals] if signals else [{"reason": "Standard UTXO behavior", "icon": "✅", "layer": "L1", "penalty": 0}],
            "aiAnalysis": {
                "hypothesis": dual_ratings.get("ai_hypothesis", f"UTXO Analysis reveals {entity_class}."),
                "mitre_tag": "T1565 Data Manipulation" if coinjoins_detected else "N/A",
                "verdict": ai_verdict,
                "engine_type": "bitcoin"
            }
        },
        "osint": osint_data,
        "exchange": {"detected": False, "findings": [], "summary": "No centralized exchange patterns confirmed"},
        "mixer": {"detected": coinjoins_detected > 0, "findings": [], "launderingIndicators": []},
        "graph": {"nodes": graph_nodes, "edges": graph_edges[:100], "tokens": [], "osint": {}, "defi_interactions": []},
        "holdings": {"erc20_count": 0, "forta_alerts": 0, "stablecoin_flows": {}},
        "transactions": formatted_txs,
        "evidence_context": "BTC Scan Context"
    }

    return response_data
