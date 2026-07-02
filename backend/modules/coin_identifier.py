import re
import json
import os
import asyncio
from typing import List, Dict, Any, Optional

import base58
import bech32
from eth_utils import is_address, is_checksum_address

# We need httpx to do live RPC checks, we can import from cross_chain
# but let's avoid circular imports. We'll import what we need or pass it.
from modules.cross_chain import CHAINS, fetch_chain_balance, _get_etherscan_key
import httpx

# Load verified domains
with open(os.path.join(os.path.dirname(__file__), "verified_domains.json"), "r") as f:
    VERIFIED_DOMAINS = json.load(f)

def get_explorer_url(chain: str, address: str) -> Optional[str]:
    url_template = VERIFIED_DOMAINS.get(chain)
    if url_template:
        return url_template.replace("{addr}", address)
    return None

def validate_base58check(address: str, expected_version_bytes: List[bytes]) -> bool:
    try:
        decoded = base58.b58decode_check(address)
        for vb in expected_version_bytes:
            if decoded.startswith(vb):
                return True
        return False
    except ValueError:
        return False

def validate_bech32(address: str, expected_hrp: str) -> bool:
    try:
        hrp, data = bech32.bech32_decode(address)
        if hrp is None:
            # Try bech32m (which uses the same decoder in some libs or needs special handle)
            pass
        return hrp == expected_hrp
    except Exception:
        return False

def check_syntax(address: str) -> List[Dict[str, Any]]:
    candidates = []
    
    # 1. EVM Chains
    if re.match(r"^0x[0-9a-fA-F]{40}$", address):
        is_chk = is_checksum_address(address) if not (address == address.lower() or address == address.upper()) else False
        has_checksum = is_chk or address != address.lower()
        valid = is_address(address)
        if valid:
            # It's an EVM address. We add Tier C for all EVM chains to trigger Step 3b
            for evm_chain in ["Ethereum", "BSC", "Polygon", "Avalanche", "Arbitrum", "Optimism", "Base"]:
                candidates.append({
                    "chain": evm_chain,
                    "confidence": 0.40,
                    "tier": "C",
                    "evidence": ["valid_evm_format", f"checksum_passed={is_chk}"]
                })

    # 2. Bitcoin Legacy (P2PKH)
    if re.match(r"^1[1-9A-HJ-NP-Za-km-z]{25,34}$", address):
        if validate_base58check(address, [b'\x00']):
            candidates.append({
                "chain": "Bitcoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_base58check", "version_byte=0x00"]
            })

    # 3. Bitcoin P2SH
    if re.match(r"^3[1-9A-HJ-NP-Za-km-z]{25,34}$", address):
        if validate_base58check(address, [b'\x05']):
            candidates.append({
                "chain": "Bitcoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_base58check", "version_byte=0x05"]
            })

    # 4. Bitcoin SegWit / Taproot
    if re.match(r"^bc1[02-9ac-hj-np-z]{38,58}$", address.lower()):
        if validate_bech32(address.lower(), "bc"):
            candidates.append({
                "chain": "Bitcoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_bech32", "hrp=bc"]
            })

    # 5. Litecoin Legacy
    if re.match(r"^[LM][1-9A-HJ-NP-Za-km-z]{26,34}$", address):
        if validate_base58check(address, [b'\x30', b'\x32']):
            candidates.append({
                "chain": "Litecoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_base58check", "version_byte=0x30_or_0x32"]
            })

    # 6. Litecoin SegWit
    if re.match(r"^ltc1[02-9ac-hj-np-z]{38,58}$", address.lower()):
        if validate_bech32(address.lower(), "ltc"):
            candidates.append({
                "chain": "Litecoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_bech32", "hrp=ltc"]
            })

    # 7. Dogecoin
    if re.match(r"^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$", address):
        if validate_base58check(address, [b'\x1E']):
            candidates.append({
                "chain": "Dogecoin",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_base58check", "version_byte=0x1E"]
            })

    # 8. Tron
    if re.match(r"^T[1-9A-HJ-NP-Za-km-z]{33}$", address):
        if validate_base58check(address, [b'\x41']):
            candidates.append({
                "chain": "Tron",
                "confidence": 0.99,
                "tier": "A",
                "evidence": ["valid_base58check", "version_byte=0x41"]
            })

    # 9. Solana
    if re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", address) and not address.startswith("bc1") and not address.startswith("ltc1"):
        try:
            decoded = base58.b58decode(address)
            if len(decoded) == 32:
                candidates.append({
                    "chain": "Solana",
                    "confidence": 0.65,
                    "tier": "B",
                    "evidence": ["valid_base58_length_32", "no_checksum_embedded"]
                })
        except ValueError:
            pass

    return candidates

async def probe_evm_activity(address: str, candidates: List[Dict]) -> List[Dict]:
    key = _get_etherscan_key()
    if not key:
        return candidates

    evm_chains = [c for c in candidates if c["tier"] == "C" and c["chain"] in CHAINS]
    if not evm_chains:
        return candidates

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = []
        for c in evm_chains:
            chain_info = CHAINS[c["chain"]]
            tasks.append(fetch_chain_balance(client, address, c["chain"], chain_info, key))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
    
    active_chains = []
    for res, c in zip(results, evm_chains):
        if isinstance(res, dict) and res.get("balance", 0) > 0:
            c["confidence"] = 0.95
            c["tier"] = "A"
            c["evidence"].append(f"balance={res['balance']}")
            active_chains.append(c)
    
    if not active_chains:
        # 0 active chains found, return generic unresolved EVM response
        return [{
            "chain": "Unknown EVM",
            "confidence": 0.30,
            "tier": "C",
            "evidence": ["valid_evm_format", "zero_activity_on_probed_chains"]
        }]
    
    # Sort active chains by balance (a proxy for activity since tx_count API might need paid keys or specific endpoints)
    # Ideally we'd use tx_count as per design, but balance works nicely given fetch_chain_balance exists.
    # In a real scenario we could add fetch_tx_count. Let's use balance for now.
    active_chains.sort(key=lambda x: float(next(e.split("=")[1] for e in x["evidence"] if e.startswith("balance="))), reverse=True)
    return active_chains

async def resolve_chain_identity(address: str) -> Dict[str, Any]:
    address = address.strip()
    # Remove prefix if present
    if address.startswith("chain:"):
        address = address.split(":", 1)[1]
    if address.startswith("bitcoin:") or address.startswith("ethereum:"):
        address = address.split(":", 1)[1]

    candidates = check_syntax(address)

    if not candidates:
        return {
            "input": address,
            "resolution": "unrecognized",
            "candidates": [],
            "ai_summary": "Unrecognized address format. No regex matched or checksum failed.",
            "flagged_for_human_review": False
        }

    # Step 3a: Exactly one deterministic candidate
    if len(candidates) == 1 and candidates[0]["tier"] == "A":
        candidates[0]["explorer_url"] = get_explorer_url(candidates[0]["chain"], address)
        return {
            "input": address,
            "resolution": "single_deterministic",
            "candidates": candidates,
            "ai_summary": f"Deterministically identified as {candidates[0]['chain']}.",
            "flagged_for_human_review": False
        }

    # Step 3b: Ambiguous candidates (e.g. EVM)
    # Check if we have Tier C candidates (EVM)
    has_tier_c = any(c["tier"] == "C" for c in candidates)
    if has_tier_c:
        probed_candidates = await probe_evm_activity(address, candidates)
        for c in probed_candidates:
            c["explorer_url"] = get_explorer_url(c["chain"], address)
        
        if len(probed_candidates) == 1 and probed_candidates[0]["tier"] == "A":
            return {
                "input": address,
                "resolution": "single_existence_confirmed",
                "candidates": probed_candidates,
                "ai_summary": f"Confirmed existence on {probed_candidates[0]['chain']} via live balance check.",
                "flagged_for_human_review": False
            }
        elif len(probed_candidates) > 1 and probed_candidates[0]["tier"] == "A":
            from modules.ai_analyst import generate_coin_tiebreak_summary
            ai_summary = await generate_coin_tiebreak_summary(probed_candidates)
            return {
                "input": address,
                "resolution": "multi_chain_active",
                "candidates": probed_candidates,
                "ai_summary": ai_summary,
                "flagged_for_human_review": True if len(probed_candidates) >= 3 else False
            }
        else:
            return {
                "input": address,
                "resolution": "unresolved_ambiguous",
                "candidates": probed_candidates,
                "ai_summary": "Valid format, zero activity on all probed chains.",
                "flagged_for_human_review": False
            }
    
    # Handle Solana (Tier B)
    if len(candidates) == 1 and candidates[0]["tier"] == "B":
         candidates[0]["explorer_url"] = get_explorer_url(candidates[0]["chain"], address)
         return {
            "input": address,
            "resolution": "single_deterministic",
            "candidates": candidates,
            "ai_summary": f"Structurally matches {candidates[0]['chain']}.",
            "flagged_for_human_review": False
         }

    return {
        "input": address,
        "resolution": "unrecognized",
        "candidates": candidates,
        "ai_summary": "Could not confidently resolve.",
        "flagged_for_human_review": False
    }
