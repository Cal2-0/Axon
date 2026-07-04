"""
Axon Backend — Solana Scorer Module
Dedicated 5-Layer Behavioral Forensic Engine for Solana with ATA Resolution.
"""
import time
import httpx
import asyncio
import os
import math
from sqlalchemy.orm import Session
from database.models import InvestigationLog, MaliciousWallet
from modules.osint_scraper import run_osint_scan
from modules.ai_analyst import analyze_entity
from modules.wallet_scorer import _compute_l5_deterministic, _compute_dormancy_persistence

def _get_helius_key():
    return os.environ.get("HELIUS_API_KEY", "")

USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
SYSTEM_PROGRAM = "11111111111111111111111111111111"

async def check_account_info(client: httpx.AsyncClient, address: str) -> dict:
    key = _get_helius_key()
    url = f"https://mainnet.helius-rpc.com/?api-key={key}" if key else "https://api.mainnet-beta.solana.com"
    payload = {"jsonrpc": "2.0", "id": 1, "method": "getAccountInfo", "params": [address, {"encoding": "jsonParsed"}]}
    try:
        res = await client.post(url, json=payload, timeout=10.0)
        if res.status_code == 200:
            return res.json().get("result", {}).get("value", {})
    except Exception as e:
        pass
    return None

async def fetch_sol_balance(client: httpx.AsyncClient, address: str) -> float:
    key = _get_helius_key()
    url = f"https://mainnet.helius-rpc.com/?api-key={key}" if key else "https://api.mainnet-beta.solana.com"
    payload = {"jsonrpc": "2.0", "id": 1, "method": "getBalance", "params": [address]}
    for attempt in range(3):
        try:
            res = await client.post(url, json=payload, timeout=10.0)
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

async def fetch_ata_balance(client: httpx.AsyncClient, address: str, mint: str) -> float:
    key = _get_helius_key()
    url = f"https://mainnet.helius-rpc.com/?api-key={key}" if key else "https://api.mainnet-beta.solana.com"
    payload = {
        "jsonrpc": "2.0", "id": 1, 
        "method": "getTokenAccountsByOwner", 
        "params": [address, {"mint": mint}, {"encoding": "jsonParsed"}]
    }
    for attempt in range(3):
        try:
            res = await client.post(url, json=payload, timeout=10.0)
            if res.status_code == 200:
                data = res.json()
                total = 0.0
                accounts = data.get("result", {}).get("value", [])
                for acc in accounts:
                    info = acc.get("account", {}).get("data", {}).get("parsed", {}).get("info", {})
                    amt = info.get("tokenAmount", {}).get("uiAmount", 0.0)
                    if amt: total += float(amt)
                return total
            elif res.status_code == 429:
                await asyncio.sleep(2.0 * (attempt + 1))
        except Exception as e:
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
        sol_balance, usdc_balance, usdt_balance, txs, sol_price, acc_info, osint_data = await asyncio.gather(
            fetch_sol_balance(client, address),
            fetch_ata_balance(client, address, USDC_MINT),
            fetch_ata_balance(client, address, USDT_MINT),
            fetch_sol_txs(client, address),
            fetch_sol_price(client),
            check_account_info(client, address),
            run_osint_scan(address, "Solana"),
            return_exceptions=True
        )

    if isinstance(sol_balance, Exception): sol_balance = 0.0
    if isinstance(usdc_balance, Exception): usdc_balance = 0.0
    if isinstance(usdt_balance, Exception): usdt_balance = 0.0
    if isinstance(txs, Exception): txs = []
    if isinstance(sol_price, Exception): sol_price = 150.0
    if isinstance(acc_info, Exception): acc_info = None
    if isinstance(osint_data, Exception):
        osint_data = {"summary": "OSINT scan failed", "githubMentions": [], "redditMentions": [], "aliases": [], "walletMentions": []}

    is_pda = False
    if acc_info:
        owner = acc_info.get("owner", SYSTEM_PROGRAM)
        executable = acc_info.get("executable", False)
        if owner != SYSTEM_PROGRAM or executable:
            is_pda = True

    tx_count = len(txs)
    
    graph_nodes = [{"id": address, "label": address[:8] + "...", "type": "target", "risk": 0}]
    graph_edges = []
    
    signals = []
    l1, l2, l3, l4, l5 = 0, 0, 0, 0, 0
    entity_class = "Solana PDA / Smart Contract" if is_pda else "Normal Solana User"
    class_modifier = 0.5 if is_pda else 1.0
    
    timestamps = []
    formatted_txs = []
    errors = 0
    priority_fees_paid = 0
    
    for tx in txs:
        ts = tx.get("timestamp") or tx.get("blockTime", 0)
        if ts: timestamps.append(ts)
        err = tx.get("transactionError") or tx.get("err")
        if err: errors += 1
        
        sig = tx.get("signature", "")
        fee = tx.get("fee", 0)
        if fee > 5000: # Standard is 5000 lamports. Anything above is priority fee.
            priority_fees_paid += 1
        
        native_transfers = tx.get("nativeTransfers", [])
        tx_from = address
        tx_to = "Contract/Unknown"
        tx_val = 0
        
        if native_transfers:
            for nt in native_transfers:
                if nt.get("fromUserAccount") == address or nt.get("toUserAccount") == address:
                    tx_from = nt.get("fromUserAccount", address)
                    tx_to = nt.get("toUserAccount", "Data Not Available")
                    tx_val = nt.get("amount", 0)
                    break
        
        if len(graph_edges) < 50:
            target_dummy = tx_to if tx_to != "Contract/Unknown" else f"Contract_interaction_{len(graph_edges)}"
            graph_edges.append({"source": tx_from, "target": target_dummy, "value": tx_val / 10**9, "hash": sig})

        formatted_val = str(tx_val * 10**9)
        
        formatted_txs.append({
            "hash": sig,
            "blockNumber": str(tx.get("slot", "Pending")),
            "from": tx_from,
            "to": tx_to,
            "value": formatted_val,
            "gasUsed": str(fee),
            "gasPrice": "1"
        })

    error_rate = errors / max(tx_count, 1)
    priority_fee_ratio = priority_fees_paid / max(tx_count, 1)

    if not is_pda:
        # Solana Behavioral Heuristics (Wallet)
        if error_rate > 0.4 and tx_count > 20:
            l1 += 8
            signals.append((f"High transaction failure rate ({error_rate:.0%}): Possible sniping bot", "🤖", "L1"))
            entity_class = "Automated Bot / Sniper"
            
        if priority_fee_ratio > 0.5:
            l1 += 7
            signals.append((f"Priority Fee Anomaly: Consistently overpays network fee ({priority_fee_ratio:.0%})", "🏎️", "L1"))
            
        if timestamps:
            timestamps.sort()
            duration = timestamps[-1] - timestamps[0]
            
            # Frequency anomaly
            if duration > 0 and (tx_count / (duration / 86400)) > 100:
                l1 += 9
                signals.append(("Tx Frequency Anomaly: >100 tx/day relative to age", "📈", "L1"))
                
            if duration < 3600 and tx_count > 50:
                l1 = max(l1, 15)
                signals.append(("Hyper-frequency trading: 50+ txs in <1 hour", "⚡", "L1"))
                entity_class = "High Frequency Bot"

        l1 = min(l1 * (100 / 28), 100) # Max 28%
    else:
        signals.append(("PDA Bypass: Address is off-curve / Program. Wallet heuristics skipped.", "📜", "L1"))

    # L4: Database attribution lookup
    wallet_db = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    if wallet_db:
        print(f"[SOL_SCORER] DB match: {wallet_db.label if wallet_db else 'None'}")
        if wallet_db.threat_level == "CRITICAL":
            entity_class = "Confirmed Threat Actor"
            class_modifier = 1.5
        else:
            entity_class = "Suspect Wallet"
            class_modifier = 1.3
        
        l4 = min(100, wallet_db.risk_score)
        icon = "💥" if wallet_db.threat_level == "CRITICAL" else "⚠️"
        signals.append(("THREAT DB: {} — {}".format(wallet_db.label, wallet_db.category), icon, "L4"))

    # Compute Layer 5 and dormancy adjustments
    l5 = _compute_l5_deterministic(l1, l2, l3, l4, entity_class, 0.0, 0.0)

    date_counts = {}
    for ts in timestamps:
        day = time.strftime("%Y-%m-%d", time.gmtime(ts))
        date_counts[day] = date_counts.get(day, 0) + 1

    persistence_floor, dormancy_modifier = _compute_dormancy_persistence(
        timestamps, l1, l2, l3, l4, date_counts, 0
    )

    raw_score = (l1*0.28) + (l2*0.25) + (l3*0.22) + (l4*0.15) + (l5*0.1)
    final_score = int(raw_score * class_modifier * dormancy_modifier)
    final_score = max(final_score, persistence_floor)
    final_score = min(max(final_score, 0), 100)

    label = "CRITICAL" if final_score >= 80 else "HIGH" if final_score >= 60 else "MEDIUM" if final_score >= 40 else "LOW"

    ai_prompt = f"Analyze SOL wallet {address}. PDA: {is_pda}. Tx count: {tx_count}. Errors: {errors}. Priority txs: {priority_fees_paid}. Score: {final_score}. Entity Class: {entity_class}."
    ai_data = await analyze_entity(ai_prompt, depth=depth, entity_type="solana_wallet")
    ai_verdict = ai_data.get("verdict", f"{label} RISK - Based on analysis.")

    total_usd_value = (sol_balance * sol_price) + usdc_balance + usdt_balance
    if not osint_data.get("summary") or osint_data.get("summary") == "OSINT scan failed":
        osint_data["summary"] = f"AI Assessment: {ai_verdict}"
        
    
    # FIX GRAPH NODES
    existing_node_ids = set(n["id"] for n in graph_nodes)
    for edge in graph_edges:
        src = edge["source"]
        tgt = edge["target"]
        if src not in existing_node_ids:
            graph_nodes.append({"id": src, "label": src[:6]+"...", "type": "default", "risk": 10})
            existing_node_ids.add(src)
        if tgt not in existing_node_ids:
            graph_nodes.append({"id": tgt, "label": tgt[:6]+"...", "type": "default", "risk": 10})
            existing_node_ids.add(tgt)

    response_data = {
        "shortName": "SOL Wallet",
        "tag": label,
        "identity": {
            "address": address,
            "ens": None,
            "label": "Solana PDA" if is_pda else "Solana Address",
            "tag": label,
            "firstSeen": time.strftime("%Y-%m-%d", time.gmtime(min(timestamps))) if timestamps else "Data Not Available",
            "lastSeen": time.strftime("%Y-%m-%d", time.gmtime(max(timestamps))) if timestamps else "Data Not Available",
            "ethBalance": f"{sol_balance:.4f}",
            "totalReceived": "Data Not Available",
            "totalSent": "Data Not Available",
            "txCount": tx_count,
            "uniqueCounterparties": "Data Not Available",
            "totalVolumeUSD": f"~${total_usd_value:,.0f}",
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
            "analyticalSynthesis": {
                "rating": label,
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_verdict,
                "confidence": ai_data.get("confidence", None),
                "consensus_level": ai_data.get("consensus_level", None),
                "judge_reasoning": ai_data.get("judge_reasoning", None),
                "prosecution_summary": ai_data.get("prosecution_summary", None),
                "defense_summary": ai_data.get("defense_summary", None),
                "engine_type": ai_data.get("engine_type", "single")
            },
            "aiAgentA": ai_data.get("agentA"),
            "aiAgentB": ai_data.get("agentB")
        },
        "osint": osint_data,
        "exchange": {"detected": False, "findings": [], "summary": "No centralized exchange patterns confirmed"},
        "mixer": {"detected": False, "findings": [], "launderingIndicators": []},
        "graph": {"nodes": graph_nodes, "edges": graph_edges[:100], "tokens": [], "osint": {}, "defi_interactions": []},
        "holdings": {"erc20_count": (1 if usdc_balance > 0 else 0) + (1 if usdt_balance > 0 else 0), "forta_alerts": 0, "stablecoin_flows": {"usdc": usdc_balance, "usdt": usdt_balance}},
        "transactions": formatted_txs,
        "evidence_context": "SOL Scan Context"
    }

    return response_data
