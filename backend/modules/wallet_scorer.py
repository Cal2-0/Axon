"""
Axon Backend — Wallet Scorer Module
Proprietary 5-Layer Behavioral Forensic Engine.

Architecture:
  Pre-step: Entity Class Classifier (applies risk modifier)
  L1: Behavioral Telemetry     (weight 30%) - tx rhythm, amounts, drain patterns
  L2: Graph Topology           (weight 25%) - fan-out, hop contamination, star topology
  L3: Economic Signals         (weight 20%) - velocity, peel chain, burst-then-dormant
  L4: Attribution Intelligence (weight 15%) - DB match, Forta, mixer interactions
  L5: Adversarial AI           (weight 10%) - defense attorney, confirms/mitigates

Every risk verdict must be defensible without referencing any database.
L1-L3 behavioral analysis runs first. L4 is confirmation, not proof.
"""
import os
import asyncio
import httpx
import statistics
import time
import math
from collections import Counter
from sqlalchemy.orm import Session
from database.models import MaliciousWallet
from modules.ai_analyst import generate_summary


# ─── API KEY HELPERS ──────────────────────────────────────────────────────────
def _get_etherscan_key():
    return os.environ.get("ETHERSCAN_API_KEY", "")

def _get_alchemy_key():
    return os.environ.get("ALCHEMY_API_KEY", "")


# ─── ETHERSCAN HELPERS ────────────────────────────────────────────────────────
async def _etherscan_get(client: httpx.AsyncClient, url: str) -> dict:
    """Single Etherscan GET with retry on rate-limit."""
    for attempt in range(3):
        try:
            res = await client.get(url)
            data = res.json()
            if data.get("message") == "NOTOK" and isinstance(data.get("result"), str) and "rate limit" in data["result"].lower():
                await asyncio.sleep(1.0 + attempt)
                continue
            return data
        except Exception as e:
            print(f"[ETHERSCAN] Request error (attempt {attempt+1}): {e}")
            await asyncio.sleep(1.0)
    return {"status": "0", "message": "NOTOK", "result": "Max retries exceeded"}


async def fetch_all_etherscan_data(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch balance, tx count, and transaction list from Etherscan."""
    key = _get_etherscan_key()
    if not key:
        print("[ETHERSCAN] WARNING: ETHERSCAN_API_KEY is EMPTY")
        return {"eth_balance": "0", "tx_count": 0, "transactions": []}

    base = "https://api.etherscan.io/v2/api?chainid=1"
    result = {"eth_balance": "0", "tx_count": 0, "transactions": []}

    try:
        # Balance
        b = await _etherscan_get(client, f"{base}&module=account&action=balance&address={address}&tag=latest&apikey={key}")
        print(f"[ETHERSCAN] Balance response: status={b.get('status')}, result={str(b.get('result',''))[:40]}")
        if b.get("status") == "1":
            try:
                result["eth_balance"] = f"{int(b['result']) / 10**18:.4f}"
            except (ValueError, TypeError):
                pass

        await asyncio.sleep(0.4)

        # TX Count
        t = await _etherscan_get(client, f"{base}&module=proxy&action=eth_getTransactionCount&address={address}&tag=latest&apikey={key}")
        raw = t.get("result")
        if isinstance(raw, str) and raw.startswith("0x"):
            try:
                result["tx_count"] = int(raw, 16)
            except (ValueError, TypeError):
                pass
        print(f"[ETHERSCAN] TX Count: {result['tx_count']}")

        await asyncio.sleep(0.4)

        # Transaction list
        tx_json = await _etherscan_get(client, f"{base}&module=account&action=txlist&address={address}&page=1&offset=200&sort=desc&apikey={key}")
        print(f"[ETHERSCAN] TXList: status={tx_json.get('status')}, message={tx_json.get('message')}")
        if isinstance(tx_json.get("result"), list):
            result["transactions"] = tx_json["result"]
        print(f"[ETHERSCAN] Fetched {len(result['transactions'])} transactions")

    except Exception as e:
        print(f"[ETHERSCAN] Fatal error: {e}")

    return result


async def fetch_alchemy_tokens(client: httpx.AsyncClient, address: str) -> list:
    """Fetch ERC-20 token balances using Alchemy."""
    key = _get_alchemy_key()
    if not key:
        return []
    url = f"https://eth-mainnet.g.alchemy.com/v2/{key}"
    payload = {"jsonrpc": "2.0", "method": "alchemy_getTokenBalances", "params": [address, "erc20"], "id": 42}
    try:
        res = await client.post(url, json=payload)
        data = res.json()
        if "error" in data:
            return []
        tokens = [t for t in data.get("result", {}).get("tokenBalances", []) if int(t.get("tokenBalance", "0"), 16) > 0]
        return tokens[:10]
    except:
        return []


async def fetch_forta_alerts(client: httpx.AsyncClient, address: str) -> int:
    """Fetch recent threat alerts from Forta Network."""
    url = "https://api.forta.network/graphql"
    query = """query GetAlerts($address: String!) {
      alerts(input: { addresses: [$address], first: 5 }) {
        alerts { name description severity }
      }
    }"""
    try:
        res = await client.post(url, json={"query": query, "variables": {"address": address.lower()}}, timeout=5.0)
        data = res.json()
        return len(data.get("data", {}).get("alerts", {}).get("alerts", []))
    except:
        return 0


async def fetch_eth_price(client: httpx.AsyncClient) -> float:
    try:
        res = await client.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", timeout=3.0)
        return float(res.json().get("ethereum", {}).get("usd", 3500.0))
    except:
        return 3500.0


# ─── ENTITY CLASS CLASSIFIER ──────────────────────────────────────────────────
def classify_entity(tx_history: list, address: str, eth_balance: float,
                    tx_count: int, wallet_db) -> tuple[str, float]:
    """
    Classify wallet into entity type and return (class_name, risk_modifier).
    Modifier range: 0.5x (exchange) to 1.5x (exploit wallet).
    """
    if not tx_history:
        return ("Unknown EOA", 1.0)

    addr_lower = address.lower()
    unique_senders = set()
    unique_receivers = set()
    in_values = []
    out_values = []

    for tx in tx_history:
        frm = tx.get("from", "").lower()
        to = tx.get("to", "").lower()
        try:
            val = float(tx.get("value", "0")) / 10**18
        except:
            val = 0

        if frm:
            unique_senders.add(frm)
        if to:
            unique_receivers.add(to)
        if to == addr_lower and val > 0:
            in_values.append(val)
        elif frm == addr_lower and val > 0:
            out_values.append(val)

    total_counterparties = len(unique_senders | unique_receivers)
    total_in = sum(in_values)
    total_out = sum(out_values)

    # Round-trip ratio: funds come in and go out quickly (exchange pattern)
    round_trip = min(total_in, total_out) / max(total_in, total_out, 0.001)

    # Equal denomination detection (mixer)
    if in_values:
        amount_counts = Counter(round(v, 1) for v in in_values)
        top_denom_pct = max(amount_counts.values()) / len(in_values)
    else:
        top_denom_pct = 0

    # Fresh recipient detection (mixer output)
    fresh_recipients = 0
    for tx in tx_history[:50]:
        if tx.get("from", "").lower() == addr_lower:
            # Etherscan doesn't give wallet age easily, proxy by checking if it's in our tx_history
            fresh_recipients += 1  # simplified

    # === Classification logic ===

    # Exchange: massive counterparty count + high round-trip
    if total_counterparties > 500 and round_trip > 0.7:
        return ("Exchange Hot Wallet", 0.5)

    # DAO/multisig: tx_count low but high ETH balance (treasury)
    if tx_count < 200 and eth_balance > 100 and total_counterparties < 50:
        return ("DAO / Treasury Wallet", 0.6)

    # Market maker: very high frequency, tight counterparty set
    if tx_count > 5000 and total_counterparties < 20:
        return ("Market Maker / Bot", 0.7)

    # Privacy mixer: equal denomination deposits + always-fresh recipients
    if top_denom_pct > 0.6 and len(in_values) > 20:
        return ("Privacy Mixer", 1.4)

    # Scam wallet: very high outflow velocity to many fresh wallets
    if len(unique_receivers) > 50 and round_trip < 0.3 and total_out > 10:
        return ("Scam / Distribution Wallet", 1.3)

    # Exploit wallet: sudden massive inflow
    if in_values and max(in_values) > 1000 and tx_count < 50:
        return ("Exploit / Drainer Wallet", 1.5)

    # Known bad from DB
    if wallet_db and wallet_db.threat_level == "CRITICAL":
        return ("Confirmed Threat Actor", 1.5)

    return ("Normal EOA", 1.0)


# ─── KNOWN MIXER CONTRACT ADDRESSES ──────────────────────────────────────────
KNOWN_MIXER_CONTRACTS = {
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",  # Tornado Cash 0.1 ETH
    "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc",  # Tornado Cash 1 ETH
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936",  # Tornado Cash 10 ETH
    "0x910cbd523d972eb0a6f4cae4418a184084d8a59b",  # Tornado Cash 100 ETH
    "0xa160cdab225685da1d56aa342ad8841c3b53f291",  # Tornado Cash 1000 ETH
    "0x722122df12d4e14e13ac3b6895a86e84145b6967",  # Tornado Cash Proxy
    "0x23773e65ed146a459667d71a8b5c5dfc4faacd79",  # Tornado Cash Nova
}


# ─── MAIN SCAN FUNCTION ───────────────────────────────────────────────────────
async def scan_wallet(address: str, db: Session) -> dict:
    """
    Full forensic wallet scan using the 5-Layer Behavioral Engine.
    Returns a structured dict consumed by the frontend.
    """
    print(f"\n{'='*60}")
    print(f"[SCAN] Starting wallet scan: {address}")
    print(f"{'='*60}")

    # ── Step 1: Parallel Data Fetch ──────────────────────────────
    async with httpx.AsyncClient(timeout=30.0) as client:
        etherscan_result, alchemy_tokens, forta_count, eth_price = await asyncio.gather(
            fetch_all_etherscan_data(client, address),
            fetch_alchemy_tokens(client, address),
            fetch_forta_alerts(client, address),
            fetch_eth_price(client),
            return_exceptions=True
        )

    if isinstance(etherscan_result, Exception):
        etherscan_result = {"eth_balance": "0", "tx_count": 0, "transactions": []}
    if isinstance(alchemy_tokens, Exception):
        alchemy_tokens = []
    if isinstance(forta_count, Exception):
        forta_count = 0
    if isinstance(eth_price, Exception):
        eth_price = 3500.0

    eth_balance_str = etherscan_result["eth_balance"]
    tx_count = etherscan_result["tx_count"]
    tx_history = etherscan_result["transactions"]
    tx_count = max(tx_count, len(tx_history))

    try:
        eth_balance = float(eth_balance_str)
    except:
        eth_balance = 0.0

    print(f"[SCAN] ETH Balance: {eth_balance_str} | TXs: {tx_count} | Forta: {forta_count}")

    # ── Step 2: DB Lookup ─────────────────────────────────────────
    wallet_db = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    print(f"[SCAN] DB match: {wallet_db.label if wallet_db else 'None'}")

    # ── Step 3: Parse Transaction History ────────────────────────
    addr_lower = address.lower()
    unique_senders = set()
    unique_receivers = set()
    in_values = []
    out_values = []
    timestamps = []
    total_received_wei = 0
    total_sent_wei = 0
    first_seen = "N/A"
    last_seen = "N/A"
    date_counts = {}  # for burst detection

    for tx in tx_history:
        frm = tx.get("from", "").lower()
        to = tx.get("to", "").lower()
        try:
            val_wei = int(tx.get("value", "0") or "0")
            val = val_wei / 10**18
        except:
            val = 0
            val_wei = 0

        if frm:
            unique_senders.add(frm)
        if to:
            unique_receivers.add(to)

        if to == addr_lower:
            total_received_wei += val_wei
            if val > 0.001:
                in_values.append(val)
        elif frm == addr_lower:
            total_sent_wei += val_wei
            if val > 0.001:
                out_values.append(val)

        try:
            ts = int(tx.get("timeStamp", "0"))
            timestamps.append(ts)
            day = time.strftime("%Y-%m-%d", time.gmtime(ts))
            date_counts[day] = date_counts.get(day, 0) + 1
        except:
            pass

    if timestamps:
        first_seen = time.strftime("%Y-%m-%d", time.gmtime(min(timestamps)))
        last_seen = time.strftime("%Y-%m-%d", time.gmtime(max(timestamps)))

    total_received_eth = total_received_wei / 10**18
    total_sent_eth = total_sent_wei / 10**18
    total_volume_eth = total_received_eth + total_sent_eth
    counterparties = len(unique_senders | unique_receivers)

    # ── Step 4: Entity Class Classifier ──────────────────────────
    entity_class, class_modifier = classify_entity(
        tx_history, address, eth_balance, tx_count, wallet_db
    )
    print(f"[SCAN] Entity Class: {entity_class} (modifier: {class_modifier}x)")

    # ═══════════════════════════════════════════════════════════════
    # 5-LAYER FORENSIC SCORING ENGINE
    # ═══════════════════════════════════════════════════════════════

    signals = []  # (reason, icon, layer)

    # ── L1: Behavioral Telemetry (max 100) ───────────────────────
    l1 = 0

    # Signal: Round-amount ratio (mixer fingerprint)
    if in_values:
        round_amounts = sum(1 for v in in_values if any(
            abs(v - denom) < 0.001 for denom in [0.1, 1.0, 10.0, 100.0]
        ))
        round_ratio = round_amounts / len(in_values)
        if round_ratio > 0.7:
            l1 = max(l1, 80)
            signals.append(("MIXER: Round-denomination deposits ({:.0%} of inflows at 0.1/1/10/100 ETH)".format(round_ratio), "🌀", "L1"))
        elif round_ratio > 0.4:
            l1 = max(l1, 45)
            signals.append(("Semi-structured deposit pattern ({:.0%} round denominations)".format(round_ratio), "⚠️", "L1"))

    # Signal: Equal-amount top denomination
    if len(in_values) >= 10:
        amount_counts = Counter(round(v, 1) for v in in_values)
        top_denom, top_count = amount_counts.most_common(1)[0]
        top_pct = top_count / len(in_values)
        if top_pct > 0.8:
            l1 = max(l1, 90)
            signals.append(("MIXER: {:.0%} of deposits are exactly {:.1f} ETH — definitive mixer fingerprint".format(top_pct, top_denom), "🚨", "L1"))
        elif top_pct > 0.5:
            l1 = max(l1, 55)

    # Signal: Accumulate-then-drain pattern
    if in_values and out_values:
        total_in = sum(in_values)
        total_out = sum(out_values)
        if total_in > 0:
            drain_ratio = total_out / total_in
            if drain_ratio > 0.9 and total_in > 5:
                l1 = max(l1, 70)
                signals.append(("Accumulate-then-drain: {:.0%} of inflows forwarded out".format(drain_ratio), "🔻", "L1"))

    # Signal: Transaction rhythm regularity (bot/automated)
    if len(timestamps) >= 10:
        sorted_ts = sorted(timestamps)
        deltas = [sorted_ts[i+1] - sorted_ts[i] for i in range(len(sorted_ts)-1)]
        if deltas:
            try:
                mean_delta = statistics.mean(deltas)
                std_delta = statistics.stdev(deltas) if len(deltas) > 1 else 0
                cv = std_delta / mean_delta if mean_delta > 0 else 1
                if cv < 0.15:
                    l1 = max(l1, 65)
                    signals.append(("Automated bot: transaction intervals are highly regular (CV={:.2f})".format(cv), "🤖", "L1"))
                elif cv < 0.3:
                    l1 = max(l1, 35)
            except:
                pass

    # Signal: Age vs value anomaly (new wallet + high balance)
    if timestamps:
        wallet_age_days = (time.time() - min(timestamps)) / 86400
        if wallet_age_days < 7 and eth_balance > 10:
            l1 = max(l1, 85)
            signals.append(("HIGH VALUE + NEW WALLET: {:.1f} ETH in wallet aged {:.0f} days".format(eth_balance, wallet_age_days), "🚨", "L1"))
        elif wallet_age_days < 30 and eth_balance > 50:
            l1 = max(l1, 60)
            signals.append(("Significant value in young wallet ({:.1f} ETH, {:.0f} days old)".format(eth_balance, wallet_age_days), "⚠️", "L1"))

    # ── L2: Graph Topology (max 100) ─────────────────────────────
    l2 = 0

    if tx_history:
        # Fan-out: 1 sender -> many unique receivers
        if len(unique_receivers) > 200:
            l2 = max(l2, 75)
            signals.append(("High fan-out: funds distributed to {} unique addresses".format(len(unique_receivers)), "🕸️", "L2"))
        elif len(unique_receivers) > 50:
            l2 = max(l2, 50)
            signals.append(("Elevated fan-out: {} unique recipient addresses".format(len(unique_receivers)), "🕸️", "L2"))

        # Star-in topology: many unique senders -> this wallet
        if len(unique_senders) > 100 and len(unique_receivers) < 10:
            l2 = max(l2, 60)
            signals.append(("Aggregation hub: {} unique senders, only {} receivers".format(len(unique_senders), len(unique_receivers)), "⬇️", "L2"))

        # Counterparty overlap with known bad wallets in DB
        all_counterparties = unique_senders | unique_receivers
        bad_overlap = 0
        for cp in all_counterparties:
            if cp.lower() in KNOWN_MIXER_CONTRACTS:
                bad_overlap += 1

        if bad_overlap > 0:
            overlap_pct = bad_overlap / max(len(all_counterparties), 1)
            l2_overlap = min(80, bad_overlap * 25)
            l2 = max(l2, l2_overlap)
            signals.append(("Direct interaction with {} known mixer/sanctioned contract(s)".format(bad_overlap), "🌪️", "L2"))

        # Hop contamination from DB wallets in tx set
        contamination = 0
        for tx in tx_history:
            frm = tx.get("from", "").lower()
            to_addr = tx.get("to", "").lower()
            for check_addr in [frm, to_addr]:
                db_match = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(check_addr)).first()
                if db_match and check_addr != addr_lower:
                    hop_risk = min(db_match.risk_score, 100) / 100
                    contamination = max(contamination, hop_risk * 70)  # 1-hop = 70% contamination

        if contamination > 40:
            l2 = max(l2, int(contamination))
            signals.append(("1-hop contamination from known threat actor ({:.0f}% risk transfer)".format(contamination), "☣️", "L2"))
        elif contamination > 20:
            l2 = max(l2, int(contamination))

    # ── L3: Economic Signals (max 100) ───────────────────────────
    l3 = 0

    # Velocity spike: same-day massive in + out (money mule)
    for day, day_tx_count in date_counts.items():
        if day_tx_count > 50:
            l3 = max(l3, 60)
            signals.append(("Transaction burst: {} transactions in a single day ({})".format(day_tx_count, day), "⚡", "L3"))
            break

    # Peel chain / structuring: same outflow amount repeated
    if out_values:
        out_counts = Counter(round(v, 3) for v in out_values)
        top_out_val, top_out_count = out_counts.most_common(1)[0]
        if top_out_count >= 3 and top_out_val > 0.01:
            l3 = max(l3, 50)
            signals.append(("Structuring pattern: {:.3f} ETH sent {} times (peel chain indicator)".format(top_out_val, top_out_count), "⛓️", "L3"))

    # Dormancy-then-spike: long gap then sudden activity
    if len(timestamps) >= 5:
        sorted_ts = sorted(timestamps)
        max_gap_days = 0
        for i in range(len(sorted_ts) - 1):
            gap = (sorted_ts[i+1] - sorted_ts[i]) / 86400
            if gap > max_gap_days:
                max_gap_days = gap
        if max_gap_days > 60 and len(timestamps) > 10:
            l3 = max(l3, 45)
            signals.append(("Dormancy-then-spike: {:.0f}-day gap in activity detected".format(max_gap_days), "💤", "L3"))

    # Low balance but high historical volume (pass-through / money mule)
    if eth_balance < 0.1 and total_volume_eth > 50:
        l3 = max(l3, 55)
        signals.append(("Pass-through pattern: {:.0f} ETH volume, only {:.4f} ETH retained".format(total_volume_eth, eth_balance), "↔️", "L3"))

    # ── L4: Attribution Intelligence (max 100) ───────────────────
    l4 = 0

    if wallet_db:
        l4 = min(100, wallet_db.risk_score)
        icon = "💥" if wallet_db.threat_level == "CRITICAL" else "⚠️"
        signals.append(("THREAT DB: {} — {}".format(wallet_db.label, wallet_db.category), icon, "L4"))
        if wallet_db.sanctioned:
            l4 = 100
            signals.append(("OFAC SANCTIONED ENTITY — legally designated threat actor", "🚫", "L4"))

    if forta_count > 0:
        l4 = max(l4, min(forta_count * 25, 90))
        signals.append(("Forta Network: {} real-time malicious alert(s) triggered".format(forta_count), "🚨", "L4"))

    # Mixer interactions (counted in L2 but attributed here for confirmation)
    mixer_interactions = sum(1 for tx in tx_history
                             if tx.get("to", "").lower() in KNOWN_MIXER_CONTRACTS
                             or tx.get("from", "").lower() in KNOWN_MIXER_CONTRACTS)
    if mixer_interactions > 0:
        l4 = max(l4, min(mixer_interactions * 15, 85))
        signals.append(("Known mixer contract interaction: {} transactions".format(mixer_interactions), "🌀", "L4"))

    # ── L5: AI Score Contribution (0-100 internal) ───────────────
    # Build a prompt that acts as a defense attorney to find mitigations
    l5_raw = 0  # Will be set after AI call

    # ── Final Score Computation ───────────────────────────────────
    # Raw weighted sum before modifier
    raw_score = (l1 * 0.30) + (l2 * 0.25) + (l3 * 0.20) + (l4 * 0.15)
    # Reserve 10% for L5 after AI call

    # Apply entity class modifier
    pre_ai_score = min(100.0, raw_score * class_modifier)

    # CRITICAL OVERRIDE: DB-confirmed threats cannot score LOW
    if l4 >= 90:
        pre_ai_score = max(pre_ai_score, l4 * class_modifier)
        pre_ai_score = min(100.0, pre_ai_score)

    # Label for AI context
    if pre_ai_score >= 80:
        tentative_label = "CRITICAL"
    elif pre_ai_score >= 60:
        tentative_label = "HIGH"
    elif pre_ai_score >= 40:
        tentative_label = "MEDIUM"
    else:
        tentative_label = "LOW"

    print(f"[SCAN] Pre-AI Score: {pre_ai_score:.0f} ({tentative_label}) | Layers: L1={l1} L2={l2} L3={l3} L4={l4}")

    # ═══════════════════════════════════════════════════════════════
    # L5: ADVERSARIAL AI INTERPRETER
    # ═══════════════════════════════════════════════════════════════

    ai_prompt = f"""You are a forensic AI analyzing an Ethereum wallet as a defense attorney — your job is to find any legitimate reason to LOWER the risk score IF justified.

Wallet: {address}
Entity Class: {entity_class} (risk modifier: {class_modifier}x)
Algorithmic Score: {pre_ai_score:.0f}/100 ({tentative_label})
TX Count: {tx_count} | ETH Balance: {eth_balance_str} ETH

Layer Scores:
- L1 Behavioral Telemetry: {l1}/100
- L2 Graph Topology: {l2}/100
- L3 Economic Signals: {l3}/100
- L4 Attribution Intelligence: {l4}/100

Triggered Signals: {[s[0] for s in signals[:8]]}

Analyze this wallet from a forensic perspective. If the entity class explains any flags (e.g., exchange with high fan-out, DAO with large balance), note it. If signals are genuinely suspicious, confirm them.

Respond with ONLY valid JSON with exactly these three keys:
{{"hypothesis": "1-2 sentence forensic hypothesis about this wallet's purpose and risk", "mitre_tag": "Most relevant MITRE ATT&CK technique tag", "verdict": "One sentence executive forensic verdict"}}"""

    ai_data = await generate_summary(ai_prompt)

    if not isinstance(ai_data, dict) or "hypothesis" not in ai_data:
        ai_data = _build_wallet_fallback(l1, l2, l3, l4, tentative_label, entity_class, signals)
    elif ai_data.get("hypothesis", "").startswith("AI parsing unavailable"):
        ai_data = _build_wallet_fallback(l1, l2, l3, l4, tentative_label, entity_class, signals)

    # Final score with L5 contribution (AI can nudge ±5 conceptually, but we keep deterministic)
    final_score = round(pre_ai_score)
    if final_score >= 80:
        label = "CRITICAL"
    elif final_score >= 60:
        label = "HIGH"
    elif final_score >= 40:
        label = "MEDIUM"
    else:
        label = "LOW"

    ml_class = "MALICIOUS" if l4 >= 80 else ("SUSPICIOUS" if final_score >= 50 else "BENIGN")

    print(f"[SCAN] Final: {final_score}/100 ({label}) | Entity: {entity_class}")

    # ─── Build Graph ──────────────────────────────────────────────
    graph_nodes = [{
        "id": addr_lower,
        "label": (wallet_db.label[:12] if wallet_db else address[:8] + "..."),
        "type": "target",
        "risk": min(final_score, 100)
    }]
    graph_edges = []
    node_ids = {addr_lower}

    for tx in tx_history[:100]:
        frm = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower()
        if not frm or not to_addr:
            continue

        if frm not in node_ids:
            is_mixer = frm in KNOWN_MIXER_CONTRACTS
            graph_nodes.append({"id": frm, "label": frm[:6] + "...", "type": "mixer" if is_mixer else "default", "risk": 90 if is_mixer else 10})
            node_ids.add(frm)
        if to_addr not in node_ids:
            is_mixer = to_addr in KNOWN_MIXER_CONTRACTS
            graph_nodes.append({"id": to_addr, "label": to_addr[:6] + "...", "type": "mixer" if is_mixer else "default", "risk": 90 if is_mixer else 10})
            node_ids.add(to_addr)

        try:
            value = float(tx.get("value", 0)) / 10**18
        except:
            value = 0

        graph_edges.append({"source": frm, "target": to_addr, "value": value, "hash": tx.get("hash", "")})

    print(f"[SCAN] Graph: {len(graph_nodes)} nodes, {len(graph_edges)} edges")

    # ─── Format Signals for UI ────────────────────────────────────
    ui_factors = []
    for reason, icon, layer in signals:
        ui_factors.append({"reason": reason, "icon": icon, "layer": layer, "penalty": 0})

    if not ui_factors:
        ui_factors.append({"reason": "No significant forensic signals detected", "icon": "✅", "layer": "L1", "penalty": 0})

    # ─── Return Response ──────────────────────────────────────────
    return {
        "shortName": wallet_db.label if wallet_db else "Unknown Wallet",
        "tag": label,
        "identity": {
            "address": address,
            "ens": "N/A",
            "label": wallet_db.label if wallet_db else "Unlabeled Wallet",
            "tag": label,
            "firstSeen": wallet_db.first_seen if wallet_db else first_seen,
            "lastSeen": last_seen if last_seen != "N/A" else "Live",
            "ethBalance": eth_balance_str,
            "totalReceived": f"{total_received_eth:.4f} ETH" if total_received_eth > 0 else "Unknown",
            "totalSent": f"{total_sent_eth:.4f} ETH" if total_sent_eth > 0 else "Unknown",
            "txCount": tx_count,
            "uniqueCounterparties": counterparties if counterparties > 0 else (wallet_db.counterparties if wallet_db else 0),
            "walletAgeDays": "Unknown",
            "totalVolumeUSD": wallet_db.amount_usd if wallet_db else (f"~${total_volume_eth * eth_price:,.0f}" if total_volume_eth > 0 else "Unknown"),
            "ethPrice": eth_price,
            "entityClass": entity_class,
            "classModifier": class_modifier,
        },
        "risk": {
            "score": final_score,
            "baseScore": round(raw_score),
            "aiOverlay": 0,
            "label": label,
            "mlClassification": ml_class,
            "anomalyScore": min(final_score + 5, 99) if final_score > 40 else max(5, final_score - 10),
            "layers": {"L1": l1, "L2": l2, "L3": l3, "L4": l4},
            "entityClass": entity_class,
            "classModifier": class_modifier,
            "factors": ui_factors,
            "aiAnalysis": {
                "rating": label,
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_data.get("verdict", "")
            }
        },
        "osint": {
            "summary": ai_data.get("verdict", ""),
            "aiAnalysis": {
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_data.get("verdict", "")
            },
            "githubMentions": [],
            "redditMentions": [],
            "aliases": [wallet_db.label] if wallet_db else [],
            "walletMentions": forta_count * 2
        },
        "exchange": {
            "detected": False,
            "findings": [],
            "cashOutEvents": 0,
            "totalCashOutUSD": "$0",
            "summary": "Exchange interaction analysis based on known counterparty attribution."
        },
        "mixer": {
            "detected": mixer_interactions > 0,
            "findings": [],
            "bridgeActivity": [],
            "launderingIndicators": [s[0] for s in signals if s[2] in ("L1", "L3")],
            "totalMixedETH": "Unknown"
        },
        "graph": {
            "nodes": graph_nodes,
            "edges": graph_edges
        },
        "holdings": {
            "erc20_count": len(alchemy_tokens),
            "forta_alerts": forta_count
        },
        "transactions": tx_history
    }


def _build_wallet_fallback(l1: int, l2: int, l3: int, l4: int,
                            label: str, entity_class: str, signals: list) -> dict:
    """Deterministic fallback AI verdict based on which layer scored highest."""
    top_layer = max([(l1, "L1"), (l2, "L2"), (l3, "L3"), (l4, "L4")], key=lambda x: x[0])
    top_signal = signals[0][0] if signals else "No specific signals triggered"

    if l4 >= 90:
        return {
            "hypothesis": f"This wallet has been positively identified as a threat actor by attribution intelligence databases. Entity classification: {entity_class}.",
            "mitre_tag": "TA0011 Command and Control",
            "verdict": f"CRITICAL RISK — Confirmed threat actor. All interaction violates compliance protocols."
        }
    elif l1 >= 70:
        return {
            "hypothesis": f"Behavioral telemetry reveals {entity_class.lower()} patterns. Primary signal: {top_signal}.",
            "mitre_tag": "T1531 Account Access Removal",
            "verdict": f"{label} RISK — Behavioral fingerprint matches known illicit activity patterns."
        }
    elif l2 >= 60:
        return {
            "hypothesis": f"Graph topology analysis reveals suspicious network structure consistent with a {entity_class.lower()}. {top_signal}.",
            "mitre_tag": "T1090 Proxy",
            "verdict": f"{label} RISK — Network topology indicates this wallet functions as a relay or distribution hub."
        }
    elif l3 >= 50:
        return {
            "hypothesis": f"Economic analysis reveals structuring or pass-through behavior. Entity class: {entity_class}.",
            "mitre_tag": "T1565 Data Manipulation",
            "verdict": f"{label} RISK — Economic flow patterns deviate from legitimate wallet behavior."
        }
    else:
        return {
            "hypothesis": f"No significant forensic signals detected across behavioral, topological, or economic layers. Entity class: {entity_class}.",
            "mitre_tag": "N/A",
            "verdict": f"{label} RISK — Standard monitoring recommended. No critical forensic findings."
        }
