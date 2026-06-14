"""
Axon Backend — Contract Scanner Module
Proprietary 5-Axis Behavioral Forensic Engine.
Integrates Etherscan, GoPlus Security, AI Analysis.
"""
import os
import httpx
import asyncio
import statistics
import json
from sqlalchemy.orm import Session
from database.models import MaliciousWallet
from modules.wallet_scorer import fetch_forta_alerts, fetch_all_etherscan_data
from modules.ai_analyst import generate_summary


def _get_etherscan_key():
    """Read key at call time, not import time."""
    return os.environ.get("ETHERSCAN_API_KEY", "")


# ═══════════════════════════════════════════════════════════
# DATA FETCHERS
# ═══════════════════════════════════════════════════════════

async def fetch_etherscan_source(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch verified source code, ABI, and compiler info from Etherscan."""
    key = _get_etherscan_key()
    if not key:
        print("[CONTRACT] WARNING: ETHERSCAN_API_KEY is EMPTY")
        return {"source": "", "abi": "[]", "name": "Unknown", "compiler": "N/A", "proxy": False, "license": "Unknown"}

    url = f"https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address={address}&apikey={key}"
    try:
        res = await client.get(url)
        data = res.json()
        if data.get("status") == "1" and data.get("message") == "OK" and data["result"][0]["SourceCode"]:
            r = data["result"][0]
            return {
                "source": r.get("SourceCode", ""),
                "abi": r.get("ABI", "[]"),
                "name": r.get("ContractName", "Unknown"),
                "compiler": r.get("CompilerVersion", "N/A"),
                "proxy": r.get("Proxy", "0") == "1",
                "license": r.get("LicenseType", "Unknown")
            }
    except Exception as e:
        print(f"[CONTRACT] Etherscan source error: {e}")

    return {"source": "", "abi": "[]", "name": "Unknown", "compiler": "N/A", "proxy": False, "license": "Unknown"}


async def fetch_goplus_security(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch live token security indicators from GoPlus Labs."""
    url = f"https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses={address.lower()}"
    try:
        res = await client.get(url)
        data = res.json()
        if data.get("code") == 1 and data.get("result"):
            token_data = data["result"].get(address.lower())
            if token_data:
                return token_data
    except Exception as e:
        print(f"[CONTRACT] GoPlus error: {e}")
    return {}


# ═══════════════════════════════════════════════════════════
# MAIN SCAN FUNCTION
# ═══════════════════════════════════════════════════════════

async def scan_contract(address: str, db: Session) -> dict:
    """
    Full forensic contract scan using the 5-Axis Behavioral Engine.
    Returns a structured dict consumed by the frontend.
    """
    # ── Step 1: Parallel Data Fetch ──────────────────────
    async with httpx.AsyncClient(timeout=30.0) as client:
        etherscan, goplus, forta_count, tx_data = await asyncio.gather(
            fetch_etherscan_source(client, address),
            fetch_goplus_security(client, address),
            fetch_forta_alerts(client, address),
            fetch_all_etherscan_data(client, address),
            return_exceptions=True
        )

    # Graceful exception handling
    if isinstance(etherscan, Exception):
        print(f"[CONTRACT] Etherscan failed: {etherscan}")
        etherscan = {}
    if isinstance(goplus, Exception):
        print(f"[CONTRACT] GoPlus failed: {goplus}")
        goplus = {}
    if isinstance(forta_count, Exception):
        forta_count = 0
    if isinstance(tx_data, Exception):
        tx_data = {"tx_count": 0, "transactions": []}

    # ── Step 2: Extract Core Data ────────────────────────
    tx_history = tx_data.get("transactions", [])
    tx_count = max(tx_data.get("tx_count", 0), len(tx_history))

    name = etherscan.get("name", "Unknown")
    if goplus and goplus.get("token_name"):
        name = goplus.get("token_name")

    is_verified = bool(etherscan.get("source"))
    is_proxy = goplus.get("is_proxy") == "1" or etherscan.get("proxy", False)

    # DB threat intelligence lookup
    wallet = db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    name_lower = name.lower()

    # GoPlus numeric values
    buy_tax = float(goplus.get("buy_tax", 0) or 0) * 100
    sell_tax = float(goplus.get("sell_tax", 0) or 0) * 100

    # ═══════════════════════════════════════════════════════
    # 5-AXIS BEHAVIORAL FORENSIC ENGINE
    # ═══════════════════════════════════════════════════════

    axis = {"A1": 0, "A2": 0, "A3": 0, "A4": 0, "A5": 0}
    signals = []

    # ── A1: Code Security Risk ───────────────────────────
    if not is_verified:
        axis["A1"] = max(axis["A1"], 90)
        signals.append("Unverified bytecode — forensic blindspot")
    if goplus.get("is_honeypot") == "1":
        axis["A1"] = 100
        signals.append("HONEYPOT: Token cannot be sold after purchase")
    if goplus.get("cannot_sell_all") == "1":
        axis["A1"] = max(axis["A1"], 80)
        signals.append("Sell restriction logic detected in contract")
    if goplus.get("selfdestruct_can_be_triggered") == "1":
        axis["A1"] = max(axis["A1"], 75)
        signals.append("Self-destruct capability present")
    if goplus.get("transfer_pausable") == "1":
        axis["A1"] = max(axis["A1"], 50)
        signals.append("Transfers can be paused by admin")
    if goplus.get("external_call") == "1":
        axis["A1"] = max(axis["A1"], 40)
        signals.append("External contract call risk in execution flow")

    # ── A2: Admin & Economic Risk ────────────────────────
    if is_proxy:
        axis["A2"] = max(axis["A2"], 65)
        signals.append("Upgradeable proxy — logic can be swapped post-audit")

    if buy_tax > 25 or sell_tax > 25:
        axis["A2"] = max(axis["A2"], 90)
        signals.append(f"Extreme taxation — Buy: {buy_tax:.0f}%, Sell: {sell_tax:.0f}%")
    elif buy_tax > 10 or sell_tax > 10:
        axis["A2"] = max(axis["A2"], 60)
        signals.append(f"Elevated taxation — Buy: {buy_tax:.0f}%, Sell: {sell_tax:.0f}%")
    elif abs(buy_tax - sell_tax) > 5 and sell_tax > buy_tax:
        axis["A2"] = max(axis["A2"], 55)
        signals.append(f"Asymmetric tax (honeypot pattern) — Buy: {buy_tax:.0f}%, Sell: {sell_tax:.0f}%")

    if goplus.get("is_mintable") == "1":
        axis["A2"] = max(axis["A2"], 50)
        signals.append("Admin can mint unlimited tokens (dilution risk)")
    if goplus.get("is_blacklisted") == "1":
        axis["A2"] = max(axis["A2"], 45)
        signals.append("Blacklist function — admin can freeze wallets")
    if goplus.get("can_take_back_ownership") == "1":
        axis["A2"] = max(axis["A2"], 70)
        signals.append("Ownership reclamation — admin can take back control")
    if goplus.get("owner_change_balance") == "1":
        axis["A2"] = max(axis["A2"], 85)
        signals.append("Owner can modify token balances directly")
    if goplus.get("hidden_owner") == "1":
        axis["A2"] = max(axis["A2"], 75)
        signals.append("Hidden owner detected — concealed admin privileges")

    # ── A3: Behavioral Fingerprinting ────────────────────
    in_values = []
    out_values = []
    for tx in tx_history:
        try:
            val = float(tx.get("value", "0")) / 10**18
        except (ValueError, TypeError):
            continue
        if val < 0.001:
            continue
        if tx.get("to", "").lower() == address.lower():
            in_values.append(val)
        elif tx.get("from", "").lower() == address.lower():
            out_values.append(val)

    # Mixer signature: highly uniform deposits
    if len(in_values) >= 10:
        try:
            cv = statistics.stdev(in_values) / statistics.mean(in_values)
            if cv < 0.1:
                axis["A3"] = max(axis["A3"], 95)
                signals.append(f"MIXER SIGNATURE: Uniform deposits (CV={cv:.3f}, Mean={statistics.mean(in_values):.2f} ETH)")
            elif cv < 0.25:
                axis["A3"] = max(axis["A3"], 60)
                signals.append(f"Semi-uniform deposit pattern (CV={cv:.3f})")
        except:
            pass

    # Drain pattern: heavy outflow after accumulation
    if len(in_values) > 5 and len(out_values) > 5:
        total_in = sum(in_values)
        total_out = sum(out_values)
        if total_in > 0 and total_out / total_in > 0.9:
            axis["A3"] = max(axis["A3"], 70)
            signals.append(f"High drain ratio: {total_out/total_in:.0%} of inflows were withdrawn")

    # High volume with no native ETH (pure token contract activity)
    if tx_count > 1000 and len(in_values) == 0:
        axis["A3"] = max(axis["A3"], 50)
        signals.append("High-volume contract with no native ETH deposits")

    # ── A4: Network Topology ─────────────────────────────
    if len(tx_history) > 10:
        unique_senders = set()
        unique_receivers = set()
        for tx in tx_history:
            frm = tx.get("from", "").lower()
            to = tx.get("to", "").lower()
            if frm:
                unique_senders.add(frm)
            if to:
                unique_receivers.add(to)

        fan_in = len(unique_senders)
        fan_out = len(unique_receivers)

        # Star topology detection (choke point)
        if fan_in > 20 and fan_out < 5:
            axis["A4"] = max(axis["A4"], 80)
            signals.append(f"Star-in topology: {fan_in} senders → {fan_out} receivers (aggregation point)")
        elif fan_out > 20 and fan_in < 5:
            axis["A4"] = max(axis["A4"], 75)
            signals.append(f"Star-out topology: {fan_in} senders → {fan_out} receivers (distribution hub)")

        # Concentration: contract is >80% of edges
        total_addrs = len(unique_senders | unique_receivers)
        if total_addrs > 0:
            contract_edges = sum(1 for tx in tx_history if tx.get("from", "").lower() == address.lower() or tx.get("to", "").lower() == address.lower())
            concentration = contract_edges / len(tx_history)
            if concentration > 0.95 and total_addrs > 20:
                axis["A4"] = max(axis["A4"], 60)
                signals.append(f"High centrality: contract in {concentration:.0%} of all edges")
    else:
        axis["A4"] = 10  # Insufficient data

    # ── A5: Threat Intelligence ──────────────────────────
    if wallet:
        axis["A5"] = 100
        signals.append(f"THREAT DB MATCH: {wallet.label} ({wallet.category})")
    if any(kw in name_lower for kw in ["tornado", "mixer", "blender", "cyclone", "wasabi"]):
        axis["A5"] = max(axis["A5"], 95)
        signals.append("Sanctioned privacy protocol keyword match")
    if forta_count > 0:
        axis["A5"] = max(axis["A5"], min(forta_count * 25, 90))
        signals.append(f"Forta Network: {forta_count} malicious alert(s)")

    # ═══════════════════════════════════════════════════════
    # FINAL SCORE COMPUTATION
    # ═══════════════════════════════════════════════════════

    weights = {"A1": 0.20, "A2": 0.15, "A3": 0.30, "A4": 0.15, "A5": 0.20}
    raw = sum(axis[a] * weights[a] for a in axis)

    # Cross-axis multipliers (correlated risk amplification)
    multiplier = 1.0
    if axis["A2"] > 60 and axis["A5"] > 70:
        multiplier = max(multiplier, 1.7)  # Rug vector: admin powers + known threat
    if axis["A3"] > 50 and axis["A4"] > 50:
        multiplier = max(multiplier, 1.6)  # Laundering path: suspicious behavior + suspicious topology
    if axis["A5"] > 60 and axis["A1"] > 50:
        multiplier = max(multiplier, 1.8)  # Bad actor + unverified code
    if axis["A1"] > 80 and axis["A2"] > 60:
        multiplier = max(multiplier, 1.5)  # Honeypot + admin drain

    final_score = min(100.0, raw * multiplier)

    # CRITICAL OVERRIDE: Known threats cannot score LOW.
    # A sanctioned entity's score floors at its threat intel level.
    if axis["A5"] >= 90:
        final_score = max(final_score, axis["A5"])

    # Confidence interval based on data availability
    ci = 20 if tx_count < 50 else (12 if tx_count < 200 else 5)

    # Label assignment
    if final_score >= 80:
        label = "CRITICAL"
    elif final_score >= 60:
        label = "HIGH"
    elif final_score >= 40:
        label = "MEDIUM"
    else:
        label = "LOW"

    print(f"[CONTRACT] {name} ({address[:10]}...): Score={final_score:.0f} ({label}), Axes={axis}, Mult={multiplier}")

    # ═══════════════════════════════════════════════════════
    # AI FORENSIC INTERPRETER
    # ═══════════════════════════════════════════════════════

    ai_prompt = f"""You are interpreting a forensic risk matrix for a smart contract. DO NOT compute your own score.

Contract: {name} ({address})
Transaction Count: {tx_count}
Algorithmic Score: {final_score:.0f}/100 ({label})

5-Axis Matrix:
- A1 Code Security: {axis['A1']}/100
- A2 Admin/Economic Risk: {axis['A2']}/100
- A3 Behavioral Fingerprint: {axis['A3']}/100
- A4 Network Topology: {axis['A4']}/100
- A5 Threat Intelligence: {axis['A5']}/100

Triggered Signals: {json.dumps(signals[:8])}

Respond with ONLY valid JSON containing exactly these three keys:
{{"hypothesis": "1-2 sentence forensic hypothesis about this contract's purpose and risk", "mitre_tag": "Most relevant MITRE ATT&CK technique tag", "verdict": "One sentence executive verdict"}}"""

    ai_data = await generate_summary(ai_prompt)

    # Validate AI response has the expected keys
    if not isinstance(ai_data, dict) or "hypothesis" not in ai_data:
        print(f"[CONTRACT] AI returned unexpected format: {type(ai_data)} — using fallback")
        ai_data = _build_fallback(axis, label, name, signals)
    elif ai_data.get("hypothesis", "").startswith("AI parsing unavailable"):
        ai_data = _build_fallback(axis, label, name, signals)

    # ═══════════════════════════════════════════════════════
    # FORMAT GOPLUS CHECKS FOR UI
    # ═══════════════════════════════════════════════════════

    goplus_checks = []
    if goplus:
        checks_def = [
            ("Honeypot Detection", "is_honeypot", "Confirmed honeypot", "Not a honeypot"),
            ("Buy Tax", None, f"{buy_tax:.1f}%", f"{buy_tax:.1f}%"),
            ("Sell Tax", None, f"{sell_tax:.1f}%", f"{sell_tax:.1f}%"),
            ("Mintable Supply", "is_mintable", "Admin can mint tokens", "No mint function"),
            ("Blacklist Function", "is_blacklisted", "Blacklist present", "No blacklist"),
            ("Hidden Owner", "hidden_owner", "Hidden owner detected", "Owner is visible"),
            ("Self Destruct", "selfdestruct_can_be_triggered", "Can self-destruct", "No self-destruct"),
            ("Balance Manipulation", "owner_change_balance", "Owner can change balances", "Balances are safe"),
        ]
        for check_name, key, risk_detail, ok_detail in checks_def:
            if key is None:
                # Tax checks
                tax_val = buy_tax if "Buy" in check_name else sell_tax
                status = "RISK" if tax_val > 25 else ("WARN" if tax_val > 10 else "OK")
                goplus_checks.append({"name": check_name, "status": status, "detail": risk_detail})
            else:
                is_risky = goplus.get(key) == "1"
                goplus_checks.append({
                    "name": check_name,
                    "status": "RISK" if is_risky else "OK",
                    "detail": risk_detail if is_risky else ok_detail
                })
    else:
        goplus_checks = [{"name": "Token Security", "status": "OK", "detail": "Not an ERC-20 token — GoPlus N/A"}]

    # ═══════════════════════════════════════════════════════
    # BUILD RESPONSE
    # ═══════════════════════════════════════════════════════

    return {
        "identity": {
            "address": address,
            "name": name,
            "compiler": etherscan.get("compiler", "Unknown"),
            "network": "Ethereum Mainnet",
            "license": etherscan.get("license", "None"),
            "deployedDate": "Unknown",
            "proxyType": "Upgradeable Proxy" if is_proxy else "None",
            "verified": is_verified,
            "deployer": etherscan.get("constructorArguments", "Unknown"),
            "proxy": is_proxy
        },
        "info": {
            "tokenName": goplus.get("token_name", "N/A"),
            "symbol": goplus.get("token_symbol", "N/A"),
            "totalSupply": goplus.get("total_supply", "Unknown"),
            "holders": goplus.get("holder_count", "Unknown"),
            "contractBalance": "Unknown",
            "ownerAddress": goplus.get("owner_address", "Unknown"),
            "isMintable": goplus.get("is_mintable") == "1",
            "isFreezable": goplus.get("is_blacklisted") == "1",
            "isBlacklist": goplus.get("is_blacklisted") == "1",
            "isToken": bool(goplus)
        },
        "risk": {
            "score": round(final_score),
            "ci": ci,
            "label": label,
            "baseScore": round(raw, 1),
            "aiOverlay": 0,
            "factors": [{"reason": s, "icon": "🔹", "penalty": 0} for s in signals],
            "axes": axis,
            "multiplier": multiplier,
            "aiAnalysis": {
                "rating": label,
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_data.get("verdict", "")
            }
        },
        "goplus": {
            "overall": label,
            "checks": goplus_checks
        }
    }


def _build_fallback(axis: dict, label: str, name: str, signals: list) -> dict:
    """Build a deterministic AI fallback based on the matrix data."""
    if axis["A5"] >= 90:
        return {
            "hypothesis": f"{name} is flagged by threat intelligence databases as a known malicious or sanctioned entity. Interaction with this contract carries severe compliance and asset risk.",
            "mitre_tag": "TA0040 Impact",
            "verdict": f"CRITICAL RISK — {name} is a confirmed threat actor. All interaction must be treated as hostile."
        }
    elif axis["A1"] >= 80:
        return {
            "hypothesis": f"{name} exhibits dangerous code-level vulnerabilities including potential honeypot patterns or unverified bytecode that prevents forensic audit.",
            "mitre_tag": "T1059 Command and Scripting Interpreter",
            "verdict": f"{label} RISK — Contract code poses direct exploitation risk to interacting wallets."
        }
    elif axis["A2"] >= 60:
        return {
            "hypothesis": f"{name} has concentrated admin privileges that enable unilateral fund manipulation including potential rug-pull vectors.",
            "mitre_tag": "T1078 Valid Accounts",
            "verdict": f"{label} RISK — Elevated admin control surfaces represent material risk to deposited assets."
        }
    elif axis["A3"] >= 60:
        return {
            "hypothesis": f"{name} exhibits behavioral patterns consistent with financial structuring or laundering activity based on transaction flow analysis.",
            "mitre_tag": "T1565 Data Manipulation",
            "verdict": f"{label} RISK — On-chain behavior deviates significantly from legitimate protocol patterns."
        }
    else:
        return {
            "hypothesis": f"{name} does not trigger significant risk signals across the 5-axis forensic matrix. No anomalous behavioral patterns detected in available data.",
            "mitre_tag": "N/A",
            "verdict": f"{label} RISK — No critical forensic findings. Standard monitoring recommended."
        }
