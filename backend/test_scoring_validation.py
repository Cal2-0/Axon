"""
AXON Forensic Engine — Comprehensive Scoring Validation Test v1.0
═══════════════════════════════════════════════════════════════════
50 addresses (25 wallets + 25 contracts) across all risk bands.
Uses forensically verified, publicly documented addresses.

This script:
  1. Clears cached InvestigationLog entries for test addresses
  2. Runs fresh scans against the live AXON API
  3. Collects results + score breakdown
  4. Outputs a formatted analysis table
  5. Saves results to JSON for further analysis

Run: python test_scoring_validation.py
Requires: backend running on port 8001
"""
import requests
import time
import json
import sys
import os

API = "http://127.0.0.1:8001"

# ═══════════════════════════════════════════════════════════════
# TEST ADDRESSES — Forensically Verified from Public Records
# ═══════════════════════════════════════════════════════════════
# Expected ranges based on forensic reality:
#   LOW       = 0-39   (exchange, DeFi, infrastructure, normal user)
#   MEDIUM    = 40-59  (some flags but not confirmed threat)
#   HIGH      = 60-79  (strong suspicious evidence or exploit victim)
#   CRITICAL  = 80-100 (sanctioned, confirmed hacker, exploit tool)

WALLET_TESTS = [
    # ── EXCHANGE HOT WALLETS (Expected: LOW 0-25) ─────────────────
    {"addr": "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", "expected": "LOW",      "exp_max": 25, "label": "Binance 7 (Cold Wallet)"},
    {"addr": "0x28C6c06298d514Db089934071355E5743bf21d60", "expected": "LOW",      "exp_max": 25, "label": "Binance 14 (Hot Wallet)"},
    {"addr": "0xF977814e90dA44bFA03b6295A0616a897441aceC", "expected": "LOW",      "exp_max": 25, "label": "Binance 8"},
    {"addr": "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549", "expected": "LOW",      "exp_max": 25, "label": "Bitfinex 2"},
    {"addr": "0xDFd5293D8e347dFe59E90eFd55b2956a1343963d", "expected": "LOW",      "exp_max": 25, "label": "Binance 16"},
    {"addr": "0x267be1C1D684F78cb4F6a176C4911b741E4Ffdc0", "expected": "LOW",      "exp_max": 25, "label": "Kraken 6"},
    {"addr": "0x503828976D22510aad0201ac7EC88293211D23Da", "expected": "LOW",      "exp_max": 25, "label": "Coinbase 1"},
    {"addr": "0xd24400ae8BfEBb18cA49Be86258a3C749cf46853", "expected": "LOW",      "exp_max": 25, "label": "Gemini 4"},

    # ── KNOWN PUBLIC FIGURES / WHALES (Expected: LOW 0-20) ────────
    {"addr": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "expected": "LOW",      "exp_max": 20, "label": "Vitalik Buterin"},
    {"addr": "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", "expected": "LOW",      "exp_max": 25, "label": "Vitalik (old address)"},

    # ── DEFI POWER USERS (Expected: LOW 0-30) ─────────────────────
    {"addr": "0x0716a17FBAeE714f1E6aB0f9d59edbC5f09815C0", "expected": "LOW",      "exp_max": 35, "label": "Justin Sun 1"},
    {"addr": "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6", "expected": "LOW",      "exp_max": 30, "label": "Arbitrum Foundation Treasury"},

    # ── STAKING / INFRASTRUCTURE (Expected: LOW 5-20) ─────────────
    {"addr": "0x00000000219ab540356cBB839Cbe05303d7705Fa", "expected": "LOW",      "exp_max": 20, "label": "ETH2 Deposit Contract"},

    # ── CONFIRMED HACK / EXPLOIT WALLETS (Expected: HIGH-CRITICAL 60-100) ──
    {"addr": "0x098B716B8Aaf21512996dC57EB0615e2383E2f96", "expected": "CRITICAL", "exp_max": 100, "label": "Ronin Bridge Exploiter (Lazarus Group, $625M)"},
    {"addr": "0x8589427373D6D84E98730D7795D8f6f8731FDA16", "expected": "CRITICAL", "exp_max": 100, "label": "Lazarus Group Address 2"},
    {"addr": "0x53b6936513e738f44FB50d2b9476730C0Ab3Bfc1", "expected": "CRITICAL", "exp_max": 100, "label": "OFAC Sanctioned Lazarus 3"},
    {"addr": "0xa7e5d5a720f06526557c513402f2e6b5fa20b008", "expected": "HIGH",     "exp_max": 100, "label": "OFAC Sanctioned Address"},
    {"addr": "0x3CBdeD43EFdAf0FC77b9C55F6fC9988fCC9b757d", "expected": "HIGH",     "exp_max": 100, "label": "Wintermute Exploit Wallet (Sep 2022, $160M)"},

    # ── KNOWN TORNADO CASH USERS / MIXERS (Expected: MEDIUM-HIGH 40-80) ──
    {"addr": "0x746c675dAB49Bcd5BB9Dc85161f2d7Eb435009bF", "expected": "MEDIUM",   "exp_max": 75, "label": "Known mixer user wallet"},

    # ── NORMAL / LOW-ACTIVITY WALLETS (Expected: LOW 0-15) ────────
    {"addr": "0x0000000000000000000000000000000000000000", "expected": "LOW",      "exp_max": 10, "label": "Null / Burn Address"},
    {"addr": "0x000000000000000000000000000000000000dEaD", "expected": "LOW",      "exp_max": 10, "label": "Dead Burn Address"},

    # ── PHISHING / SCAM WALLETS (Expected: HIGH-CRITICAL) ─────────
    {"addr": "0x59ABf3837Fa962d6853b4Cc0a19513AA031fd32b", "expected": "HIGH",     "exp_max": 100, "label": "Known Phishing Drainer"},

    # ── MEV BOT / SEARCHER (Expected: LOW-MEDIUM 10-40) ──────────
    {"addr": "0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13", "expected": "LOW",      "exp_max": 40, "label": "Jaredfromsubway MEV Bot"},
    {"addr": "0x6b75d8AF000000e20B7a7DDf000Ba900b4009A80", "expected": "LOW",      "exp_max": 35, "label": "Flashbots Builder"},
]

CONTRACT_TESTS = [
    # ── SANCTIONED CONTRACTS (Expected: CRITICAL 85-100) ──────────
    {"addr": "0x722122dF12D4e14e13Ac3b6895a86e84145b6967", "expected": "CRITICAL", "exp_max": 100, "label": "Tornado Cash Router (OFAC Sanctioned)"},
    {"addr": "0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b", "expected": "CRITICAL", "exp_max": 100, "label": "Tornado Cash 0.1 ETH Pool"},
    {"addr": "0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc", "expected": "CRITICAL", "exp_max": 100, "label": "Tornado Cash 1 ETH Pool"},
    {"addr": "0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936", "expected": "CRITICAL", "exp_max": 100, "label": "Tornado Cash 10 ETH Pool"},
    {"addr": "0xa160cdAB225685dA1d56aa342aD8841c3b53f291", "expected": "CRITICAL", "exp_max": 100, "label": "Tornado Cash Governance"},

    # ── SCAM / RUG PULL TOKENS (Expected: HIGH-CRITICAL 70-95) ────
    {"addr": "0x8076C74C5e3F5852037F31Ff0093Eeb8c8ADd8D3", "expected": "CRITICAL", "exp_max": 100, "label": "SafeMoon (SEC Action, $5.7B losses)"},
    {"addr": "0xa2b4c0Af19cC16a6CfAcCe81F192B024d625817D", "expected": "CRITICAL", "exp_max": 100, "label": "Squid Game Token (rug pull)"},

    # ── EXPLOIT VICTIM CONTRACTS (Expected: HIGH 60-79) ───────────
    {"addr": "0xBB9bc244D798123fDe783fCc1C72d3Bb8C189413", "expected": "HIGH",     "exp_max": 80, "label": "The DAO (2016 exploit, $60M)"},
    {"addr": "0x3014ca10b91cb3D0AD85fEF7A3Cb95BCAc9c0f79", "expected": "HIGH",     "exp_max": 85, "label": "Multichain Bridge (rugged $130M)"},

    # ── BLUE-CHIP DEFI (Expected: LOW 0-20) ───────────────────────
    {"addr": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", "expected": "LOW",      "exp_max": 20, "label": "Uniswap V2 Router"},
    {"addr": "0x5c69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", "expected": "LOW",      "exp_max": 20, "label": "Uniswap V2 Factory"},
    {"addr": "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", "expected": "LOW",      "exp_max": 20, "label": "Aave V2 Pool"},
    {"addr": "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B", "expected": "LOW",      "exp_max": 20, "label": "Compound Comptroller"},
    {"addr": "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", "expected": "LOW",      "exp_max": 20, "label": "Curve 3Pool"},
    {"addr": "0xdEf1C0ded9bec7F1a1670819833240f027b25EfF", "expected": "LOW",      "exp_max": 20, "label": "0x Exchange Proxy"},
    {"addr": "0xBA12222222228d8Ba445958a75a0704d566BF2C8", "expected": "LOW",      "exp_max": 20, "label": "Balancer V2 Vault"},
    {"addr": "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", "expected": "LOW",      "exp_max": 20, "label": "Uniswap Universal Router"},
    {"addr": "0x111111125421cA6dc452d289314280a0f8842A65", "expected": "LOW",      "exp_max": 20, "label": "1inch V6 Router"},

    # ── STABLECOINS (Expected: LOW 0-10) ──────────────────────────
    {"addr": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "expected": "LOW",      "exp_max": 10, "label": "WETH (Wrapped Ether)"},
    {"addr": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "expected": "LOW",      "exp_max": 10, "label": "USDC"},
    {"addr": "0xdAC17F958D2ee523a2206206994597C13D831ec7", "expected": "LOW",      "exp_max": 10, "label": "USDT (Tether)"},

    # ── ORACLES / INFRASTRUCTURE (Expected: LOW 0-10) ─────────────
    {"addr": "0x514910771AF9Ca656af840dff83E8264EcF986CA", "expected": "LOW",      "exp_max": 10, "label": "Chainlink (LINK Token)"},

    # ── BRIDGES (Expected: MEDIUM 25-45 due to inherent risk) ─────
    {"addr": "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf", "expected": "MEDIUM",   "exp_max": 50, "label": "Polygon Bridge"},
    {"addr": "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1", "expected": "MEDIUM",   "exp_max": 50, "label": "Optimism Bridge"},
]


def clear_cache_for_test_addresses():
    """Delete cached InvestigationLog entries for test addresses so we get fresh scores."""
    print("\n🗑️  Clearing cached scan results for test addresses...")
    try:
        # Direct DB access to clear cache
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from database.db import SessionLocal
        from database.models import InvestigationLog
        
        db = SessionLocal()
        all_addrs = [t["addr"].lower() for t in WALLET_TESTS + CONTRACT_TESTS]
        
        deleted = 0
        for addr in all_addrs:
            count = db.query(InvestigationLog).filter(
                InvestigationLog.entity_address.ilike(addr)
            ).delete(synchronize_session=False)
            deleted += count
        
        db.commit()
        db.close()
        print(f"   Cleared {deleted} cached entries across {len(all_addrs)} addresses")
        return True
    except Exception as e:
        print(f"   ⚠️ Cache clearing failed: {e}")
        print("   Proceeding with API scans (may return cached results)")
        return False


def scan_wallet(addr, label, idx, total):
    """Scan a single wallet via API and return results."""
    print(f"\n   [{idx}/{total}] 🔍 Scanning wallet: {label}")
    print(f"            Address: {addr[:12]}...{addr[-6:]}")
    try:
        start = time.time()
        res = requests.post(f"{API}/scan/wallet", 
                          json={"address": addr}, timeout=120)
        elapsed = time.time() - start
        
        if res.status_code != 200:
            print(f"            ❌ HTTP {res.status_code}: {res.text[:100]}")
            return None
            
        data = res.json()
        score = data.get("risk", {}).get("score", -1)
        label_result = data.get("risk", {}).get("label", "?")
        entity_class = data.get("entity", {}).get("class", "?")
        
        print(f"            ✅ Score: {score}/100 ({label_result}) | Class: {entity_class} | {elapsed:.1f}s")
        return {
            "score": score,
            "label": label_result,
            "entity_class": entity_class,
            "l1": data.get("risk", {}).get("layers", {}).get("L1", "?"),
            "l2": data.get("risk", {}).get("layers", {}).get("L2", "?"),
            "l3": data.get("risk", {}).get("layers", {}).get("L3", "?"),
            "l4": data.get("risk", {}).get("layers", {}).get("L4", "?"),
            "l5": data.get("risk", {}).get("layers", {}).get("L5", "?"),
            "class_modifier": data.get("entity", {}).get("classModifier", "?"),
            "elapsed": round(elapsed, 1),
        }
    except requests.exceptions.ConnectionError:
        print(f"            ❌ Connection refused — is the backend running?")
        return None
    except Exception as e:
        print(f"            ❌ Error: {e}")
        return None


def scan_contract(addr, label, idx, total):
    """Scan a single contract via API and return results."""
    print(f"\n   [{idx}/{total}] 🔬 Scanning contract: {label}")
    print(f"            Address: {addr[:12]}...{addr[-6:]}")
    try:
        start = time.time()
        res = requests.post(f"{API}/scan/contract", 
                          json={"address": addr}, timeout=120)
        elapsed = time.time() - start
        
        if res.status_code != 200:
            print(f"            ❌ HTTP {res.status_code}: {res.text[:100]}")
            return None
            
        data = res.json()
        score = data.get("risk", {}).get("score", -1)
        label_result = data.get("risk", {}).get("label", "?")
        proto_cat = data.get("identity", {}).get("protocolCategory", "?")
        
        axes = data.get("risk", {}).get("axes", {})
        print(f"            ✅ Score: {score}/100 ({label_result}) | Protocol: {proto_cat} | {elapsed:.1f}s")
        return {
            "score": score,
            "label": label_result,
            "entity_class": proto_cat,
            "a1": axes.get("A1", "?"),
            "a2": axes.get("A2", "?"),
            "a3": axes.get("A3", "?"),
            "a4": axes.get("A4", "?"),
            "a5": axes.get("A5", "?"),
            "multiplier": data.get("risk", {}).get("multiplier", "?"),
            "elapsed": round(elapsed, 1),
        }
    except requests.exceptions.ConnectionError:
        print(f"            ❌ Connection refused — is the backend running?")
        return None
    except Exception as e:
        print(f"            ❌ Error: {e}")
        return None


def analyze_results(wallet_results, contract_results):
    """Comprehensive analysis of test results."""
    
    all_results = wallet_results + contract_results
    
    print("\n")
    print("=" * 110)
    print("  AXON FORENSIC ENGINE — SCORING VALIDATION REPORT")
    print("=" * 110)
    
    # ── Wallet Results Table ──
    print("\n┌─ WALLET SCORING RESULTS ─────────────────────────────────────────────────────────────────────────────────┐")
    print(f"│ {'#':>2} │ {'Label':<42} │ {'Expected':>8} │ {'Actual':>6} │ {'Class':>6} │ {'Entity Class':<22} │ {'✓/✗':>3} │")
    print("├" + "─" * 108 + "┤")
    
    correct_w = 0
    total_w = 0
    for r in wallet_results:
        total_w += 1
        score = r.get("actual_score", -1)
        exp = r["expected"]
        exp_max = r["exp_max"]
        
        # Determine if score is within expected range
        if exp == "LOW":
            ok = score <= 39
        elif exp == "MEDIUM":
            ok = 40 <= score <= 59
        elif exp == "HIGH":
            ok = 60 <= score <= 79
        else:  # CRITICAL
            ok = score >= 80
            
        if ok:
            correct_w += 1
            mark = "✅"
        else:
            mark = "❌"
        
        actual_label = r.get("actual_label", "?")
        entity_class = r.get("entity_class", "?")[:22]
        
        print(f"│ {total_w:>2} │ {r['label']:<42} │ {exp:>8} │ {score:>6} │ {actual_label:>6} │ {entity_class:<22} │ {mark:>3} │")
    
    print("└" + "─" * 108 + "┘")
    
    # ── Contract Results Table ──
    print("\n┌─ CONTRACT SCORING RESULTS ───────────────────────────────────────────────────────────────────────────────┐")
    print(f"│ {'#':>2} │ {'Label':<42} │ {'Expected':>8} │ {'Actual':>6} │ {'Class':>6} │ {'Protocol Category':<22} │ {'✓/✗':>3} │")
    print("├" + "─" * 108 + "┤")
    
    correct_c = 0
    total_c = 0
    for r in contract_results:
        total_c += 1
        score = r.get("actual_score", -1)
        exp = r["expected"]
        
        if exp == "LOW":
            ok = score <= 39
        elif exp == "MEDIUM":
            ok = 40 <= score <= 59
        elif exp == "HIGH":
            ok = 60 <= score <= 79
        else:
            ok = score >= 80
            
        if ok:
            correct_c += 1
            mark = "✅"
        else:
            mark = "❌"
        
        actual_label = r.get("actual_label", "?")
        entity_class = r.get("entity_class", "?")[:22]
        
        print(f"│ {total_c:>2} │ {r['label']:<42} │ {exp:>8} │ {score:>6} │ {actual_label:>6} │ {entity_class:<22} │ {mark:>3} │")
    
    print("└" + "─" * 108 + "┘")
    
    # ── Summary Statistics ──
    total = total_w + total_c
    correct = correct_w + correct_c
    accuracy = (correct / total * 100) if total > 0 else 0
    
    print(f"\n{'=' * 60}")
    print(f"  ACCURACY SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Wallets:   {correct_w}/{total_w} correct ({correct_w/total_w*100:.0f}%)" if total_w else "")
    print(f"  Contracts: {correct_c}/{total_c} correct ({correct_c/total_c*100:.0f}%)" if total_c else "")
    print(f"  OVERALL:   {correct}/{total} correct ({accuracy:.0f}%)")
    print(f"{'=' * 60}")
    
    # ── Misclassification Analysis ──
    misclassified = [r for r in all_results if not r.get("correct", False)]
    if misclassified:
        print(f"\n⚠️  MISCLASSIFIED ENTITIES ({len(misclassified)}):")
        for r in misclassified:
            score = r.get("actual_score", -1)
            print(f"   • {r['label']}: Expected {r['expected']}, got {score}/100 ({r.get('actual_label', '?')})")
            if score > r.get("exp_max", 100):
                print(f"     → Score TOO HIGH by {score - r['exp_max']} points")
            elif r["expected"] in ("HIGH", "CRITICAL") and score < 60:
                print(f"     → Score TOO LOW — should be ≥60 for {r['expected']}")
    
    # ── Distribution Analysis ──
    scores = [r.get("actual_score", -1) for r in all_results if r.get("actual_score", -1) >= 0]
    if scores:
        print(f"\n📊 SCORE DISTRIBUTION:")
        low = sum(1 for s in scores if s < 40)
        med = sum(1 for s in scores if 40 <= s < 60)
        high = sum(1 for s in scores if 60 <= s < 80)
        crit = sum(1 for s in scores if s >= 80)
        print(f"   LOW    (0-39):   {'█' * low} {low}")
        print(f"   MEDIUM (40-59):  {'█' * med} {med}")
        print(f"   HIGH   (60-79):  {'█' * high} {high}")
        print(f"   CRITICAL(80+):   {'█' * crit} {crit}")
    
    return accuracy


def main():
    print("=" * 60)
    print("  AXON FORENSIC ENGINE — SCORING VALIDATION TEST")
    print("  50 addresses · All risk levels · Fresh scans")
    print("=" * 60)
    
    # Step 0: Check backend
    print("\n🔌 Checking backend connectivity...")
    try:
        res = requests.get(f"{API}/health/apis", timeout=5)
        print(f"   ✅ Backend is running (status: {res.status_code})")
    except:
        print("   ❌ Backend not reachable at port 8001!")
        print("   Please start the backend: cd backend && python -m uvicorn main:app --reload --port 8001")
        sys.exit(1)
    
    # Step 1: Clear cache
    clear_cache_for_test_addresses()
    
    # Step 2: Run wallet scans
    total_tests = len(WALLET_TESTS) + len(CONTRACT_TESTS)
    print(f"\n🚀 Starting {total_tests} scans ({len(WALLET_TESTS)} wallets + {len(CONTRACT_TESTS)} contracts)")
    print(f"   Estimated time: {total_tests * 12}–{total_tests * 25} seconds")
    
    wallet_results = []
    for i, test in enumerate(WALLET_TESTS, 1):
        result = scan_wallet(test["addr"], test["label"], i, len(WALLET_TESTS))
        
        entry = {**test}
        if result:
            entry["actual_score"] = result["score"]
            entry["actual_label"] = result["label"]
            entry["entity_class"] = result["entity_class"]
            entry["scan_data"] = result
            
            # Check correctness
            score = result["score"]
            exp = test["expected"]
            if exp == "LOW":
                entry["correct"] = score <= 39
            elif exp == "MEDIUM":
                entry["correct"] = 40 <= score <= 59
            elif exp == "HIGH":
                entry["correct"] = 60 <= score <= 79
            else:
                entry["correct"] = score >= 80
        else:
            entry["actual_score"] = -1
            entry["actual_label"] = "FAIL"
            entry["entity_class"] = "FAIL"
            entry["correct"] = False
        
        wallet_results.append(entry)
        time.sleep(1.5)  # Rate limit protection
    
    # Step 3: Run contract scans
    contract_results = []
    for i, test in enumerate(CONTRACT_TESTS, 1):
        result = scan_contract(test["addr"], test["label"], i, len(CONTRACT_TESTS))
        
        entry = {**test}
        if result:
            entry["actual_score"] = result["score"]
            entry["actual_label"] = result["label"]
            entry["entity_class"] = result["entity_class"]
            entry["scan_data"] = result
            
            score = result["score"]
            exp = test["expected"]
            if exp == "LOW":
                entry["correct"] = score <= 39
            elif exp == "MEDIUM":
                entry["correct"] = 40 <= score <= 59
            elif exp == "HIGH":
                entry["correct"] = 60 <= score <= 79
            else:
                entry["correct"] = score >= 80
        else:
            entry["actual_score"] = -1
            entry["actual_label"] = "FAIL"
            entry["entity_class"] = "FAIL"
            entry["correct"] = False
        
        contract_results.append(entry)
        time.sleep(1.5)
    
    # Step 4: Analyze
    accuracy = analyze_results(wallet_results, contract_results)
    
    # Step 5: Save results
    output = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_tests": total_tests,
        "accuracy": accuracy,
        "wallet_results": [{k: v for k, v in r.items() if k != "scan_data"} for r in wallet_results],
        "contract_results": [{k: v for k, v in r.items() if k != "scan_data"} for r in contract_results],
    }
    
    output_path = os.path.join(os.path.dirname(__file__), "scoring_validation_results.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n💾 Full results saved to: {output_path}")
    
    return accuracy


if __name__ == "__main__":
    main()
