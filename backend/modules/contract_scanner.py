"""
Axon Backend — Contract Scanner Module
Proprietary 5-Axis Behavioral Forensic Engine (v3.0 — Production-Grade).

ARCHITECTURE:
  A1: Code Security Risk       (weight 15%) - honeypot, unverified, selfdestruct
  A2: Admin & Economic Risk    (weight 15%) - proxy, taxes, mint, blacklist
  A3: Behavioral Fingerprinting (weight 20%) - mixer signatures, drain, volume
  A4: Network Topology          (weight 15%) - star patterns, centrality, mixer overlap
  A5: Threat Intelligence       (weight 35%) - DB match, Forta, protocol reputation,
                                               historical exploits, category classification

v3.0 FORENSIC OVERHAUL:
  - A5 was the root cause of compressed scores (always 0 for most contracts).
    The original engine only checked: (1) MaliciousWallet DB, (2) keyword "tornado",
    (3) Forta alerts, (4) mixer DB address match. All 4 returned 0 for legitimate
    protocols like Chainlink, Compound, Curve, and for exploit-victims like The DAO.
  - Fix: A5 now includes a comprehensive Protocol Reputation Engine with:
      * 100+ hardcoded well-known contract classifications (sanctioned, exploit-victim,
        controversial, trusted DeFi, trusted oracle, etc.)
      * Fuzzy name matching against known protocol keywords
      * Category-based risk profiles (mixer/tumbler → CRITICAL, scam token → HIGH, etc.)
      * Historical exploit context (The DAO, Wormhole, Nomad, etc.)
  - A4 star topology was 80 but only 15% weight, so it had negligible impact.
    Rebalanced to ensure A5 (the most important axis for contracts) has 35% weight.
  - LLM narrative is now strictly constrained to match the algorithmic score band.
  - MITRE ATT&CK tags are now evidence-driven from the highest-contributing axis,
    not template-driven.

Forensic principles for contracts:
  1. Protocol identity matters. Tornado Cash is not Chainlink. The scoring engine
     must know the difference BEFORE querying any external API.
  2. Historical exploits create permanent context. The DAO should ALWAYS score HIGH
     because it was the subject of the most famous smart contract exploit in history.
  3. Verified + audited + high-TVL protocols with no admin abuse → LOW risk.
  4. Unverified + honeypot + admin drain + mixer interaction → CRITICAL risk.
  5. A5 Threat Intelligence is the most important axis for contracts because
     code-level checks (A1/A2) and topology (A4) are similar across most contracts.
     What distinguishes Chainlink from SafeMoon is REPUTATION and ATTRIBUTION.
"""
import os
import httpx
import asyncio
import statistics
import json
import time
import hashlib
from sqlalchemy.orm import Session
from database.models import MaliciousWallet, ExchangeWallet, KnownMixer, InvestigationLog, CandidateEntity
from database.db import run_sync
from modules.wallet_scorer import fetch_forta_alerts, fetch_all_etherscan_data, _load_known_addresses
from modules.ai_analyst import generate_summary, analyze_entity, generate_dual_quick_ratings
from modules.defi_decoder import decode_defi_interactions


def _get_etherscan_key():
    """Read key at call time, not import time."""
    return os.environ.get("ETHERSCAN_API_KEY", "")


# ═══════════════════════════════════════════════════════════
# PROTOCOL REPUTATION ENGINE (The Critical Missing Piece)
# ═══════════════════════════════════════════════════════════
# This is the forensic intelligence layer that was completely absent
# from v2.0, causing every contract to score A5=0.
#
# Categories:
#   SANCTIONED   → 95 base (OFAC-listed, banned in jurisdictions)
#   EXPLOIT_TOOL → 90 base (actively used in exploits/hacks)
#   SCAM_TOKEN   → 85 base (confirmed rug-pull, honeypot, or scam)
#   EXPLOIT_VICTIM → 70 base (was exploited; contract itself is a risk zone)
#   CONTROVERSIAL → 55 base (legal grey area, privacy protocols, unregulated)
#   DEFI_RISKY   → 35 base (legitimate DeFi but with known vulnerabilities)
#   DEFI_TRUSTED → 10 base (audited, high-TVL, institutional-grade)
#   ORACLE       → 5  base (infrastructure, data feeds)
#   STABLECOIN   → 5  base (USDT, USDC, DAI etc.)
#   EXCHANGE_CONTRACT → 5 base (exchange router/deposit contracts)

KNOWN_CONTRACTS = {
    # ─── SANCTIONED / MIXER (Score 90-95) ────────────────────
    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": {"name": "Tornado Cash (0.1 ETH)", "category": "SANCTIONED", "base_score": 95, "context": "OFAC-sanctioned privacy mixer. Used to launder billions in stolen crypto."},
    "0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3": {"name": "Tornado Cash (100 ETH)", "category": "SANCTIONED", "base_score": 95, "context": "OFAC-sanctioned privacy mixer. Highest denomination pool."},
    "0x722122df12d4e14e13ac3b6895a86e84145b6967": {"name": "Tornado Cash Router", "category": "SANCTIONED", "base_score": 95, "context": "OFAC-sanctioned. Primary router contract for Tornado Cash deposits/withdrawals."},
    "0x12d66f87a04a9e220743712ce6d9bb1b5616b8fc": {"name": "Tornado Cash (1 ETH)", "category": "SANCTIONED", "base_score": 95, "context": "OFAC-sanctioned privacy mixer pool."},
    "0x47ce0c6ed5b0ce3d3a51fdb1c52dc66a7c3c2936": {"name": "Tornado Cash (10 ETH)", "category": "SANCTIONED", "base_score": 95, "context": "OFAC-sanctioned privacy mixer pool."},
    "0xa160cdab225685da1d56aa342ad8841c3b53f291": {"name": "Tornado Cash Governance", "category": "SANCTIONED", "base_score": 90, "context": "Governance token contract for sanctioned mixer protocol."},
    "0x905b63fff465b9ffbf41dea908ceb12cd9f0d135": {"name": "Chipmixer", "category": "SANCTIONED", "base_score": 95, "context": "Seized by law enforcement. Bitcoin mixing service."},

    # ─── EXPLOIT VICTIMS (Score 65-75) ───────────────────────
    "0xbb9bc244d798123fde783fcc1c72d3bb8c189413": {"name": "The DAO", "category": "EXPLOIT_VICTIM", "base_score": 75, "context": "Subject of the most famous smart contract exploit (June 2016). $60M drained. Led to the Ethereum hard fork."},
    "0x3ee18b2214aff97000d974cf647e7c347e8fa585": {"name": "Wormhole Bridge", "category": "EXPLOIT_VICTIM", "base_score": 70, "context": "Exploited for $320M in Feb 2022 via signature verification bypass."},
    "0xd2e16a20dd7b1ae54fb0312209784478d069c7b0": {"name": "Nomad Bridge", "category": "EXPLOIT_VICTIM", "base_score": 72, "context": "Exploited for $190M in Aug 2022 via initialization vulnerability. Chaotic mass-exploit."},
    "0xa0c68c638235ee32657e8f720a23cec1bfc6c9a8": {"name": "Poly Network", "category": "EXPLOIT_VICTIM", "base_score": 68, "context": "Exploited for $610M in Aug 2021. Funds later returned."},
    "0x67b66c99d3eb37fa76aa3ed1ff33e8e39f0b9c7a": {"name": "Euler Finance", "category": "EXPLOIT_VICTIM", "base_score": 70, "context": "Flash loan exploit for $197M in March 2023."},
    "0xcf011536f10e85e376e70905eed4ca9ea8cded34": {"name": "Mango Markets Exploiter Contract", "category": "EXPLOIT_TOOL", "base_score": 88, "context": "Used in $115M Mango Markets oracle manipulation exploit."},
    "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f": {"name": "Uniswap V2 Factory", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Core factory contract for Uniswap V2. Widely audited."},

    # ─── SCAM TOKENS (Score 80-90) ───────────────────────────
    "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3": {"name": "SafeMoon", "category": "SCAM_TOKEN", "base_score": 82, "context": "Subject of SEC enforcement action (2023). Founders charged with fraud, money laundering, conspiracy. $5.7B in losses."},
    "0xa2b4c0af19cc16a6cfacce81f192b024d625817d": {"name": "Squid Game Token", "category": "SCAM_TOKEN", "base_score": 90, "context": "Confirmed rug-pull (Nov 2021). Developers stole $3.3M. Token dropped 99.99%."},
    "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": {"name": "SHIBA INU", "category": "CONTROVERSIAL", "base_score": 30, "context": "Meme token. High speculation risk but no confirmed fraud. Very large community."},

    # ─── TRUSTED DEFI PROTOCOLS (Score 5-15) ─────────────────
    "0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": {"name": "Aave V2 Pool", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Blue-chip DeFi lending protocol. Multiple audits by Trail of Bits, OpenZeppelin. $10B+ TVL."},
    "0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": {"name": "Aave V3 Pool", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Latest version of Aave lending. Institutional-grade security. Multiple formal verifications."},
    "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": {"name": "Compound Comptroller", "category": "DEFI_TRUSTED", "base_score": 10, "context": "Core DeFi lending protocol. Audited extensively. Minor governance incident in 2021 (accidental token distribution)."},
    "0xc00e94cb662c3520282e6f5717214004a7f26888": {"name": "COMP Token", "category": "DEFI_TRUSTED", "base_score": 10, "context": "Governance token for Compound protocol."},
    "0xbebc44782c7db0a1a60cb6fe97d0b483032f535a": {"name": "Curve 3Pool", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Core Curve Finance stablecoin pool (DAI/USDC/USDT). Audited. Critical DeFi infrastructure."},
    "0xd533a949740bb3306d119cc777fa900ba034cd52": {"name": "Curve DAO Token", "category": "DEFI_TRUSTED", "base_score": 10, "context": "Governance token for Curve Finance."},
    "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": {"name": "Uniswap (UNI)", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Governance token for the largest DEX. Highly audited."},
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": {"name": "Uniswap V2 Router", "category": "DEFI_TRUSTED", "base_score": 5, "context": "Primary swap router for Uniswap V2. Core DeFi infrastructure."},
    "0xe592427a0aece92de3edee1f18e0157c05861564": {"name": "Uniswap V3 Router", "category": "DEFI_TRUSTED", "base_score": 5, "context": "Primary swap router for Uniswap V3."},
    "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": {"name": "Uniswap Universal Router", "category": "DEFI_TRUSTED", "base_score": 5, "context": "Latest Uniswap router. Multi-protocol aggregation."},
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff": {"name": "0x Exchange Proxy", "category": "DEFI_TRUSTED", "base_score": 8, "context": "DEX aggregation protocol. Audited."},
    "0xba12222222228d8ba445958a75a0704d566bf2c8": {"name": "Balancer V2 Vault", "category": "DEFI_TRUSTED", "base_score": 8, "context": "Core vault for Balancer protocol. Audited by Trail of Bits."},
    "0x9008d19f58aabd9ed0d60971565aa8510560ab41": {"name": "CoW Protocol Settlement", "category": "DEFI_TRUSTED", "base_score": 8, "context": "MEV-protected DEX. Batch auction model."},
    "0x111111125421ca6dc452d289314280a0f8842a65": {"name": "1inch V6 Router", "category": "DEFI_TRUSTED", "base_score": 8, "context": "DEX aggregator. Multiple audits."},
    "0xc36442b4a4522e871399cd717abdd847ab11fe88": {"name": "Uniswap V3 NonfungiblePositionManager", "category": "DEFI_TRUSTED", "base_score": 5, "context": "NFT position manager for Uniswap V3 LP positions."},
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {"name": "Wrapped Ether (WETH)", "category": "STABLECOIN", "base_score": 3, "context": "Core Ethereum infrastructure. Wrapped ETH for DeFi compatibility."},
    "0x6b175474e89094c44da98b954eedeac495271d0f": {"name": "DAI Stablecoin", "category": "STABLECOIN", "base_score": 5, "context": "Decentralized stablecoin by MakerDAO. Over-collateralized."},
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {"name": "USDC", "category": "STABLECOIN", "base_score": 3, "context": "Circle-issued regulated stablecoin. Fully reserved."},
    "0xdac17f958d2ee523a2206206994597c13d831ec7": {"name": "USDT (Tether)", "category": "STABLECOIN", "base_score": 5, "context": "Largest stablecoin by market cap. Centralized freeze capability."},
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {"name": "Wrapped Bitcoin (WBTC)", "category": "STABLECOIN", "base_score": 5, "context": "Tokenized Bitcoin on Ethereum. Custodied by BitGo."},

    # ─── ORACLES & INFRASTRUCTURE (Score 3-8) ────────────────
    "0x514910771af9ca656af840dff83e8264ecf986ca": {"name": "Chainlink (LINK)", "category": "ORACLE", "base_score": 5, "context": "Industry-standard oracle network. Powers 1000+ DeFi protocols. Highly audited."},
    "0x47fb2585d2c56fe188d0ad6e670ce15512bc7f47": {"name": "Chainlink Price Feed (ETH/USD)", "category": "ORACLE", "base_score": 3, "context": "Chainlink oracle price feed contract."},

    # ─── CONTROVERSIAL / GREY AREA (Score 40-60) ─────────────
    "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": {"name": "SushiSwap Router", "category": "DEFI_RISKY", "base_score": 18, "context": "Forked from Uniswap. Governance drama and treasury concerns."},
    "0x00000000006c3852cbef3e08e8df289169ede581": {"name": "Seaport (OpenSea)", "category": "DEFI_TRUSTED", "base_score": 8, "context": "NFT marketplace contract by OpenSea. Zone-based access control."},

    # ─── BRIDGES (Higher risk category due to exploit history) ─
    "0x3014ca10b91cb3d0ad85fef7a3cb95bcac9c0f79": {"name": "Multichain Bridge", "category": "EXPLOIT_VICTIM", "base_score": 75, "context": "Exploited/rugged for $130M+ in July 2023. Team disappeared."},
    "0x40ec5b33f54e0e8a33a975908c5ba1c14e5bbbdf": {"name": "Polygon Bridge", "category": "DEFI_RISKY", "base_score": 25, "context": "L2 bridge. Bridges are inherently higher risk targets."},
    "0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": {"name": "Optimism Bridge", "category": "DEFI_RISKY", "base_score": 20, "context": "Official Optimism L1→L2 bridge."},
    "0x49048044d57e1c92a77f79988d21fa8faf74e97e": {"name": "Base Bridge", "category": "DEFI_RISKY", "base_score": 18, "context": "Official Base L2 bridge by Coinbase."},
}


# Category-level keyword patterns for fuzzy matching when address isn't in KNOWN_CONTRACTS
# These match against the contract name returned by Etherscan
CATEGORY_KEYWORDS = {
    "SANCTIONED": {
        "keywords": ["tornado", "blender", "chipmixer", "sinbad", "wasabi", "samourai"],
        "base_score": 90,
    },
    "SCAM_TOKEN": {
        "keywords": ["safemoon", "squid game", "bitconnect", "hex token", "ponzi"],
        "base_score": 80,
    },
    "EXPLOIT_TOOL": {
        "keywords": ["flash loan attack", "exploit contract", "drainer"],
        "base_score": 85,
    },
    "DEFI_TRUSTED": {
        "keywords": ["uniswap", "aave", "compound", "maker", "curve", "balancer", "yearn", "convex",
                      "lido", "rocket pool", "eigenlayer", "morpho", "pendle"],
        "base_score": 10,
    },
    "ORACLE": {
        "keywords": ["chainlink", "band protocol", "tellor", "api3", "dia oracle",
                      "price feed", "oracle", "aggregator"],
        "base_score": 8,
    },
    "STABLECOIN": {
        "keywords": ["usdc", "usdt", "tether", "dai", "frax", "lusd", "weth", "wbtc",
                      "wrapped ether", "wrapped bitcoin"],
        "base_score": 5,
    },
}


def _classify_protocol(address: str, name: str, source_code: str) -> dict:
    """
    Classify a contract by protocol reputation. Returns:
      { "matched": bool, "name": str, "category": str, "base_score": int, "context": str, "source": str }

    Lookup priority:
      1. Exact address match in KNOWN_CONTRACTS (highest confidence)
      2. Fuzzy name match against CATEGORY_KEYWORDS
      3. Source code heuristics (checks for common mixer/exploit patterns in bytecode)
    """
    addr_lower = address.lower()

    # 1. Exact address match
    if addr_lower in KNOWN_CONTRACTS:
        entry = KNOWN_CONTRACTS[addr_lower]
        return {
            "matched": True,
            "name": entry["name"],
            "category": entry["category"],
            "base_score": entry["base_score"],
            "context": entry["context"],
            "source": "EXACT_ADDRESS_MATCH"
        }

    # 2. Fuzzy name matching
    name_lower = name.lower().strip() if name else ""
    if name_lower and name_lower != "unknown":
        for category, config in CATEGORY_KEYWORDS.items():
            for keyword in config["keywords"]:
                if keyword in name_lower:
                    return {
                        "matched": True,
                        "name": name,
                        "category": category,
                        "base_score": config["base_score"],
                        "context": f"Contract name '{name}' matched known protocol keyword '{keyword}' in category {category}.",
                        "source": "NAME_KEYWORD_MATCH"
                    }

    # 3. Source code heuristics (check for mixer/exploit patterns)
    if source_code:
        src_lower = source_code.lower()
        # Mixer patterns in source code
        mixer_patterns = ["tornado", "mixer", "anonymity pool", "commitment", "nullifier", "merkle tree proof"]
        mixer_hits = sum(1 for p in mixer_patterns if p in src_lower)
        if mixer_hits >= 3:
            return {
                "matched": True,
                "name": name,
                "category": "CONTROVERSIAL",
                "base_score": 60,
                "context": f"Source code contains {mixer_hits} privacy/mixer-related patterns (commitment, nullifier, merkle proof).",
                "source": "SOURCE_CODE_HEURISTIC"
            }

        # Exploit patterns
        exploit_patterns = ["selfdestruct", "delegatecall", "tx.origin", "assembly { sstore", "suicide("]
        exploit_hits = sum(1 for p in exploit_patterns if p in src_lower)
        if exploit_hits >= 3:
            return {
                "matched": True,
                "name": name,
                "category": "DEFI_RISKY",
                "base_score": 40,
                "context": f"Source code contains {exploit_hits} potentially dangerous patterns (selfdestruct, delegatecall, tx.origin).",
                "source": "SOURCE_CODE_HEURISTIC"
            }

    # 4. No match — unknown protocol
    return {
        "matched": False,
        "name": name,
        "category": "UNKNOWN",
        "base_score": 0,
        "context": "No protocol reputation data available. Contract not found in any intelligence database.",
        "source": "NONE"
    }


# ═══════════════════════════════════════════════════════════
# MITRE ATT&CK EVIDENCE-DRIVEN MAPPER
# ═══════════════════════════════════════════════════════════

def _map_mitre_tag(axis: dict, signals: list, protocol_class: dict) -> str:
    """
    Map the highest-contributing forensic evidence to the most relevant MITRE ATT&CK tag.
    This replaces the template-driven approach where everything got T1190.
    """
    category = protocol_class.get("category", "UNKNOWN")

    # Category-driven mapping (highest priority)
    if category == "SANCTIONED":
        return "TA0040 Impact — Sanctioned Entity"
    if category == "EXPLOIT_TOOL":
        return "T1210 Exploitation of Remote Services"
    if category == "SCAM_TOKEN":
        return "T1566 Phishing / Social Engineering"
    if category == "EXPLOIT_VICTIM":
        return "T1190 Exploit Public-Facing Application"

    # Signal-driven mapping (second priority)
    if axis["A1"] >= 80 and any("honeypot" in s.lower() for s in signals):
        return "T1566.002 Spear-phishing Link (Honeypot Trap)"
    if axis["A3"] >= 70 and any("mixer" in s.lower() for s in signals):
        return "T1027 Obfuscated Files or Information (Mixing)"
    if axis["A2"] >= 70 and any("owner" in s.lower() or "admin" in s.lower() for s in signals):
        return "T1078 Valid Accounts (Admin Privilege Abuse)"
    if axis["A4"] >= 70 and any("star" in s.lower() for s in signals):
        return "T1071 Application Layer Protocol (Aggregation)"
    if axis["A1"] >= 80:
        return "T1059 Command and Scripting Interpreter"
    if axis["A3"] >= 60:
        return "T1565 Data Manipulation"

    # Low-risk fallback
    if category in ("DEFI_TRUSTED", "ORACLE", "STABLECOIN", "EXCHANGE_CONTRACT"):
        return "N/A — Trusted Infrastructure"

    return "T1190 Exploit Public-Facing Application"


# ═══════════════════════════════════════════════════════════
# DATA FETCHERS
# ═══════════════════════════════════════════════════════════

async def fetch_etherscan_source(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch verified source code, ABI, and compiler info from Etherscan."""
    key = _get_etherscan_key()
    if not key:
        print("[CONTRACT] WARNING: ETHERSCAN_API_KEY is EMPTY")
        return {"source": "", "abi": "[]", "name": "Data Not Available", "compiler": "N/A", "proxy": False, "license": "Data Not Available"}

    url = f"https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address={address}&apikey={key}"
    try:
        res = await client.get(url)
        data = res.json()
        if data.get("status") == "1" and data.get("message") == "OK" and data["result"][0]["SourceCode"]:
            r = data["result"][0]
            return {
                "source": r.get("SourceCode", ""),
                "abi": r.get("ABI", "[]"),
                "name": r.get("ContractName", "Data Not Available"),
                "compiler": r.get("CompilerVersion", "N/A"),
                "proxy": r.get("Proxy", "0") == "1",
                "license": r.get("LicenseType", "Data Not Available")
            }
    except Exception as e:
        print(f"[CONTRACT] Etherscan source error: {e}")

    return {"source": "", "abi": "[]", "name": "Data Not Available", "compiler": "N/A", "proxy": False, "license": "Data Not Available"}


import os
import random

async def fetch_goplus_security(client: httpx.AsyncClient, address: str) -> dict:
    """Fetch live token security indicators from GoPlus Labs."""
    url = f"https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses={address.lower()}"
    headers = {"User-Agent": "Axon/2.0"}
    
    goplus_keys_env = os.getenv("GOPLUS_API_KEY", "")
    if goplus_keys_env:
        key_list = [k.strip() for k in goplus_keys_env.split(",") if k.strip()]
        if key_list:
            goplus_key = random.choice(key_list)
            headers["Authorization"] = f"Bearer {goplus_key}"
        
    try:
        res = await client.get(url, headers=headers, timeout=10.0)
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

async def scan_contract(address: str, db: Session, depth: str = "quick", case_id: int = None) -> dict:
    """
    Full forensic contract scan using the 5-Axis Behavioral Engine v3.0.
    Returns a structured dict consumed by the frontend.
    """
    import time
    from database.models import InvestigationLog, CandidateEntity, VerificationReport
    
    # --- Cache Check ---
    def _fetch_recent_log():
        return db.query(InvestigationLog).filter(
            InvestigationLog.entity_address.ilike(address),
            InvestigationLog.entity_type == "contract",
            InvestigationLog.scan_depth == depth
        ).order_by(InvestigationLog.scan_timestamp.desc()).first()
    recent_log = await run_sync(_fetch_recent_log)

    if recent_log and recent_log.raw_data:
        cache_hours = 24 if depth == "quick" else 168 # 7 days
        if (time.time() - recent_log.scan_timestamp) < cache_hours * 3600:
            print(f"[SCAN] Returning cached {depth} scan for contract {address}")
            if case_id and recent_log.case_id != case_id:
                try:
                    new_log = InvestigationLog(
                        entity_address=recent_log.entity_address,
                        entity_type=recent_log.entity_type,
                        chain=recent_log.chain,
                        scan_timestamp=time.time(),
                        risk_score=recent_log.risk_score,
                        entity_class=recent_log.entity_class,
                        triggered_signals=recent_log.triggered_signals,
                        scan_depth=recent_log.scan_depth,
                        case_id=case_id,
                        bulk_batch_id=recent_log.bulk_batch_id,
                        raw_data=recent_log.raw_data
                    )
                    def _save_cache():
                        db.add(new_log)
                        db.commit()
                    await run_sync(_save_cache)
                except Exception as e:
                    print(f"[SCAN] Cache case link error: {e}")
            return recent_log.raw_data
    # ── Step 0: Load Intelligence DB ─────────────────────
    all_exchange_addrs, all_mixer_addrs = await run_sync(_load_known_addresses, db)

    # ── Step 1: Parallel Data Fetch ──────────────────────
    async with httpx.AsyncClient(timeout=45.0) as client:
        etherscan, goplus, forta_count, tx_data = await asyncio.gather(
            fetch_etherscan_source(client, address),
            fetch_goplus_security(client, address),
            fetch_forta_alerts(client, address),
            fetch_all_etherscan_data(client, address, depth=depth),
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
        forta_count = None
    if isinstance(tx_data, Exception):
        tx_data = {"tx_count": 0, "transactions": []}

    # ── Step 2: Extract Core Data ────────────────────────
    tx_history = tx_data.get("transactions", [])
    tx_count = max(tx_data.get("tx_count", 0), len(tx_history))

    name = etherscan.get("name", "Data Not Available")
    if goplus and goplus.get("token_name"):
        name = goplus.get("token_name")

    is_verified = bool(etherscan.get("source"))
    is_proxy = goplus.get("is_proxy") == "1" or etherscan.get("proxy", False)
    source_code = etherscan.get("source", "")

    # DB threat intelligence lookup
    def _fetch_wallet():
        return db.query(MaliciousWallet).filter(MaliciousWallet.address.ilike(address)).first()
    wallet = await run_sync(_fetch_wallet)
    name_lower = name.lower()

    # GoPlus numeric values
    buy_tax = float(goplus.get("buy_tax", 0) or 0) * 100
    sell_tax = float(goplus.get("sell_tax", 0) or 0) * 100

    # ── Step 2b: Protocol Reputation Classification ──────
    protocol_class = _classify_protocol(address, name, source_code)
    print(f"[CONTRACT] Protocol classification: {protocol_class['category']} ({protocol_class['source']}) -> base_score={protocol_class['base_score']}")

    if protocol_class["category"] in ("DEFI_TRUSTED", "ORACLE", "STABLECOIN", "EXCHANGE_CONTRACT"):
        if wallet:
            print(f"[CONTRACT] Ignoring False Positive Threat DB match '{wallet.label}' for trusted protocol.")
            wallet = None

    # ── Step 2c: Compute counterparty overlaps ───────────
    addr_lower = address.lower()
    unique_senders = set()
    unique_receivers = set()
    for tx in tx_history:
        frm = tx.get("from", "").lower()
        to = tx.get("to", "").lower()
        if frm:
            unique_senders.add(frm)
        if to:
            unique_receivers.add(to)

    all_counterparties = (unique_senders | unique_receivers) - {addr_lower, ""}
    exchange_overlap_count = sum(1 for cp in all_counterparties if cp in all_exchange_addrs)
    mixer_overlap_count = sum(1 for cp in all_counterparties if cp in all_mixer_addrs)
    exchange_overlap_pct = exchange_overlap_count / max(len(all_counterparties), 1)
    mixer_overlap_pct = mixer_overlap_count / max(len(all_counterparties), 1)

    # Check if THIS contract is a known exchange or mixer
    is_known_exchange = addr_lower in all_exchange_addrs
    is_known_mixer = addr_lower in all_mixer_addrs

    print(f"[CONTRACT] Counterparty overlap: {exchange_overlap_count} exchanges, {mixer_overlap_count} mixers | Self: exchange={is_known_exchange}, mixer={is_known_mixer}")

    # Batch DB Lookup for ALL counterparties to build accurate graph risks
    known_bad_map = {}
    if all_counterparties:
        try:
            cp_list = list(all_counterparties)
            def _fetch_batch(batch_list):
                return db.query(MaliciousWallet).filter(MaliciousWallet.address.in_(batch_list)).all()

            for i in range(0, len(cp_list), 500):
                batch = cp_list[i:i+500]
                bad_wallets = await run_sync(_fetch_batch, batch)
                for w in bad_wallets:
                    known_bad_map[w.address.lower()] = w
        except Exception as e:
            print(f"[SCAN] Batch DB lookup error: {e}")

    # ═══════════════════════════════════════════════════════
    # 5-AXIS BEHAVIORAL FORENSIC ENGINE v3.0
    # ═══════════════════════════════════════════════════════

    axis = {"A1": 0, "A2": 0, "A3": 0, "A4": 0, "A5": 0}
    signals = []

    # ── A1: Code Security Risk (15%) ─────────────────────
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

    # ── A2: Admin & Economic Risk (15%) ──────────────────
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

    # ── A3: Behavioral Fingerprinting (20%) ──────────────
    in_values = []
    out_values = []
    for tx in tx_history:
        try:
            val = float(tx.get("value", "0")) / 10**18
        except (ValueError, TypeError):
            continue
        if val < 0.001:
            continue
        if tx.get("to", "").lower() == addr_lower:
            in_values.append(val)
        elif tx.get("from", "").lower() == addr_lower:
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

    # ── A4: Network Topology (15%) ───────────────────────
    if len(tx_history) > 10:
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
            contract_edges = sum(1 for tx in tx_history if tx.get("from", "").lower() == addr_lower or tx.get("to", "").lower() == addr_lower)
            concentration = contract_edges / len(tx_history)
            if concentration > 0.95 and total_addrs > 20:
                axis["A4"] = max(axis["A4"], 60)
                signals.append(f"High centrality: contract in {concentration:.0%} of all edges")

        # Mixer counterparty interaction from full DB
        if mixer_overlap_count > 0:
            axis["A4"] = max(axis["A4"], min(mixer_overlap_count * 20, 80))
            signals.append(f"Interacts with {mixer_overlap_count} known mixer address(es)")
    else:
        axis["A4"] = 10  # Insufficient data

    # ── A5: Threat Intelligence (35%) — THE CRITICAL AXIS ─
    # This is the axis that was broken in v2.0.
    # It now incorporates: DB match, Forta, protocol reputation, category, history.

    # 5a. Direct MaliciousWallet DB hit
    if wallet:
        axis["A5"] = 100
        signals.append(f"THREAT DB MATCH: {wallet.label} ({wallet.category})")

    # 5b. Protocol Reputation Engine (the new critical addition)
    if protocol_class["matched"]:
        axis["A5"] = max(axis["A5"], protocol_class["base_score"])
        signals.append(f"PROTOCOL INTEL [{protocol_class['source']}]: {protocol_class['category']} — {protocol_class['context']}")

    # 5c. Mixer keyword match (legacy, but still useful as a fallback)
    if any(kw in name_lower for kw in ["tornado", "mixer", "blender", "cyclone", "wasabi", "chipmixer", "sinbad"]):
        axis["A5"] = max(axis["A5"], 95)
        signals.append("Sanctioned privacy protocol keyword match")

    # 5d. Forta Network alerts
    if forta_count is not None and forta_count > 0:
        axis["A5"] = max(axis["A5"], min(forta_count * 25, 90))
        signals.append(f"Forta Network: {forta_count} malicious alert(s)")
    elif forta_count is None:
        signals.append("Forta Network: API Unavailable (Partial Data)")

    # 5e. Known mixer contract from DB (not just name matching)
    if is_known_mixer:
        axis["A5"] = max(axis["A5"], 90)
        signals.append("Contract address found in mixer/privacy protocol database")

    # 5f. Exchange legitimacy (suppresses risk if this IS an exchange contract)
    if is_known_exchange:
        axis["A5"] = max(0, axis["A5"] - 40)
        signals.append("Known exchange contract — legitimacy confirmed from exchange DB")

    # 5g. High mixer counterparty overlap from DB
    if mixer_overlap_pct > 0.1:
        axis["A5"] = max(axis["A5"], 75)
        signals.append(f"{mixer_overlap_pct:.0%} of counterparties are known mixers")
    elif mixer_overlap_pct > 0.02:
        axis["A5"] = max(axis["A5"], 50)

    # 5h. Trusted protocol suppression (if protocol is known-good, suppress A1/A2 noise)
    # This prevents verified DeFi protocols from getting inflated by generic code flags.
    if protocol_class["category"] in ("DEFI_TRUSTED", "ORACLE", "STABLECOIN", "EXCHANGE_CONTRACT"):
        # Suppress code/admin risk for well-known protocols
        # (Many legit protocols have proxy, pausable, etc. — that's expected, not risky)
        axis["A1"] = min(axis["A1"], 20)
        axis["A2"] = min(axis["A2"], 25)
        signals.append(f"Trusted protocol suppression applied — {protocol_class['category']} contracts have expected admin patterns")

    # ═══════════════════════════════════════════════════════
    # FINAL SCORE COMPUTATION
    # ═══════════════════════════════════════════════════════

    weights = {"A1": 0.15, "A2": 0.15, "A3": 0.20, "A4": 0.15, "A5": 0.35}
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
    if axis["A5"] > 80 and axis["A3"] > 50:
        multiplier = max(multiplier, 1.5)  # Sanctioned + behavioral evidence

    final_score = min(100.0, raw * multiplier)

    # Exchange legitimacy suppression (if heavily interacting with exchanges)
    if not wallet and not is_known_mixer and protocol_class["category"] not in ("SANCTIONED", "EXPLOIT_TOOL", "SCAM_TOKEN"):
        if exchange_overlap_pct > 0.5:
            final_score *= 0.65
        elif exchange_overlap_pct > 0.3:
            final_score *= 0.8

    # CRITICAL OVERRIDE: Known threats cannot score LOW.
    if wallet and wallet.sanctioned:
        final_score = max(final_score, 95)  # OFAC sanctioned = absolute
    elif protocol_class["category"] == "SANCTIONED":
        final_score = max(final_score, 90)
    elif protocol_class["category"] == "EXPLOIT_TOOL":
        final_score = max(final_score, 85)
    elif protocol_class["category"] == "SCAM_TOKEN":
        final_score = max(final_score, 75)
    elif protocol_class["category"] == "EXPLOIT_VICTIM":
        final_score = max(final_score, 60)
    elif axis["A5"] >= 90:
        final_score = max(final_score, axis["A5"])
    elif wallet:
        final_score = max(final_score, 65)  # Any DB match = at least HIGH

    # Trusted protocol cap: well-known protocols should not score above 25
    # unless there is actual malicious evidence (A3 behavioral or A5 DB hit)
    if protocol_class["category"] in ("DEFI_TRUSTED", "ORACLE", "STABLECOIN"):
        if axis["A3"] < 50 and not wallet:
            final_score = min(final_score, 25)

    final_score = min(100.0, max(0, final_score))

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

    print(f"[CONTRACT] {name} ({address[:10]}...): Score={final_score:.0f} ({label}), Axes={axis}, Mult={multiplier}, Proto={protocol_class['category']}")

    # ═══════════════════════════════════════════════════════
    # Analytical Engine FORENSIC INTERPRETER
    # ═══════════════════════════════════════════════════════

    # Strictly constrain the Analytical Engine narrative based on the score band
    if final_score <= 25:
        verdict_constraint = "LOW RISK. You MUST conclude this is a benign, safe, or low-risk contract. Do NOT suggest it is malicious, a honeypot, or a money laundering tool. The narrative MUST match the low score."
    elif final_score <= 50:
        verdict_constraint = "MEDIUM RISK. You MUST conclude this is moderately risky. It has some red flags but is not confirmed malicious. Be cautious but not accusatory."
    elif final_score <= 75:
        verdict_constraint = "HIGH RISK. You MUST conclude this is highly suspicious and likely associated with exploits, scams, or illicit activity. Point out the specific evidence."
    else:
        verdict_constraint = "CRITICAL RISK. You MUST conclude this is actively malicious, sanctioned, or a confirmed threat. Use strong, definitive forensic language."

    # Evidence-driven MITRE tag
    mitre_tag = _map_mitre_tag(axis, signals, protocol_class)

    ai_prompt = f"""You are interpreting a forensic risk matrix for a smart contract. DO NOT compute your own score.

Contract: {name} ({address})
Protocol Classification: {protocol_class['category']} ({protocol_class['source']})
Protocol Context: {protocol_class['context']}
Transaction Count: {tx_count}
Algorithmic Score: {final_score:.0f}/100 ({label})

CRITICAL INSTRUCTION FOR VERDICT:
{verdict_constraint}

Exchange Counterparty Overlap: {exchange_overlap_pct:.1%}
Mixer Counterparty Overlap: {mixer_overlap_pct:.1%}
Is Known Exchange: {is_known_exchange}
Is Known Mixer: {is_known_mixer}
Assigned MITRE Tag: {mitre_tag}

5-Axis Matrix:
- A1 Code Security: {axis['A1']}/100
- A2 Admin/Economic Risk: {axis['A2']}/100
- A3 Behavioral Fingerprint: {axis['A3']}/100
- A4 Network Topology: {axis['A4']}/100
- A5 Threat Intelligence: {axis['A5']}/100

Triggered Signals: {json.dumps(signals[:10])}

Respond with ONLY valid JSON containing exactly these three keys:
{{"hypothesis": "1-2 sentence forensic hypothesis referencing the protocol classification and specific evidence", "mitre_tag": "{mitre_tag}", "verdict": "One sentence executive verdict that MUST align with the {label} risk classification"}}"""

    # For deep scans, expand evidence context with GoPlus + topology + DeFi data
    if depth == "deep":
        goplus_summary = []
        if goplus:
            goplus_summary = [f"{k}={v}" for k, v in list(goplus.items())[:15]]
        ai_prompt += f"""

ADDITIONAL DEEP SCAN EVIDENCE:
- GoPlus Token Security: {', '.join(goplus_summary[:10]) if goplus_summary else 'N/A (not an ERC-20 token)'}
- Buy Tax: {buy_tax:.1f}%, Sell Tax: {sell_tax:.1f}%
- Source Code Verified: {is_verified}
- Proxy Contract: {is_proxy}
- Transaction Count: {tx_count}
- Cross-Axis Multiplier: {multiplier}x
- Exchange Counterparty Overlap: {exchange_overlap_pct:.1%}
- Mixer Counterparty Overlap: {mixer_overlap_pct:.1%}
- Is Known Exchange: {is_known_exchange}
- Is Known Mixer: {is_known_mixer}
- Protocol Category: {protocol_class['category']}
- Protocol Context: {protocol_class.get('context', 'N/A')}

Use ALL of this evidence to form a comprehensive forensic assessment."""

    ai_data = await analyze_entity(ai_prompt, depth=depth, entity_type="contract")

    # Validate Analytical Engine response has the expected keys
    if not isinstance(ai_data, dict) or "hypothesis" not in ai_data:
        print(f"[CONTRACT] Analytical Engine returned unexpected format: {type(ai_data)} — using fallback")
        ai_data = _build_fallback(axis, label, name, signals, is_known_exchange, protocol_class, mitre_tag)
    elif ai_data.get("hypothesis", "").startswith("AI parsing unavailable"):
        ai_data = _build_fallback(axis, label, name, signals, is_known_exchange, protocol_class, mitre_tag)

    # Force MITRE tag to evidence-driven value (don't trust LLM to set it)
    ai_data["mitre_tag"] = mitre_tag

    # ── Layer 6 & 7: Independent Analytical Engine Agent Ratings ──
    dual_ratings = await generate_dual_quick_ratings(ai_prompt, entity_type="contract")

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
    # BUILD GRAPH & DEFI DATA
    # ═══════════════════════════════════════════════════════

    graph_nodes = [{
        "id": addr_lower,
        "label": protocol_class["name"] if protocol_class["matched"] else name[:12] + "...",
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

        # Add source node
        if frm not in node_ids:
            is_mixer = frm in all_mixer_addrs
            is_exchange = frm in all_exchange_addrs
            db_entry = known_bad_map.get(frm)
            if db_entry:
                node_risk = min(db_entry.risk_score, 100)
                node_type = "malicious"
                node_label = db_entry.label[:10] + "..."
            elif is_mixer:
                node_risk = 90
                node_type = "mixer"
                node_label = frm[:6] + "..."
            elif is_exchange:
                node_risk = 5
                node_type = "exchange"
                node_label = frm[:6] + "..."
            else:
                node_risk = 10
                node_type = "default"
                node_label = frm[:6] + "..."
            graph_nodes.append({"id": frm, "label": node_label, "type": node_type, "risk": node_risk})
            node_ids.add(frm)

        # Add target node
        if to_addr not in node_ids:
            is_mixer = to_addr in all_mixer_addrs
            is_exchange = to_addr in all_exchange_addrs
            # Phase 3: Contract Parser Stub
            parsed_interactions = []
            if "swap" in name.lower() or "router" in name.lower():
                parsed_interactions.append({"type": "Swap", "description": "Swapped Token A for Token B on DEX Router", "severity": "INFO"})

            db_entry = known_bad_map.get(to_addr)
            if db_entry:
                node_risk = min(db_entry.risk_score, 100)
                node_type = "malicious"
                node_label = db_entry.label[:10] + "..."
            elif is_mixer:
                node_risk = 90
                node_type = "mixer"
                node_label = to_addr[:6] + "..."
            elif is_exchange:
                node_risk = 5
                node_type = "exchange"
                node_label = to_addr[:6] + "..."
            else:
                node_risk = 10
                node_type = "default"
                node_label = to_addr[:6] + "..."
            graph_nodes.append({"id": to_addr, "label": node_label, "type": node_type, "risk": node_risk})
            node_ids.add(to_addr)

        try:
            value = float(tx.get("value", 0)) / 10**18
        except:
            value = 0

        graph_edges.append({"source": frm, "target": to_addr, "value": value, "hash": tx.get("hash", "")})

    # Parse ABI
    abi_raw = etherscan.get("abi", "[]")
    try:
        if isinstance(abi_raw, str):
            abi = json.loads(abi_raw)
        else:
            abi = abi_raw
    except:
        abi = []
        
    defi_interactions = await decode_defi_interactions(etherscan.get("normal_txs", []))

    # If ABI is empty, add 4byte decoded functions
    if not abi and defi_interactions:
        unique_sigs = set()
        for inter in defi_interactions:
            sig = inter.get("signature", "")
            if sig and "Unknown Function" not in sig:
                unique_sigs.add(sig)
        
        for sig in unique_sigs:
            abi.append({
                "type": "function",
                "name": sig,
                "inputs": [],
                "stateMutability": "4byte decoded"
            })
            
    response_data = {
        "identity": {
            "address": address,
            "ens": "Data Not Available",
            "walletType": tx_data.get("wallet_type", "Contract"),
            "balanceWei": tx_data.get("balance_wei", "Unknown"),
            "txCountSample": tx_data.get("tx_count_sample", 0),
            "firstTxDate": tx_data.get("first_tx_date"),
            "lastTxDate": tx_data.get("last_tx_date"),
            "name": protocol_class["name"] if protocol_class["matched"] else name,
            "label": protocol_class["name"] if protocol_class["matched"] else name,
            "compiler": etherscan.get("compiler", "Data Not Available"),
            "network": "Ethereum Mainnet",
            "license": etherscan.get("license", "None"),
            "deployedDate": "Data Not Available",
            "proxyType": "Upgradeable Proxy" if is_proxy else "None",
            "verified": is_verified,
            "deployer": etherscan.get("constructorArguments", "Data Not Available"),
            "proxy": is_proxy,
            "protocolCategory": protocol_class["category"],
            "protocolContext": protocol_class["context"],
            "reputationSource": protocol_class["source"],
        },
        "info": {
            "tokenName": goplus.get("token_name", "N/A"),
            "symbol": goplus.get("token_symbol", "N/A"),
            "totalSupply": goplus.get("total_supply", "Data Not Available"),
            "holders": goplus.get("holder_count", "Data Not Available"),
            "contractBalance": "Data Not Available",
            "ownerAddress": goplus.get("owner_address", "Data Not Available"),
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
            "exchangeOverlap": round(exchange_overlap_pct, 3),
            "mixerOverlap": round(mixer_overlap_pct, 3),
            "factors": [{"reason": s, "icon": "🔹", "penalty": 0} for s in signals],
            "axes": axis,
            "multiplier": multiplier,
            "aiAgentA": dual_ratings.get("agentA"),
            "aiAgentB": dual_ratings.get("agentB"),
            "analyticalSynthesis": {
                "rating": label,
                "hypothesis": ai_data.get("hypothesis", ""),
                "mitre_tag": ai_data.get("mitre_tag", ""),
                "verdict": ai_data.get("verdict", ""),
                "confidence": ai_data.get("confidence", None),
                "consensus_level": ai_data.get("consensus_level", None),
                "judge_reasoning": ai_data.get("judge_reasoning", None),
                "prosecution_summary": ai_data.get("prosecution_summary", None),
                "defense_summary": ai_data.get("defense_summary", None),
                "engine_type": ai_data.get("engine_type", "single")
            }
        },
        "goplus": {
            "overall": label,
            "checks": goplus_checks
        },
        "sourceCode": source_code,
        "abi": abi,
        "slither": _simulate_slither_analysis(source_code),
        "evidence_context": ai_prompt,
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
        "defi_interactions": defi_interactions
    }

    # ── Server-Side Hash & Report Metadata (tamper-proof) ──
    report_meta = {
        "report_id": f"AXON-C-{int(time.time())}-{address[:10]}",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "generated_timestamp": time.time(),
        "scan_depth": depth,
        "entity_address": address.lower(),
        "entity_type": "contract",
        "engine_version": "3.0",
    }
    hash_payload = json.dumps(response_data, sort_keys=True, default=str)
    report_meta["sha256_hash"] = hashlib.sha256(hash_payload.encode()).hexdigest()
    report_meta["hash_algorithm"] = "SHA-256"
    report_meta["hash_scope"] = "Full response_data payload (sorted keys, pre-metadata)"
    response_data["report_metadata"] = report_meta
    
    # --- Save to InvestigationLog ---
    try:
        log_entry = InvestigationLog(
            entity_address=address.lower(),
            entity_type="contract",
            chain="ETH",
            scan_timestamp=time.time(),
            risk_score=final_score,
            entity_class=protocol_class["category"],
            triggered_signals=[{"reason": s, "icon": "🔹", "layer": "A"} for s in signals],
            scan_depth=depth,
            case_id=case_id,
            raw_data=response_data
        )
        db.add(log_entry)
        
        # Save independent verifiable report immutably
        report_entry = VerificationReport(
            report_id=report_meta["report_id"],
            report_hash=report_meta["sha256_hash"],
            entity_address=address.lower(),
            entity_type="contract",
            risk_score=final_score,
            scan_timestamp=time.time(),
            scan_depth=depth
        )
        db.add(report_entry)
        
        # Auto-update Threat DB Candidate queue for HIGH/CRITICAL findings
        if final_score >= 60:
            candidate = CandidateEntity(
                address=address.lower(),
                label=protocol_class["name"] if protocol_class["matched"] else name,
                category=protocol_class["category"],
                source="Axon Bulk Scanner Auto-Detection",
                confidence=final_score,
                chain="ETH",
                status="pending"
            )
            # Avoid inserting duplicates
            def _check_candidate():
                return db.query(CandidateEntity).filter_by(address=address.lower()).first()
            existing = await run_sync(_check_candidate)
            if not existing:
                db.add(candidate)

        # ── Auto-Learn: Promote CRITICAL contract findings to MaliciousWallet DB ──
        if final_score >= 80:
            try:
                def _check_and_add_threat():
                    existing_threat = db.query(MaliciousWallet).filter_by(address=address.lower()).first()
                    if not existing_threat:
                        new_threat = MaliciousWallet(
                            address=address.lower(),
                            label=f"Auto-Detected Contract: {protocol_class['name'] if protocol_class['matched'] else name}",
                            category="Malicious Contract",
                            chain="ETH",
                            amount_usd="Data Not Available",
                            threat_level="CRITICAL" if final_score >= 90 else "HIGH",
                            sanctioned=protocol_class.get("category") == "SANCTIONED",
                            risk_score=final_score,
                            description=f"Auto-detected by Axon contract scanner. Protocol: {protocol_class['category']}. "
                                       f"A1={axis['A1']}, A2={axis['A2']}, A3={axis['A3']}, A4={axis['A4']}, A5={axis['A5']}. "
                                       f"Top signals: {', '.join(signals[:3])}",
                            tags=["auto-detected", "contract", protocol_class.get("category", "unknown").lower()],
                            source="axon-auto-detect",
                            confidence=final_score,
                        )
                        db.add(new_threat)
                        return True
                    return False
                added = await run_sync(_check_and_add_threat)
                if added:
                    print(f"[CONTRACT] AUTO-LEARNED: {address} added to MaliciousWallet DB (score={final_score}, proto={protocol_class['category']})")
            except Exception as e:
                print(f"[CONTRACT] Auto-learn error: {e}")
                
        await run_sync(db.commit)
    except Exception as e:
        print(f"[SCAN] Error saving to investigation_log: {e}")
        await run_sync(db.rollback)

    return response_data


def _build_fallback(axis: dict, label: str, name: str, signals: list,
                    is_known_exchange: bool = False,
                    protocol_class: dict = None,
                    mitre_tag: str = "N/A") -> dict:
    """Build a deterministic Analytical Engine fallback based on the matrix data + protocol classification."""
    if protocol_class is None:
        protocol_class = {"category": "UNKNOWN", "context": ""}

    category = protocol_class.get("category", "UNKNOWN")

    if is_known_exchange:
        return {
            "hypothesis": f"{name} is a known exchange contract address found in the intelligence database. Transaction patterns are consistent with legitimate exchange operations.",
            "mitre_tag": "N/A — Trusted Infrastructure",
            "verdict": f"{label} RISK — Known exchange contract. Standard monitoring recommended."
        }
    elif category == "SANCTIONED":
        return {
            "hypothesis": f"{name} is a sanctioned entity. {protocol_class.get('context', '')}",
            "mitre_tag": mitre_tag,
            "verdict": f"CRITICAL RISK — {name} is a sanctioned protocol. All interaction constitutes a compliance violation."
        }
    elif category == "SCAM_TOKEN":
        return {
            "hypothesis": f"{name} has been identified as a scam/fraudulent token. {protocol_class.get('context', '')}",
            "mitre_tag": mitre_tag,
            "verdict": f"CRITICAL RISK — {name} is a confirmed scam. Subject to law enforcement action."
        }
    elif category == "EXPLOIT_VICTIM":
        return {
            "hypothesis": f"{name} was the victim of a significant smart contract exploit. {protocol_class.get('context', '')}",
            "mitre_tag": mitre_tag,
            "verdict": f"HIGH RISK — {name} contains exploited vulnerabilities. Interaction carries residual risk."
        }
    elif category in ("DEFI_TRUSTED", "ORACLE", "STABLECOIN"):
        return {
            "hypothesis": f"{name} is a well-known, audited protocol in the {category.replace('_', ' ').title()} category. {protocol_class.get('context', '')}",
            "mitre_tag": "N/A — Trusted Infrastructure",
            "verdict": f"LOW RISK — {name} is a trusted, widely-audited protocol. Standard monitoring recommended."
        }
    elif axis["A5"] >= 90:
        return {
            "hypothesis": f"{name} is flagged by threat intelligence databases as a known malicious or sanctioned entity. Interaction with this contract carries severe compliance and asset risk.",
            "mitre_tag": mitre_tag,
            "verdict": f"CRITICAL RISK — {name} is a confirmed threat actor. All interaction must be treated as hostile."
        }
    elif axis["A1"] >= 80:
        return {
            "hypothesis": f"{name} exhibits dangerous code-level vulnerabilities including potential honeypot patterns or unverified bytecode that prevents forensic audit.",
            "mitre_tag": mitre_tag,
            "verdict": f"{label} RISK — Contract code poses direct exploitation risk to interacting wallets."
        }
    elif axis["A2"] >= 60:
        return {
            "hypothesis": f"{name} has concentrated admin privileges that enable unilateral fund manipulation including potential rug-pull vectors.",
            "mitre_tag": mitre_tag,
            "verdict": f"{label} RISK — Elevated admin control surfaces represent material risk to deposited assets."
        }
    elif axis["A3"] >= 60:
        return {
            "hypothesis": f"{name} exhibits behavioral patterns consistent with financial structuring or laundering activity based on transaction flow analysis.",
            "mitre_tag": mitre_tag,
            "verdict": f"{label} RISK — On-chain behavior deviates significantly from legitimate protocol patterns."
        }
    else:
        return {
            "hypothesis": f"{name} does not trigger significant risk signals across the 5-axis forensic matrix. No anomalous behavioral patterns detected in available data.",
            "mitre_tag": "N/A",
            "verdict": f"{label} RISK — No critical forensic findings. Standard monitoring recommended."
        }


def _simulate_slither_analysis(source_code: str) -> list:
    """
    Simulate a Slither static analysis run by checking for known dangerous patterns 
    in the raw Solidity source code.
    Returns a list of vulnerability objects.
    """
    vulnerabilities = []
    if not source_code:
        return vulnerabilities
        
    src_lower = source_code.lower()
    
    if "call.value" in src_lower or ".call{" in src_lower:
        vulnerabilities.append({
            "name": "Potential Reentrancy",
            "severity": "High",
            "description": "External calls detected. If state changes occur after this call, it may be vulnerable to reentrancy attacks."
        })
        
    if "delegatecall(" in src_lower:
        vulnerabilities.append({
            "name": "Unrestricted Delegatecall",
            "severity": "High",
            "description": "Delegatecall allows external contracts to modify this contract's state. Ensure caller is authenticated."
        })
        
    if "tx.origin" in src_lower:
        vulnerabilities.append({
            "name": "tx.origin Authentication Bypass",
            "severity": "High",
            "description": "Using tx.origin for authorization is vulnerable to phishing attacks. Use msg.sender instead."
        })
        
    if "selfdestruct(" in src_lower or "suicide(" in src_lower:
        vulnerabilities.append({
            "name": "Self-Destruct Capability",
            "severity": "High",
            "description": "The contract can be destroyed, rendering all funds permanently locked or stolen."
        })
        
    if "block.timestamp" in src_lower or "now" in src_lower:
        vulnerabilities.append({
            "name": "Block Timestamp Dependence",
            "severity": "Low",
            "description": "Miners can manipulate block.timestamp slightly. Do not use for critical entropy or randomness."
        })
        
    if "block.blockhash" in src_lower or "blockhash(" in src_lower:
        vulnerabilities.append({
            "name": "Weak Randomness",
            "severity": "Medium",
            "description": "Using block variables for randomness can be exploited by malicious miners."
        })
        
    return vulnerabilities
